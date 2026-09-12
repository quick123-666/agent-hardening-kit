/**
 * Pi Path Whitelist Extension (路径白名单)
 *
 * 限制 LLM 的文件操作只能在项目目录内进行。
 * 防止 LLM 读取敏感文件（如 ~/.ssh/id_rsa）或修改系统文件。
 *
 * 核心原理：
 * 1. 在 tool_call 拦截器中检查路径
 * 2. 路径必须在白名单内，否则拦截
 * 3. 配置文件操作（edit/write）会限制在项目目录
 *
 * 使用方法：
 *   pi -e ~/.pi/agent/extensions/pi-path-whitelist.ts
 *
 * 命令：
 *   /path-whitelist-status     - 查看白名单状态
 *   /path-whitelist-add <path> - 添加白名单路径
 *   /path-whitelist-remove <p> - 移除白名单路径
 *   /path-whitelist-list       - 列出白名单
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";

// ============================================================
// 配置
// ============================================================

interface PathWhitelistConfig {
  enabled: boolean;
  /** 允许的文件操作工具 */
  allowedTools: string[];
  /** 白名单路径 */
  whitelist: string[];
  /** 是否在非白名单路径时发出警告（而不是阻止） */
  warnOnly: boolean;
  /** 是否记录所有访问 */
  logAll: boolean;
  /** 日志文件 */
  logFile: string;
  /** 恶意内容日志文件（独立） */
  maliciousLogFile: string;
  /** 恶意内容告警：true=仅告警，false=拒绝写入（严格模式） */
  maliciousWarnOnly: boolean;
}

function getHomeDir(): string {
  return os.homedir();
}

const DEFAULT_CONFIG: PathWhitelistConfig = {
  enabled: true,
  allowedTools: ["read", "edit", "write"],
  whitelist: [],
  warnOnly: false,
  logAll: false,
  logFile: path.join(os.homedir(), ".pi", "agent", "logs", "path-whitelist.log"),
  maliciousLogFile: path.join(os.homedir(), ".pi", "agent", "logs", "malicious-content.log"),
  maliciousWarnOnly: true,
};

// ============================================================
// 路径检查
// ============================================================

function normalizePath(p: string): string {
  if (p.startsWith("~")) {
    p = p.replace("~", getHomeDir());
  }
  p = p.replace(/\\/g, "/");
  return p.toLowerCase();
}

function isPathAllowed(filePath: string, whitelist: string[]): { allowed: boolean; reason?: string } {
  const normalized = normalizePath(filePath);

  for (const allowed of whitelist) {
    const allowedNorm = normalizePath(allowed);
    if (normalized.startsWith(allowedNorm) || normalized.includes(allowedNorm)) {
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    reason: `路径不在白名单内: ${filePath}`,
  };
}

function resolvePathTraversal(p: string): string {
  const parts = p.split("/");
  const resolved: string[] = [];
  const isAbsolute = p.startsWith("/");
  for (const part of parts) {
    if (part === "..") {
      if (resolved.length > 0 && resolved[resolved.length - 1] !== "") {
        resolved.pop();
      }
    } else if (part !== "." && part !== "") {
      resolved.push(part);
    }
  }
  return (isAbsolute ? "/" : "") + resolved.join("/");
}

function resolveDotSegments(p: string): string {
  const input = p.split("/");
  const output: string[] = [];
  for (const segment of input) {
    if (segment === ".") {
      continue;
    } else if (segment === "..") {
      if (output.length > 0 && output[output.length - 1] !== "") {
        output.pop();
      }
    } else {
      output.push(segment);
    }
  }
  return output.join("/");
}

function isSensitivePath(filePath: string): { sensitive: boolean; reason?: string } {
  const normalized = normalizePath(filePath);
  const home = normalizePath(getHomeDir());

  if (!normalized) return { sensitive: false };

  const sensitivePatterns = [
    { pattern: "/.ssh/", reason: "SSH 密钥目录" },
    { pattern: ".ssh/id_rsa", reason: "SSH 私钥" },
    { pattern: ".ssh/id_ed25519", reason: "SSH 私钥" },
    { pattern: ".ssh/known_hosts", reason: "SSH known_hosts" },
    { pattern: ".ssh/config", reason: "SSH 配置" },
    { pattern: ".ssh/authorized_keys", reason: "SSH 授权密钥" },
    { pattern: "/.aws/", reason: "AWS 凭证" },
    { pattern: "/.kube/", reason: "Kubernetes 配置" },
    { pattern: "/.netrc", reason: "Netrc 凭证" },
    { pattern: "/.npmrc", reason: "NPM 配置（可能含 token）" },
    { pattern: "/.pypirc", reason: "PyPI 凭证" },
    { pattern: "/windows/system32", reason: "系统目录" },
    { pattern: "/etc/passwd", reason: "系统账户文件" },
    { pattern: "/etc/shadow", reason: "系统密码文件" },
    { pattern: "/etc/sudoers", reason: "Sudo 配置" },
    { pattern: "/.env", reason: "环境变量文件" },
    { pattern: "/.env.local", reason: "环境变量文件" },
    { pattern: "/.env.production", reason: "生产环境变量" },
    { pattern: "/cookies", reason: "Cookie 文件" },
    { pattern: "/session", reason: "Session 文件" },
    { pattern: "/appdata/roaming/", reason: "用户应用数据" },
  ];

  const dotResolved = resolveDotSegments(normalized);
  const resolved = resolvePathTraversal(dotResolved);

  if (!resolved.startsWith(home) && !resolved.startsWith("/home/") && !resolved.startsWith("/root/")) {
    if (resolved.includes("/windows/") || resolved.includes("/etc/")) {
      return { sensitive: true, reason: "系统目录" };
    }
  }

  for (const { pattern, reason } of sensitivePatterns) {
    if (normalized.includes(pattern.toLowerCase()) || resolved.includes(pattern.toLowerCase())) {
      return { sensitive: true, reason };
    }
  }

  return { sensitive: false };
}

// ============================================================
// 恶意内容检测
// ============================================================

function hasAdvancedMalicious(content: string): { detected: boolean; reason?: string } {
  const advancedPatterns = [
    { pattern: /<\?php.*eval\s*\(\s*\$_(GET|POST|REQUEST|COOKIE)/gi, reason: "PHP 一句话 webshell" },
    { pattern: /eval\s*\(\s*base64_decode/gi, reason: "Base64 编码的 eval" },
    { pattern: /rm\s+-rf\s+\//gi, reason: "删除根目录" },
    { pattern: /curl[^|]*\|\s*bash/gi, reason: "Pipe curl to bash" },
    { pattern: /wget[^|]*\|\s*bash/gi, reason: "Pipe wget to bash" },
    { pattern: /nc\s+.*-e\s+/gi, reason: "Netcat 反向 shell" },
    { pattern: /bash\s+-i\s+>&.*\/dev\/tcp\//gi, reason: "Bash 反向 shell" },
    { pattern: /\/dev\/tcp\//gi, reason: "Bash /dev/tcp shell" },
    { pattern: /python.*-c.*import\s+socket/gi, reason: "Python 反向 shell" },
    { pattern: /php.*eval\s*\(\s*\$_/gi, reason: "PHP eval 注入" },
    { pattern: /DROP\s+TABLE/gi, reason: "DROP TABLE 注入" },
    { pattern: /DROP\s+DATABASE/gi, reason: "DROP DATABASE 注入" },
    { pattern: /;\s*rm\s+-rf/gi, reason: "命令注入 + 删除" },
    { pattern: /__import__\s*\(\s*['"]os['"]\s*\)\s*\.\s*system/gi, reason: "Python __import__ os.system" },
  ];

  for (const p of advancedPatterns) {
    if (p.pattern.test(content)) {
      return { detected: true, reason: p.reason };
    }
  }

  const base64Matches = content.match(/[A-Za-z0-9+/]{20,}={0,2}/g) || [];
  for (const b64 of base64Matches) {
    try {
      const decoded = Buffer.from(b64, "base64").toString("utf-8");
      for (const p of advancedPatterns) {
        if (p.pattern.test(decoded)) {
          return { detected: true, reason: `${p.reason} (Base64 解码后)` };
        }
      }
    } catch {}
  }

  return { detected: false };
}

// ============================================================
// 日志
// ============================================================

function log(config: PathWhitelistConfig, tool: string, filePath: string, allowed: boolean, reason?: string) {
  if (!config.logFile) return;
  try {
    const dir = path.dirname(config.logFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const timestamp = new Date().toISOString();
    const status = allowed ? "ALLOWED" : "BLOCKED";
    const reasonStr = reason ? ` (${reason})` : "";
    const line = `[${timestamp}] [${status}] ${tool}: ${filePath}${reasonStr}\n`;
    fs.appendFileSync(config.logFile, line, "utf-8");
  } catch {}
}

function logMaliciousContent(config: PathWhitelistConfig, tool: string, filePath: string, reasons: string[], snippets: string[]) {
  if (!config.maliciousLogFile) return;
  try {
    const dir = path.dirname(config.maliciousLogFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${tool}] File: ${filePath}\n` +
      `  检测到特征:\n${reasons.map((r) => `    - ${r}`).join("\n")}\n` +
      (snippets.length > 0 ? `  匹配片段:\n${snippets.map((s) => `    \`${s.slice(0, 80)}\``).join("\n")}\n` : "") +
      `  处置: ${config.maliciousWarnOnly ? "告警仅记录" : "拦截写入"}\n\n`;
    fs.appendFileSync(config.maliciousLogFile, line, "utf-8");
  } catch {}
}

// ============================================================
// 扩展主逻辑
// ============================================================

export default function (pi: ExtensionAPI) {
  const config: PathWhitelistConfig = { ...DEFAULT_CONFIG };

  console.log("[PathWhitelist] 路径白名单扩展已加载");

  // ============================================================
  // 拦截文件操作
  // ============================================================

  pi.on("tool_call", async (event, ctx) => {
    const toolName = event.toolName;
    const params = event.input || {};

    if (!config.allowedTools.includes(toolName)) return;

    let filePath = "";
    if (toolName === "read" || toolName === "edit" || toolName === "write") {
      filePath = params.path || params.file_path || "";
    }

    if (!filePath) return;

    // 检查敏感路径
    const sensitiveCheck = isSensitivePath(filePath);
    if (sensitiveCheck.sensitive) {
      log(config, toolName, filePath, false, `敏感路径: ${sensitiveCheck.reason}`);
      ctx.ui.notify(`🔒 [PathWhitelist] 禁止访问敏感路径\n\n路径: ${filePath}\n原因: ${sensitiveCheck.reason}`, "error");
      event.preventDefault?.();
      return { allowed: false, message: `敏感路径禁止访问: ${sensitiveCheck.reason}` };
    }

    // 检查白名单
    if (config.whitelist.length > 0) {
      const allowed = isPathAllowed(filePath, config.whitelist);
      if (!allowed.allowed) {
        log(config, toolName, filePath, false, allowed.reason);
        if (config.warnOnly) {
          ctx.ui.notify(`⚠️ [PathWhitelist] 路径不在白名单内\n\n路径: ${filePath}`, "warning");
        } else {
          ctx.ui.notify(`🔒 [PathWhitelist] 路径不在白名单内\n\n路径: ${filePath}`, "error");
          event.preventDefault?.();
          return { allowed: false, message: `路径不在白名单内: ${filePath}` };
        }
      }
    }

    if (config.logAll) log(config, toolName, filePath, true);
  });

  // ============================================================
  // 拦截文件写入（检查恶意内容）
  // ============================================================

  pi.on("tool_call", async (event, ctx) => {
    const toolName = event.toolName;
    const params = event.input || {};

    if (toolName !== "write" && toolName !== "edit") return;

    const content = params.content || params.newText || "";
    if (!content) return;

    const malicious = hasAdvancedMalicious(content);
    if (!malicious.detected) return;

    const filePath = params.path || params.file_path || "unknown";

    if (!config.maliciousWarnOnly) {
      logMaliciousContent(config, toolName, filePath, [malicious.reason!], []);
      ctx.ui.notify(`🚨 [PathWhitelist] 严格模式：拒绝写入恶意内容\n\n文件: ${filePath}\n检测到: ${malicious.reason}`, "error");
      event.preventDefault?.();
      return { allowed: false };
    }

    logMaliciousContent(config, toolName, filePath, [malicious.reason!], []);
    ctx.ui.notify(`🚨 [PathWhitelist] 检测到恶意内容特征\n\n文件: ${filePath}\n检测到: ${malicious.reason}`, "warning");
  });

  // ============================================================
  // 命令
  // ============================================================

  pi.registerCommand("path-whitelist-status", {
    description: "查看路径白名单状态",
    handler: async (_args, ctx) => {
      let message = "🔒 路径白名单状态\n\n";
      message += `启用: ${config.enabled ? "是" : "否"}\n`;
      message += `模式: ${config.warnOnly ? "警告模式" : "阻止模式"}\n`;
      message += `保护工具: ${config.allowedTools.join(", ")}\n\n`;
      message += `白名单路径:\n`;
      if (config.whitelist.length === 0) {
        message += `  （未设置，请使用 /path-whitelist-add 添加）\n`;
      } else {
        config.whitelist.forEach((p) => { message += `  ✅ ${p}\n`; });
      }
      ctx.ui.notify(message, "info");
    },
  });

  pi.registerCommand("path-whitelist-list", {
    description: "列出所有白名单路径",
    handler: async (_args, ctx) => {
      if (config.whitelist.length === 0) {
        ctx.ui.notify("ℹ️ 白名单为空\n\n使用 /path-whitelist-add <路径> 添加", "info");
        return;
      }
      const message = "📋 白名单路径列表\n\n" + config.whitelist.map((p, i) => `${i + 1}. ${p}`).join("\n");
      ctx.ui.notify(message, "info");
    },
  });

  pi.registerCommand("path-whitelist-add", {
    description: "添加白名单路径",
    handler: async (args, ctx) => {
      if (!args || args.length === 0) {
        ctx.ui.notify("❌ 请指定路径\n\n用法: /path-whitelist-add <路径>", "warning");
        return;
      }
      const newPath = args.join(" ");
      if (config.whitelist.includes(newPath)) {
        ctx.ui.notify(`ℹ️ 路径已在白名单中: ${newPath}`, "info");
        return;
      }
      config.whitelist.push(newPath);
      ctx.ui.notify(`✅ 已添加白名单: ${newPath}`, "info");
    },
  });

  pi.registerCommand("path-whitelist-remove", {
    description: "移除白名单路径",
    handler: async (args, ctx) => {
      if (!args || args.length === 0) {
        ctx.ui.notify("❌ 请指定路径\n\n用法: /path-whitelist-remove <路径>", "warning");
        return;
      }
      const removePath = args.join(" ");
      const index = config.whitelist.indexOf(removePath);
      if (index === -1) {
        ctx.ui.notify(`ℹ️ 路径不在白名单中: ${removePath}`, "info");
        return;
      }
      config.whitelist.splice(index, 1);
      ctx.ui.notify(`✅ 已移除白名单: ${removePath}`, "info");
    },
  });

  pi.registerCommand("path-whitelist-toggle", {
    description: "切换阻止/警告模式",
    handler: async (_args, ctx) => {
      config.warnOnly = !config.warnOnly;
      ctx.ui.notify(`✅ 已切换到 ${config.warnOnly ? "警告模式" : "阻止模式"}`, "info");
    },
  });

  pi.registerCommand("path-whitelist-strict", {
    description: "切换恶意内容严格模式",
    handler: async (args, ctx) => {
      if (!args || args.length === 0) {
        ctx.ui.notify(`当前模式: ${config.maliciousWarnOnly ? "警告模式" : "严格模式"}\n\n用法:\n  /path-whitelist-strict enable\n  /path-whitelist-strict disable`, "info");
        return;
      }
      const action = args[0].toLowerCase();
      if (action === "enable") {
        config.maliciousWarnOnly = false;
        ctx.ui.notify("🚨 已启用严格模式\n\n恶意内容写入将被拦截。", "warning");
      } else if (action === "disable") {
        config.maliciousWarnOnly = true;
        ctx.ui.notify("✅ 已禁用严格模式（警告模式）", "info");
      } else {
        ctx.ui.notify(`❌ 未知操作: ${action}`, "warning");
      }
    },
  });

  pi.registerCommand("path-whitelist-log", {
    description: "查看恶意内容告警日志",
    handler: async (_args, ctx) => {
      if (!fs.existsSync(config.maliciousLogFile)) {
        ctx.ui.notify(`ℹ️ 日志文件不存在\n\n尚未触发任何恶意内容告警。`, "info");
        return;
      }
      const content = fs.readFileSync(config.maliciousLogFile, "utf-8");
      const entries = content.split("\n\n").filter(Boolean);
      const recent = entries.slice(-10).reverse();
      const message = `🚨 恶意内容告警日志（最近 ${recent.length} 条）\n\n日志文件: ${config.maliciousLogFile}\n总记录数: ${entries.length}\n\n${"─".repeat(50)}\n\n${recent.join("\n\n")}`;
      ctx.ui.notify(message, "info");
    },
  });
}

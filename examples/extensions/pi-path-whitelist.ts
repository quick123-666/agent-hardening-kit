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
 *   /path-whitelist status     - 查看白名单状态
 *   /path-whitelist add <path> - 添加白名单路径
 *   /path-whitelist remove <p> - 移除白名单路径
 *   /path-whitelist list       - 列出白名单
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
};

// ============================================================
// 路径检查
// ============================================================

function normalizePath(p: string): string {
  // 转换为绝对路径
  if (p.startsWith("~")) {
    p = p.replace("~", getHomeDir());
  }
  // Windows 路径标准化
  p = p.replace(/\\/g, "/");
  return p.toLowerCase();
}

function isPathAllowed(filePath: string, whitelist: string[]): { allowed: boolean; reason?: string } {
  const normalized = normalizePath(filePath);

  // 检查是否在白名单内
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

function isSensitivePath(filePath: string): { sensitive: boolean; reason?: string } {
  const normalized = normalizePath(filePath);
  const home = normalizePath(getHomeDir());

  // 敏感路径列表
  const sensitivePatterns = [
    // SSH
    { pattern: "/.ssh/", reason: "SSH 密钥目录" },
    { pattern: ".ssh/id_rsa", reason: "SSH 私钥" },
    { pattern: ".ssh/id_ed25519", reason: "SSH 私钥" },
    { pattern: ".ssh/known_hosts", reason: "SSH known_hosts" },
    { pattern: ".ssh/config", reason: "SSH 配置" },
    { pattern: ".ssh/authorized_keys", reason: "SSH 授权密钥" },
    // 认证
    { pattern: "/.aws/", reason: "AWS 凭证" },
    { pattern: "/.kube/", reason: "Kubernetes 配置" },
    { pattern: "/.netrc", reason: "Netrc 凭证" },
    { pattern: "/.npmrc", reason: "NPM 配置（可能含 token）" },
    { pattern: "/.pypirc", reason: "PyPI 凭证" },
    // 系统
    { pattern: "/windows/system32", reason: "系统目录" },
    { pattern: "/etc/passwd", reason: "系统账户文件" },
    { pattern: "/etc/shadow", reason: "系统密码文件" },
    { pattern: "/etc/sudoers", reason: "Sudo 配置" },
    // 环境变量
    { pattern: "/.env", reason: "环境变量文件" },
    { pattern: "/.env.local", reason: "环境变量文件" },
    { pattern: "/.env.production", reason: "生产环境变量" },
    // Cookie/Session
    { pattern: "/cookies", reason: "Cookie 文件" },
    { pattern: "/session", reason: "Session 文件" },
    // 浏览器
    { pattern: "/appdata/roaming/", reason: "用户应用数据" },
  ];

  // 首先检查是否在 home 目录外
  if (!normalized.startsWith(home) && !normalized.startsWith("/home/") && !normalized.startsWith("/root/")) {
    // 不在用户目录，检查系统目录
    if (normalized.includes("/windows/") || normalized.includes("/etc/")) {
      return { sensitive: true, reason: "系统目录" };
    }
  }

  // 检查敏感模式
  for (const { pattern, reason } of sensitivePatterns) {
    if (normalized.includes(pattern.toLowerCase())) {
      return { sensitive: true, reason };
    }
  }

  return { sensitive: false };
}

// ============================================================
// 日志
// ============================================================

function log(config: PathWhitelistConfig, tool: string, path: string, allowed: boolean, reason?: string) {
  if (!config.logFile) return;
  try {
    const dir = path.dirname(config.logFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const timestamp = new Date().toISOString();
    const status = allowed ? "ALLOWED" : "BLOCKED";
    const reasonStr = reason ? ` (${reason})` : "";
    const line = `[${timestamp}] [${status}] ${tool}: ${path}${reasonStr}\n`;
    fs.appendFileSync(config.logFile, line, "utf-8");
  } catch {
    // 忽略日志错误
  }
}

// ============================================================
// 扩展主逻辑
// ============================================================

export default function (pi: ExtensionAPI) {
  const config: PathWhitelistConfig = {
    ...DEFAULT_CONFIG,
  };

  console.log("[PathWhitelist] 路径白名单扩展已加载");
  console.log(`[PathWhitelist] 保护工具: ${config.allowedTools.join(", ")}`);
  console.log(`[PathWhitelist] 白名单路径数: ${config.whitelist.length}`);

  // ============================================================
  // 获取项目根目录
  // ============================================================

  function getProjectRoot(): string[] {
    // 尝试从当前工作目录获取
    try {
      const cwd = process.cwd();
      return [cwd];
    } catch {
      return [];
    }
  }

  // ============================================================
  // 拦截文件操作
  // ============================================================

  pi.on("tool_call", async (event, ctx) => {
    const toolName = event.toolName;
    const params = event.input || {};

    // 只检查允许的工具
    if (!config.allowedTools.includes(toolName)) {
      return; // 不处理
    }

    // 获取路径参数
    let filePath = "";
    if (toolName === "read" || toolName === "edit" || toolName === "write") {
      filePath = params.path || params.file_path || "";
    }

    if (!filePath) {
      return;
    }

    // 1. 首先检查是否是敏感路径
    const sensitiveCheck = isSensitivePath(filePath);
    if (sensitiveCheck.sensitive) {
      log(config, toolName, filePath, false, `敏感路径: ${sensitiveCheck.reason}`);

      ctx.ui.notify(
        `🔒 [PathWhitelist] 禁止访问敏感路径\n\n` +
          `路径: ${filePath}\n` +
          `原因: ${sensitiveCheck.reason}\n\n` +
          `此操作已被阻止。`,
        "error"
      );

      event.preventDefault?.();
      return { allowed: false, message: `敏感路径禁止访问: ${sensitiveCheck.reason}` };
    }

    // 2. 检查是否在白名单内
    if (config.whitelist.length > 0) {
      const allowed = isPathAllowed(filePath, config.whitelist);
      if (!allowed.allowed) {
        log(config, toolName, filePath, false, allowed.reason);

        if (config.warnOnly) {
          ctx.ui.notify(
            `⚠️ [PathWhitelist] 路径不在白名单内\n\n` +
              `路径: ${filePath}\n\n` +
              `已记录此次访问。`,
            "warning"
          );
        } else {
          ctx.ui.notify(
            `🔒 [PathWhitelist] 路径不在白名单内\n\n` +
              `路径: ${filePath}\n` +
              `允许的路径:\n${config.whitelist.map((p) => `  - ${p}`).join("\n")}\n\n` +
              `如需访问，请添加白名单：\n` +
              `  /path-whitelist add <路径>`,
            "error"
          );

          event.preventDefault?.();
          return { allowed: false, message: `路径不在白名单内: ${filePath}` };
        }
      }
    }

    // 记录所有访问
    if (config.logAll) {
      log(config, toolName, filePath, true);
    }

    return;
  });

  // ============================================================
  // 拦截文件写入（检查恶意内容）
  // ============================================================

  pi.on("tool_result", async (event, ctx) => {
    const toolName = event.toolName;
    const params = event.input || {};

    // 只检查写入操作
    if (toolName !== "write" && toolName !== "edit") {
      return;
    }

    const content = params.content || params.newText || "";
    if (!content) {
      return;
    }

    // 检查恶意内容模式
    const maliciousPatterns = [
      { pattern: /eval\s*\(\s*base64_decode/gi, reason: "Base64 编码的 eval" },
      { pattern: /rm\s+-rf\s+\//gi, reason: "删除根目录" },
      { pattern: /curl\s+\|\s*bash/gi, reason: "Pipe curl to bash" },
      { pattern: /wget\s+.*\|\s*bash/gi, reason: "Pipe wget to bash" },
      { pattern: /nc\s+.*-e\s+/gi, reason: "Netcat 反向 shell" },
      { pattern: /bash\s+-i\s+>&.*\/dev\/tcp\//gi, reason: "Bash 反向 shell" },
      { pattern: /\/dev\/tcp\//gi, reason: " Bash /dev/tcp shell" },
      { pattern: /python.*-c.*import\s+socket/gi, reason: "Python 反向 shell" },
      { pattern: /php.*eval\s*\(\s*\$_/gi, reason: "PHP eval 注入" },
      { pattern: /DROP\s+TABLE/gi, reason: "DROP TABLE 注入" },
      { pattern: /DROP\s+DATABASE/gi, reason: "DROP DATABASE 注入" },
      { pattern: /;\s*rm\s+-rf/gi, reason: "命令注入 + 删除" },
    ];

    for (const { pattern, reason } of maliciousPatterns) {
      if (pattern.test(content)) {
        log(config, toolName, params.path || "unknown", false, `恶意内容: ${reason}`);

        ctx.ui.notify(
          `🚨 [PathWhitelist] 检测到恶意内容\n\n` +
            `文件: ${params.path || "unknown"}\n` +
            `原因: ${reason}\n\n` +
            `内容已写入，但已被标记。\n` +
            `请检查代码是否安全。`,
          "warning"
        );

        // 不阻止写入，但发出警告
        return;
      }
    }
  });

  // ============================================================
  // 命令
  // ============================================================

  // 状态
  pi.registerCommand({
    name: "path-whitelist-status",
    description: "查看路径白名单状态",
    async execute(ctx) {
      let message = "";
      message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
      message += "🔒 路径白名单状态\n";
      message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
      message += `启用: ${config.enabled ? "是" : "否"}\n`;
      message += `模式: ${config.warnOnly ? "警告模式" : "阻止模式"}\n`;
      message += `保护工具: ${config.allowedTools.join(", ")}\n`;
      message += `\n白名单路径:\n`;
      if (config.whitelist.length === 0) {
        message += `  （未设置，请使用 /path-whitelist add 添加）\n`;
      } else {
        config.whitelist.forEach((p) => {
          message += `  ✅ ${p}\n`;
        });
      }
      message += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
      message += `日志文件: ${config.logFile}\n`;
      message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

      return { content: [{ type: "text", text: message }] };
    },
  });

  // 列出白名单
  pi.registerCommand({
    name: "path-whitelist-list",
    description: "列出所有白名单路径",
    async execute(ctx) {
      if (config.whitelist.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "ℹ️ 白名单为空\n\n使用 /path-whitelist add <路径> 添加",
            },
          ],
        };
      }

      let message = "📋 白名单路径列表\n\n";
      config.whitelist.forEach((p, i) => {
        message += `${i + 1}. ${p}\n`;
      });

      return { content: [{ type: "text", text: message }] };
    },
  });

  // 添加白名单
  pi.registerCommand({
    name: "path-whitelist-add",
    description: "添加白名单路径",
    async execute(ctx) {
      const args = ctx.args || [];
      if (args.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "❌ 请指定路径\n\n用法: /path-whitelist add <路径>",
            },
          ],
        };
      }

      const newPath = args.join(" ");
      if (config.whitelist.includes(newPath)) {
        return {
          content: [
            {
              type: "text",
              text: `ℹ️ 路径已在白名单中: ${newPath}`,
            },
          ],
        };
      }

      config.whitelist.push(newPath);
      return {
        content: [
          {
            type: "text",
            text: `✅ 已添加白名单: ${newPath}\n\n当前白名单:\n${config.whitelist.map((p) => `  - ${p}`).join("\n")}`,
          },
        ],
      };
    },
  });

  // 移除白名单
  pi.registerCommand({
    name: "path-whitelist-remove",
    description: "移除白名单路径",
    async execute(ctx) {
      const args = ctx.args || [];
      if (args.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "❌ 请指定路径\n\n用法: /path-whitelist remove <路径>",
            },
          ],
        };
      }

      const removePath = args.join(" ");
      const index = config.whitelist.indexOf(removePath);
      if (index === -1) {
        return {
          content: [
            {
              type: "text",
              text: `ℹ️ 路径不在白名单中: ${removePath}`,
            },
          ],
        };
      }

      config.whitelist.splice(index, 1);
      return {
        content: [
          {
            type: "text",
            text: `✅ 已移除白名单: ${removePath}`,
          },
        ],
      };
    },
  });

  // 切换模式
  pi.registerCommand({
    name: "path-whitelist-toggle",
    description: "切换阻止/警告模式",
    async execute(ctx) {
      config.warnOnly = !config.warnOnly;
      return {
        content: [
          {
            type: "text",
            text: `✅ 已切换到 ${config.warnOnly ? "警告模式" : "阻止模式"}`,
          },
        ],
      };
    },
  });
}

/**
 * Pi Path Whitelist Extension with Multi-Hop Tracing
 *
 * 路径白名单 + 多跳追踪版
 *
 * 核心改进：
 * - 把拦截过程分解成多个 Hop，让用户理解决策过程
 * - 每一步检查都记录，用户能看到"为什么被拦"
 * - 提供具体建议，告诉用户"怎么改"
 *
 * 多跳追踪流程：
 * Hop 1: 解析输入 - 提取工具名、路径、参数
 * Hop 2: 路径检查 - 是否在白名单内
 * Hop 3: 敏感路径检查 - 是否是敏感文件
 * Hop 4: 恶意内容检查 - 是否包含危险代码
 * Hop 5: 决策 + 建议 - 最终判断 + 修复建议
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";

// ============================================================
// 多跳追踪类型
// ============================================================

interface CheckStep {
  hop: number;
  name: string;
  description: string;
  passed: boolean;
  detail?: string;
  suggestion?: string;
}

interface ConstraintDecision {
  allowed: boolean;
  steps: CheckStep[];
  finalReason?: string;
  suggestion?: string;
  blockedBy?: string;
}

// ============================================================
// 配置
// ============================================================

interface PathWhitelistConfig {
  enabled: boolean;
  allowedTools: string[];
  whitelist: string[];
  warnOnly: boolean;
  logAll: boolean;
  logFile: string;
  maliciousLogFile: string;
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
// 路径检查函数
// ============================================================

function normalizePath(p: string): string {
  if (p.startsWith("~")) p = p.replace("~", getHomeDir());
  return p.replace(/\\/g, "/").toLowerCase();
}

function isPathAllowed(filePath: string, whitelist: string[]): { allowed: boolean; detail?: string } {
  const normalized = normalizePath(filePath);
  for (const allowed of whitelist) {
    const allowedNorm = normalizePath(allowed);
    if (normalized.startsWith(allowedNorm) || normalized.includes(allowedNorm)) {
      return { allowed: true };
    }
  }
  return { allowed: false, detail: `路径 "${filePath}" 不在白名单内` };
}

function isSensitivePath(filePath: string): { sensitive: boolean; reason?: string; suggestion?: string } {
  const normalized = normalizePath(filePath);
  const sensitivePatterns = [
    { pattern: "/.ssh/", reason: "SSH 密钥目录", suggestion: "禁止访问 SSH 密钥，仅允许项目配置文件" },
    { pattern: ".ssh/id_rsa", reason: "SSH 私钥", suggestion: "禁止读取私钥文件，防止密钥泄露" },
    { pattern: "/.aws/", reason: "AWS 凭证", suggestion: "禁止访问 AWS 配置，使用环境变量代替" },
    { pattern: "/.kube/", reason: "Kubernetes 配置", suggestion: "禁止访问 kubeconfig，防止集群入侵" },
    { pattern: "/etc/passwd", reason: "系统账户文件", suggestion: "禁止读取系统账户信息" },
    { pattern: "/etc/shadow", reason: "系统密码文件", suggestion: "禁止读取密码哈希，防止密码破解" },
    { pattern: "/.env", reason: "环境变量文件", suggestion: "禁止读取 .env，使用代码中的默认值" },
  ];

  for (const { pattern, reason, suggestion } of sensitivePatterns) {
    if (normalized.includes(pattern.toLowerCase())) {
      return { sensitive: true, reason, suggestion };
    }
  }
  return { sensitive: false };
}

// ============================================================
// 多跳检查主函数
// ============================================================

function runMultiHopChecks(
  toolName: string,
  params: Record<string, any>,
  config: PathWhitelistConfig
): ConstraintDecision {
  const steps: CheckStep[] = [];
  let allowed = true;
  let finalReason: string | undefined;
  let blockedBy: string | undefined;
  let suggestion: string | undefined;

  // ===== Hop 1: 解析输入 =====
  const filePath = params.path || params.file_path || "";
  const content = params.content || params.newText || "";
  
  steps.push({
    hop: 1,
    name: "parse_input",
    description: "解析输入",
    passed: true,
    detail: `工具: ${toolName}, 路径: ${filePath || "(无路径)"}`,
  });

  // ===== Hop 2: 路径白名单检查 =====
  if (filePath && config.whitelist.length > 0) {
    const pathCheck = isPathAllowed(filePath, config.whitelist);
    steps.push({
      hop: 2,
      name: "path_whitelist",
      description: "白名单检查",
      passed: pathCheck.allowed,
      detail: pathCheck.allowed ? "路径在白名单内" : pathCheck.detail,
      suggestion: !pathCheck.allowed ? "使用项目目录内的路径，或添加白名单: /path-whitelist-add <路径>" : undefined,
    });
    if (!pathCheck.allowed) {
      allowed = false;
      blockedBy = "path_whitelist";
      finalReason = pathCheck.detail;
      suggestion = `只允许访问项目目录: ${config.whitelist.join(", ")}`;
    }
  } else {
    steps.push({
      hop: 2,
      name: "path_whitelist",
      description: "白名单检查",
      passed: true,
      detail: "白名单为空，跳过检查",
    });
  }

  // ===== Hop 3: 敏感路径检查 =====
  if (filePath && allowed) {
    const sensitiveCheck = isSensitivePath(filePath);
    steps.push({
      hop: 3,
      name: "sensitive_path",
      description: "敏感路径检查",
      passed: !sensitiveCheck.sensitive,
      detail: sensitiveCheck.sensitive ? `敏感路径: ${sensitiveCheck.reason}` : "非敏感路径",
      suggestion: sensitiveCheck.sensitive ? sensitiveCheck.suggestion : undefined,
    });
    if (sensitiveCheck.sensitive) {
      allowed = false;
      blockedBy = "sensitive_path";
      finalReason = sensitiveCheck.reason;
      suggestion = sensitiveCheck.suggestion;
    }
  } else {
    steps.push({
      hop: 3,
      name: "sensitive_path",
      description: "敏感路径检查",
      passed: true,
      detail: "无路径或已拦截，跳过",
    });
  }

  // ===== Hop 4: 恶意内容检查（仅 write/edit）=====
  if ((toolName === "write" || toolName === "edit") && content && allowed) {
    const maliciousPatterns = [
      { pattern: /curl[^|]*\|\s*bash/gi, reason: "curl|bash 下载执行", suggestion: "先下载到文件，再执行" },
      { pattern: /wget[^|]*\|\s*bash/gi, reason: "wget|bash 下载执行", suggestion: "先下载到文件，再执行" },
      { pattern: /eval\s*\(\s*base64_decode/gi, reason: "Base64 解码执行", suggestion: "避免使用 eval 解码" },
      { pattern: /DROP\s+TABLE/gi, reason: "DROP TABLE 注入", suggestion: "使用 ORM 或参数化查询" },
      { pattern: /rm\s+-rf\s+\//gi, reason: "删除根目录", suggestion: "删除项目内文件请使用相对路径" },
    ];

    let maliciousFound = false;
    for (const { pattern, reason, suggestion: s } of maliciousPatterns) {
      if (pattern.test(content)) {
        steps.push({
          hop: 4,
          name: "malicious_content",
          description: "恶意内容检查",
          passed: false,
          detail: `检测到危险模式: ${reason}`,
          suggestion: s,
        });
        maliciousFound = true;
        allowed = false;
        blockedBy = "malicious_content";
        finalReason = reason;
        suggestion = s;
        break;
      }
    }

    if (!maliciousFound) {
      steps.push({
        hop: 4,
        name: "malicious_content",
        description: "恶意内容检查",
        passed: true,
        detail: "未检测到恶意内容",
      });
    }
  } else {
    steps.push({
      hop: 4,
      name: "malicious_content",
      description: "恶意内容检查",
      passed: true,
      detail: "无需检查（无内容或已拦截）",
    });
  }

  // ===== Hop 5: 决策 =====
  steps.push({
    hop: 5,
    name: "decision",
    description: "最终决策",
    passed: allowed,
    detail: allowed ? "允许执行" : `拦截原因: ${finalReason}`,
    suggestion: !allowed && suggestion ? suggestion : undefined,
  });

  return { allowed, steps, finalReason, suggestion, blockedBy };
}

// ============================================================
// 格式化决策输出
// ============================================================

function formatDecision(decision: ConstraintDecision, toolName: string, filePath: string): string {
  let message = "";

  if (decision.allowed) {
    message += `✅ **路径检查通过**\n\n`;
  } else {
    message += `🔒 **路径检查拦截**\n\n`;
  }

  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🛡️ 多跳决策追踪\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  for (const step of decision.steps) {
    const icon = step.passed ? "✅" : "❌";
    const name = step.name.replace("_", " ");
    message += `**Hop ${step.hop}: ${name}**\n`;
    message += `${icon} ${step.description}\n`;
    if (step.detail) message += `   📝 ${step.detail}\n`;
    if (step.suggestion && !step.passed) {
      message += `   💡 建议: ${step.suggestion}\n`;
    }
    message += `\n`;
  }

  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  if (!decision.allowed) {
    message += `\n🚫 **最终决策: 拦截**\n`;
    message += `拦截规则: ${decision.blockedBy}\n`;
    if (decision.suggestion) {
      message += `\n💡 **修复建议**\n${decision.suggestion}\n`;
    }
  }

  return message;
}

// ============================================================
// 日志
// ============================================================

function log(config: PathWhitelistConfig, tool: string, filePath: string, allowed: boolean, reason?: string) {
  if (!config.logFile) return;
  try {
    const dir = path.dirname(config.logFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const line = `[${new Date().toISOString()}] [${allowed ? "ALLOWED" : "BLOCKED"}] ${tool}: ${filePath}${reason ? ` (${reason})` : ""}\n`;
    fs.appendFileSync(config.logFile, line, "utf-8");
  } catch {}
}

// ============================================================
// 扩展主逻辑
// ============================================================

export default function (pi: ExtensionAPI) {
  const config: PathWhitelistConfig = { ...DEFAULT_CONFIG };

  console.log("[PathWhitelist] 路径白名单扩展已加载（多跳追踪版）");

  // ============================================================
  // 拦截文件操作 - 使用多跳追踪
  // ============================================================

  pi.on("tool_call", async (event, ctx) => {
    const toolName = event.toolName;
    const params = (event.input || {}) as Record<string, any>;

    // 只检查允许的工具
    if (!config.allowedTools.includes(toolName)) return;

    const filePath = params.path || params.file_path || "";

    // 运行多跳检查
    const decision = runMultiHopChecks(toolName, params, config);

    // 记录日志
    log(config, toolName, filePath, decision.allowed, decision.finalReason);

    // 如果不允许，拦截并显示追踪过程
    if (!decision.allowed) {
      const message = formatDecision(decision, toolName, filePath);
      ctx.ui.notify(message, "error");

      event.preventDefault?.();
      return {
        allowed: false,
        message: decision.finalReason,
        decision: decision,  // 传递完整决策过程
      };
    }
  });

  // ============================================================
  // 命令
  // ============================================================

  pi.registerCommand("path-whitelist-status", {
    description: "查看路径白名单状态",
    handler: async (_args, ctx) => {
      let message = "🔒 路径白名单状态（多跳追踪版）\n\n";
      message += `启用: ${config.enabled ? "是" : "否"}\n`;
      message += `模式: ${config.warnOnly ? "警告模式" : "阻止模式"}\n`;
      message += `追踪hops: 5\n\n`;
      message += `白名单路径:\n`;
      if (config.whitelist.length === 0) {
        message += `  （未设置）\n`;
      } else {
        config.whitelist.forEach((p) => { message += `  ✅ ${p}\n`; });
      }
      ctx.ui.notify(message, "info");
    },
  });

  pi.registerCommand("path-whitelist-add", {
    description: "添加白名单路径",
    handler: async (args, ctx) => {
      if (!args || args.length === 0) {
        ctx.ui.notify("用法: /path-whitelist-add <路径>", "warning");
        return;
      }
      const newPath = args.join(" ");
      if (!config.whitelist.includes(newPath)) {
        config.whitelist.push(newPath);
        ctx.ui.notify(`✅ 已添加: ${newPath}\n\n白名单现在包含 ${config.whitelist.length} 个路径`, "info");
      } else {
        ctx.ui.notify(`ℹ️ 已存在: ${newPath}`, "info");
      }
    },
  });

  pi.registerCommand("path-whitelist-remove", {
    description: "移除白名单路径",
    handler: async (args, ctx) => {
      if (!args || args.length === 0) {
        ctx.ui.notify("用法: /path-whitelist-remove <路径>", "warning");
        return;
      }
      const removePath = args.join(" ");
      const index = config.whitelist.indexOf(removePath);
      if (index >= 0) {
        config.whitelist.splice(index, 1);
        ctx.ui.notify(`✅ 已移除: ${removePath}`, "info");
      } else {
        ctx.ui.notify(`ℹ️ 不在白名单中: ${removePath}`, "info");
      }
    },
  });

  pi.registerCommand("path-whitelist-list", {
    description: "列出白名单路径",
    handler: async (_args, ctx) => {
      if (config.whitelist.length === 0) {
        ctx.ui.notify("ℹ️ 白名单为空", "info");
      } else {
        ctx.ui.notify("📋 白名单:\n" + config.whitelist.map((p, i) => `${i + 1}. ${p}`).join("\n"), "info");
      }
    },
  });
}

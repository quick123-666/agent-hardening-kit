/**
 * Pi Path Whitelist Extension - 好的约束版
 *
 * 好的约束 = 拦截 + 解释 + 引导
 *
 * 拦截：检测并阻止危险操作
 * 解释：子代理分析为什么被拦
 * 引导：给出具体修复建议
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
  allowedTools: string[];
  whitelist: string[];
  logFile: string;
  useSubagent: boolean;  // 是否启用子代理解释
}

function getHomeDir(): string {
  return os.homedir();
}

const DEFAULT_CONFIG: PathWhitelistConfig = {
  enabled: true,
  allowedTools: ["read", "edit", "write"],
  whitelist: [],
  logFile: path.join(os.homedir(), ".pi", "agent", "logs", "path-whitelist.log"),
  useSubagent: true,
};

// ============================================================
// 路径检查
// ============================================================

function normalizePath(p: string): string {
  if (p.startsWith("~")) p = p.replace("~", getHomeDir());
  return p.replace(/\\/g, "/").toLowerCase();
}

function isPathAllowed(filePath: string, whitelist: string[]): { allowed: boolean; reason?: string; suggestion?: string } {
  if (whitelist.length === 0) return { allowed: true };
  
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
    suggestion: `只允许访问项目目录: ${whitelist.join(", ")}`
  };
}

function checkSensitivePath(filePath: string): { allowed: boolean; reason?: string; suggestion?: string } {
  const normalized = normalizePath(filePath);
  
  const sensitivePatterns = [
    { pattern: ".ssh/id_rsa", reason: "SSH 私钥", suggestion: "私钥文件包含登录凭证，禁止程序读取。使用环境变量或项目配置文件代替。" },
    { pattern: ".ssh/", reason: "SSH 配置目录", suggestion: "SSH 目录包含敏感凭证。项目代码不应直接访问 SSH 配置。" },
    { pattern: "/.aws/", reason: "AWS 凭证", suggestion: "AWS 配置包含云服务密钥。使用环境变量 AWS_ACCESS_KEY_ID 等代替。" },
    { pattern: "/.kube/", reason: "Kubernetes 配置", suggestion: "Kubeconfig 包含集群访问凭证。使用项目内的 kubeconfig 或服务账号。" },
    { pattern: "/.env", reason: "环境变量文件", suggestion: ".env 可能包含密钥。使用 .env.example（不含密钥）代替。" },
    { pattern: "/etc/passwd", reason: "系统账户文件", suggestion: "系统账户信息。程序不需要读取此文件。" },
    { pattern: "/etc/shadow", reason: "系统密码文件", suggestion: "密码哈希文件。高危敏感文件，禁止任何程序访问。" },
  ];

  for (const { pattern, reason, suggestion } of sensitivePatterns) {
    if (normalized.includes(pattern.toLowerCase())) {
      return { allowed: false, reason, suggestion };
    }
  }
  return { allowed: true };
}

// ============================================================
// 子代理解释（第二部分：解释）
// ============================================================

async function runSubagentExplanation(
  pi: ExtensionAPI,
  toolName: string,
  filePath: string,
  reason: string
): Promise<string> {
  const prompt = `你是安全教练，正在解释一个安全约束的拦截。

情况：
- 操作: ${toolName} ${filePath}
- 被拦截原因: ${reason}

请用简洁、有帮助的方式解释：
1. 这个操作的风险是什么（用生活中的例子）
2. 为什么约束要拦截它
3. 如果你需要完成类似任务，应该怎么做

格式：
📖 **风险解读**
[用简单的话解释风险]

🔧 **安全做法**
[具体怎么做的建议]

2-3 句话即可，不要太长。`;

  try {
    return await pi.run(prompt);
  } catch {
    return "";
  }
}

// ============================================================
// 日志
// ============================================================

function log(config: PathWhitelistConfig, tool: string, filePath: string, blocked: boolean, reason?: string) {
  if (!config.logFile) return;
  try {
    const dir = path.dirname(config.logFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const line = `[${new Date().toISOString()}] [${blocked ? "BLOCKED" : "ALLOWED"}] ${tool}: ${filePath}${reason ? ` | ${reason}` : ""}\n`;
    fs.appendFileSync(config.logFile, line, "utf-8");
  } catch {}
}

// ============================================================
// 扩展主逻辑
// ============================================================

export default function (pi: ExtensionAPI) {
  const config: PathWhitelistConfig = { ...DEFAULT_CONFIG };

  console.log("[PathWhitelist] 好的约束版已加载（拦截+解释+引导）");

  // ============================================================
  // 拦截文件操作
  // ============================================================

  pi.on("tool_call", async (event, ctx) => {
    const toolName = event.toolName;
    const params = event.input || {};
    const filePath = params.path || params.file_path || "";

    if (!config.allowedTools.includes(toolName)) return;
    if (!filePath) return;

    // ===== 第一部分：拦截检查 =====
    let blocked = false;
    let reason = "";
    let suggestion = "";

    // 白名单检查
    const whitelistCheck = isPathAllowed(filePath, config.whitelist);
    if (!whitelistCheck.allowed) {
      blocked = true;
      reason = whitelistCheck.reason || "路径不在白名单内";
      suggestion = whitelistCheck.suggestion || "使用项目目录内的路径";
    }

    // 敏感路径检查
    if (!blocked) {
      const sensitiveCheck = checkSensitivePath(filePath);
      if (!sensitiveCheck.allowed) {
        blocked = true;
        reason = sensitiveCheck.reason || "敏感路径";
        suggestion = sensitiveCheck.suggestion || "禁止访问敏感路径";
      }
    }

    // 记录日志
    log(config, toolName, filePath, blocked, blocked ? reason : undefined);

    // ===== 如果被拦截 =====
    if (blocked) {
      // ===== 第一部分输出：拦截 =====
      const blockMsg = 
        `🚫 **操作被拦截**\n\n` +
        `工具: ${toolName}\n` +
        `路径: ${filePath}\n\n` +
        `原因: ${reason}\n`;

      ctx.ui.notify(blockMsg, "error");

      // ===== 第二部分输出：解释（子代理） =====
      if (config.useSubagent) {
        ctx.ui.notify("\n⏳ 正在分析...\n", "info");
        
        const explanation = await runSubagentExplanation(pi, toolName, filePath, reason);
        
        if (explanation) {
          ctx.ui.notify(`📖 **风险解读**\n${explanation}\n`, "info");
        }
      }

      // ===== 第三部分输出：引导 =====
      const guideMsg = 
        `💡 **如何完成你的任务**\n\n` +
        `${suggestion}\n\n` +
        `如果需要调整白名单，请使用：\n` +
        `  /path-whitelist-add <路径>\n`;

      ctx.ui.notify(guideMsg, "info");

      event.preventDefault?.();
      return { allowed: false, message: reason };
    }
  });

  // ============================================================
  // 命令
  // ============================================================

  pi.registerCommand("path-whitelist-status", {
    description: "查看状态",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        `🔒 路径白名单状态\n\n` +
        `好的约束 = 拦截 + 解释 + 引导\n\n` +
        `✅ 拦截: 已启用\n` +
        `✅ 解释: ${config.useSubagent ? "子代理分析已启用" : "已禁用"}\n` +
        `✅ 引导: 修复建议已启用\n` +
        `📂 白名单: ${config.whitelist.length} 个路径`,
        "info"
      );
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
        ctx.ui.notify(`✅ 已添加: ${newPath}`, "info");
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
        ctx.ui.notify(`ℹ️ 不存在: ${removePath}`, "info");
      }
    },
  });

  pi.registerCommand("path-whitelist-list", {
    description: "列出白名单",
    handler: async (_args, ctx) => {
      if (config.whitelist.length === 0) {
        ctx.ui.notify("📂 白名单为空", "info");
      } else {
        ctx.ui.notify("📂 白名单:\n" + config.whitelist.map((p, i) => `${i + 1}. ${p}`).join("\n"), "info");
      }
    },
  });
}

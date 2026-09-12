/**
 * Pi Path Whitelist Extension with Subagent Analysis
 *
 * 路径白名单 + 子代理分析版
 *
 * 核心改进：
 * 当硬约束拦截时，启动子代理分析
 * 用 LLM 解释为什么被拦、怎么修复
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
  warnOnly: boolean;
  logAll: boolean;
  logFile: string;
  useSubagent: boolean;  // 新增：是否启用子代理分析
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
  useSubagent: true,  // 默认启用
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

function isSensitivePath(filePath: string): { sensitive: boolean; reason?: string } {
  const normalized = normalizePath(filePath);
  const sensitivePatterns = [
    { pattern: "/.ssh/", reason: "SSH 密钥目录" },
    { pattern: ".ssh/id_rsa", reason: "SSH 私钥" },
    { pattern: "/.aws/", reason: "AWS 凭证" },
    { pattern: "/.kube/", reason: "Kubernetes 配置" },
    { pattern: "/etc/passwd", reason: "系统账户文件" },
    { pattern: "/etc/shadow", reason: "系统密码文件" },
    { pattern: "/.env", reason: "环境变量文件" },
  ];

  for (const { pattern, reason } of sensitivePatterns) {
    if (normalized.includes(pattern.toLowerCase())) {
      return { sensitive: true, reason };
    }
  }
  return { sensitive: false };
}

// ============================================================
// 子代理分析（接入 LLM）
// ============================================================

async function runSubagentAnalysis(
  pi: ExtensionAPI,
  toolName: string,
  filePath: string,
  reason: string
): Promise<string> {
  // 构建分析提示
  const prompt = `你是安全顾问，正在分析一个 AI 编程助手的操作被拦截的情况。

工具: ${toolName}
路径: ${filePath}
拦截原因: ${reason}

请用简洁易懂的语言解释：
1. 为什么这个操作被拦截（用普通人能懂的话）
2. 这个操作有什么风险
3. 如果用户需要完成类似任务，应该怎么做

回答格式：
📋 分析结果
---
[你的解释]
---
💡 建议
---
[具体做法]

保持简洁，3-5 句话即可。`;

  try {
    // 调用 LLM（子代理）
    const analysis = await pi.run(prompt);
    return analysis;
  } catch (error) {
    return `⚠️ 子代理分析失败: ${error}`;
  }
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

  console.log("[PathWhitelist] 路径白名单扩展已加载（子代理分析版）");

  // ============================================================
  // 拦截文件操作
  // ============================================================

  pi.on("tool_call", async (event, ctx) => {
    const toolName = event.toolName;
    const params = event.input || {};
    const filePath = params.path || params.file_path || "";

    // 只检查允许的工具
    if (!config.allowedTools.includes(toolName)) return;

    // 检查路径
    if (!filePath) return;

    let reason = "";
    let blocked = false;

    // 白名单检查
    if (config.whitelist.length > 0) {
      const pathCheck = isPathAllowed(filePath, config.whitelist);
      if (!pathCheck.allowed) {
        reason = pathCheck.detail || "路径不在白名单内";
        blocked = true;
      }
    }

    // 敏感路径检查
    if (!blocked) {
      const sensitiveCheck = isSensitivePath(filePath);
      if (sensitiveCheck.sensitive) {
        reason = sensitiveCheck.reason || "敏感路径";
        blocked = true;
      }
    }

    // 记录日志
    log(config, toolName, filePath, !blocked, blocked ? reason : undefined);

    // 如果被拦截
    if (blocked) {
      // 记录基本信息
      let message = `🔒 **路径检查拦截**\n\n`;
      message += `工具: ${toolName}\n`;
      message += `路径: ${filePath}\n`;
      message += `原因: ${reason}\n\n`;
      message += `⏳ 正在启动子代理分析...\n`;

      // 先返回基本信息
      ctx.ui.notify(message, "error");

      // 如果启用子代理，启动分析
      if (config.useSubagent) {
        const analysis = await runSubagentAnalysis(pi, toolName, filePath, reason);
        
        // 显示子代理分析结果
        const analysisMessage = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        ctx.ui.notify(`${analysisMessage}${analysis}`, "info");
      }

      event.preventDefault?.();
      return { allowed: false, message: reason };
    }
  });

  // ============================================================
  // 命令
  // ============================================================

  pi.registerCommand("path-whitelist-status", {
    description: "查看路径白名单状态",
    handler: async (_args, ctx) => {
      let message = "🔒 路径白名单状态（子代理分析版）\n\n";
      message += `启用: ${config.enabled ? "是" : "否"}\n`;
      message += `子代理分析: ${config.useSubagent ? "已启用" : "已禁用"}\n`;
      message += `白名单路径: ${config.whitelist.length} 个\n`;
      ctx.ui.notify(message, "info");
    },
  });

  pi.registerCommand("path-whitelist-subagent", {
    description: "开关子代理分析",
    handler: async (args, ctx) => {
      if (args && args[0] === "off") {
        config.useSubagent = false;
        ctx.ui.notify("✅ 子代理分析已禁用", "info");
      } else {
        config.useSubagent = true;
        ctx.ui.notify("✅ 子代理分析已启用", "info");
      }
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

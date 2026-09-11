/**
 * Pi Disable Bash Extension (最高安全等级 - 禁用 bash 工具)
 *
 * 直接从 LLM 的工具列表中移除 bash，LLM 无法看到或调用它。
 * 这是比"prompt 禁止"更彻底的安全方案。
 *
 * 使用方法：
 *   pi -e ~/.pi/agent/extensions/pi-disable-bash.ts
 *
 * 注意：
 *   - 此扩展必须在所有其他扩展之前加载，或单独使用
 *   - 保留了 read/edit/write 工具（文件操作）
 *   - 可以通过 /allow-bash 临时重新启用 bash
 *   - 关闭当前会话后自动恢复
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as os from "node:os";

// ============================================================
// 配置
// ============================================================

interface DisableBashConfig {
  /** 是否已禁用 bash */
  disabled: boolean;
  /** 禁用前的原始工具列表 */
  originalTools: string[];
  /** 是否在 session_start 时自动禁用 */
  autoDisable: boolean;
  /** 允许的命令白名单（即使 bash 开启） */
  allowedCommands: string[];
  /** 日志文件 */
  logFile: string;
}

const DEFAULT_CONFIG: DisableBashConfig = {
  disabled: false,
  originalTools: [],
  autoDisable: true,
  allowedCommands: [],
  logFile: "",  // 空字符串表示不记录
};

// ============================================================
// 日志
// ============================================================

function log(config: DisableBashConfig, action: string, detail: string) {
  if (!config.logFile) return;
  try {
    const line = `[${new Date().toISOString()}] ${action}: ${detail}\n`;
    const { appendFileSync } = require("node:fs");
    appendFileSync(config.logFile, line, "utf-8");
  } catch {
    // 忽略日志错误
  }
}

// ============================================================
// 核心禁用逻辑
// ============================================================

function disableBash(pi: ExtensionAPI, config: DisableBashConfig): boolean {
  try {
    const active = pi.getActiveTools();

    // 保存原始列表（只保存一次）
    if (config.originalTools.length === 0) {
      config.originalTools = [...active];
    }

    // 检查 bash 是否存在
    if (!active.includes("bash")) {
      log(config, "INFO", "bash 工具不在活跃列表中");
      return false;
    }

    // 移除 bash，只保留安全的文件操作工具
    const safeTools = active.filter((tool) => tool !== "bash");

    // 应用更改
    pi.setActiveTools(safeTools);

    config.disabled = true;
    log(config, "DISABLED", `bash 已禁用，保留工具: ${safeTools.join(", ")}`);

    return true;
  } catch (err) {
    log(config, "ERROR", `禁用 bash 失败: ${err}`);
    return false;
  }
}

function enableBash(pi: ExtensionAPI, config: DisableBashConfig): boolean {
  try {
    if (!config.disabled) {
      log(config, "INFO", "bash 已经是启用状态");
      return false;
    }

    if (config.originalTools.length === 0) {
      // 原始列表丢失，尝试恢复所有工具
      const all = pi.getAllTools();
      const allToolNames = all.map((t) => t.name);
      pi.setActiveTools(allToolNames);
      log(config, "RESTORED", "已恢复所有工具（原始列表已丢失）");
    } else {
      // 恢复原始列表
      pi.setActiveTools(config.originalTools);
      log(config, "RESTORED", `已恢复原始工具列表: ${config.originalTools.join(", ")}`);
    }

    config.disabled = false;
    return true;
  } catch (err) {
    log(config, "ERROR", `启用 bash 失败: ${err}`);
    return false;
  }
}

// ============================================================
// 扩展主逻辑
// ============================================================

export default function (pi: ExtensionAPI) {
  const config: DisableBashConfig = {
    ...DEFAULT_CONFIG,
    logFile: "",
  };

  console.log("[DisableBash] 最高安全等级扩展已加载");
  console.log("[DisableBash] bash 工具将被禁用");

  // ============================================================
  // 立即禁用 bash（在 session 启动前）
  // ============================================================

  // 在 session_start 时禁用
  pi.on("session_start", async () => {
    if (config.autoDisable && !config.disabled) {
      const success = disableBash(pi, config);
      if (success) {
        console.log("[DisableBash] ✅ bash 工具已禁用");
        console.log("[DisableBash] 💡 使用 /allow-bash 可临时启用");
      }
    }
  });

  // ============================================================
  // 注册命令
  // ============================================================

  // 查看状态
  pi.registerCommand({
    name: "bash-status",
    description: "查看 bash 工具状态",
    async execute(ctx) {
      const active = pi.getActiveTools();
      const hasBash = active.includes("bash");

      let message = "";
      message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
      message += "📊 Bash 工具状态\n";
      message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
      message += `当前状态: ${hasBash ? "🟢 已启用" : "🔴 已禁用"}\n`;
      message += `自动禁用: ${config.autoDisable ? "是" : "否"}\n`;
      message += `\n当前活跃工具:\n`;
      message += active.map((t) => `  - ${t}`).join("\n");
      message += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

      return { content: [{ type: "text", text: message }] };
    },
  });

  // 临时启用 bash
  pi.registerCommand({
    name: "allow-bash",
    description: "临时启用 bash 工具（当前会话有效）",
    async execute(ctx) {
      if (!config.disabled) {
        return {
          content: [
            {
              type: "text",
              text: "ℹ️ bash 工具已经是启用状态",
            },
          ],
        };
      }

      const success = enableBash(pi, config);
      if (success) {
        console.log("[DisableBash] 💡 用户手动启用了 bash");
        return {
          content: [
            {
              type: "text",
              text: "✅ bash 工具已临时启用\n\n⚠️ 注意：关闭当前会话后自动恢复禁用状态\n\n保留工具:\n" + pi.getActiveTools().map((t) => `  - ${t}`).join("\n"),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: "❌ 启用 bash 失败",
            },
          ],
        };
      }
    },
  });

  // 禁用 bash
  pi.registerCommand({
    name: "disable-bash",
    description: "禁用 bash 工具",
    async execute(ctx) {
      if (config.disabled) {
        return {
          content: [
            {
              type: "text",
              text: "ℹ️ bash 工具已经是禁用状态",
            },
          ],
        };
      }

      const success = disableBash(pi, config);
      if (success) {
        return {
          content: [
            {
              type: "text",
              text: "✅ bash 工具已禁用\n\n💡 使用 /allow-bash 可临时启用",
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: "❌ 禁用 bash 失败",
            },
          ],
        };
      }
    },
  });

  // 列出当前工具
  pi.registerCommand({
    name: "list-tools",
    description: "列出所有可用工具",
    async execute(ctx) {
      const all = pi.getAllTools();
      const active = pi.getActiveTools();

      let message = "📋 可用工具列表\n\n";

      message += "🔵 活跃工具:\n";
      for (const tool of all) {
        if (active.includes(tool.name)) {
          message += `  ✅ ${tool.name}\n`;
          if (tool.description) {
            message += `     ${tool.description.substring(0, 60)}...\n`;
          }
        }
      }

      message += "\n⚪ 非活跃工具:\n";
      for (const tool of all) {
        if (!active.includes(tool.name)) {
          message += `  ⏸️ ${tool.name}\n`;
        }
      }

      return { content: [{ type: "text", text: message }] };
    },
  });

  // ============================================================
  // 拦截 bash 命令（作为备用保护）
  // ============================================================

  // 虽然 bash 工具已被移除，但保留此拦截器作为额外保护层
  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName === "bash") {
      // 如果 bash 被调用但状态是禁用的，说明有问题
      if (config.disabled) {
        ctx.ui.notify(
          "🔒 bash 工具已禁用\n\n" +
            "如需启用，请使用命令：\n" +
            "  /allow-bash",
          "warning"
        );
        event.preventDefault?.();
        return { allowed: false };
      }
    }
  });

  // ============================================================
  // 会话结束时自动禁用
  // ============================================================

  pi.on("session_shutdown", async () => {
    // 会话结束时不自动禁用，因为这是全局状态
    // 每个新会话的 session_start 会自动处理
    console.log("[DisableBash] 会话结束");
  });
}

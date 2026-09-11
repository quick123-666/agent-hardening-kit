/**
 * Pi Multi-Hop Reasoning Extension (多跳推理追踪)
 *
 * 功能：
 * 1. 自动追踪 LLM 的多步推理过程
 * 2. 记录每一步的工具调用和结果
 * 3. 可视化推理链
 * 4. 支持中断/恢复
 * 5. 检测死循环（同一工具重复调用）
 * 6. 提供 /trace 命令查看推理历史
 *
 * 使用方法：
 *   pi -e ~/.pi/agent/extensions/pi-multihop-reasoning.ts
 *
 * 命令：
 *   /trace            - 显示当前推理链
 *   /trace-stats      - 推理统计信息
 *   /trace-clear      - 清除推理历史
 *   /trace-export     - 导出推理日志
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ============================================================
// 配置
// ============================================================

interface MultiHopConfig {
  enabled: boolean;
  /** 最大跳数（防止无限循环） */
  maxHops: number;
  /** 警告跳数（提醒用户） */
  warnHops: number;
  /** 检测重复调用的窗口 */
  repeatWindow: number;
  /** 日志文件 */
  logFile: string;
  /** 是否记录所有步骤 */
  verbose: boolean;
}

const DEFAULT_CONFIG: MultiHopConfig = {
  enabled: true,
  maxHops: 20,
  warnHops: 10,
  repeatWindow: 3,
  logFile: path.join(os.homedir(), ".pi", "agent", "logs", "multihop.log"),
  verbose: false,
};

// ============================================================
// 类型
// ============================================================

interface ReasoningStep {
  hop: number;
  timestamp: number;
  toolName: string;
  args: any;
  result?: any;
  duration?: number;
  error?: string;
}

interface ReasoningChain {
  sessionId: string;
  startTime: number;
  steps: ReasoningStep[];
  finalAnswer?: string;
}

// ============================================================
// 状态
// ============================================================

const chains = new Map<string, ReasoningChain>();
const toolCallCounts = new Map<string, number>();

// ============================================================
// 核心逻辑
// ============================================================

function startChain(sessionId: string): ReasoningChain {
  const chain: ReasoningChain = {
    sessionId,
    startTime: Date.now(),
    steps: [],
  };
  chains.set(sessionId, chain);
  return chain;
}

function addStep(sessionId: string, step: ReasoningStep) {
  let chain = chains.get(sessionId);
  if (!chain) {
    chain = startChain(sessionId);
  }
  chain.steps.push(step);

  // 检测死循环
  if (chain.steps.length >= config.repeatWindow) {
    const recent = chain.steps.slice(-config.repeatWindow);
    const signatures = recent.map((s) => `${s.toolName}:${JSON.stringify(s.args)}`);
    const allSame = signatures.every((s) => s === signatures[0]);
    if (allSame) {
      ctx?.ui?.notify(
        `🔄 [MultiHop] 检测到可能的死循环\n\n` +
          `连续 ${config.repeatWindow} 次调用相同工具\n` +
          `建议：明确告诉 AI 你想要的结果`,
        "warning"
      );
    }
  }
}

function getChain(sessionId: string): ReasoningChain | undefined {
  return chains.get(sessionId);
}

function clearChain(sessionId: string) {
  chains.delete(sessionId);
}

let config: MultiHopConfig;
let ctx: any;

// ============================================================
// 扩展主逻辑
// ============================================================

export default function (pi: ExtensionAPI) {
  config = { ...DEFAULT_CONFIG };
  ctx = pi; // 简化：实际应使用闭包传入

  console.log("[MultiHop] 多跳推理追踪扩展已加载");
  console.log(`[MultiHop] 最大跳数: ${config.maxHops}`);
  console.log(`[MultiHop] 警告跳数: ${config.warnHops}`);
  console.log(`[MultiHop] 日志文件: ${config.logFile}`);

  // ============================================================
  // 监听 LLM 调用
  // ============================================================

  pi.on("before_agent", async (event, ctx) => {
    const sessionId = ctx.sessionId || "default";
    startChain(sessionId);
    toolCallCounts.set(sessionId, 0);
  });

  // ============================================================
  // 追踪工具调用
  // ============================================================

  pi.on("tool_call", async (event, ctx) => {
    const sessionId = ctx.sessionId || "default";
    const step: ReasoningStep = {
      hop: (chains.get(sessionId)?.steps.length || 0) + 1,
      timestamp: Date.now(),
      toolName: event.toolName,
      args: event.input,
    };

    addStep(sessionId, step);

    // 计数
    const count = toolCallCounts.get(sessionId) || 0;
    toolCallCounts.set(sessionId, count + 1);

    // 警告
    if (step.hop === config.warnHops) {
      ctx.ui.notify(
        `⚠️ [MultiHop] 已完成 ${config.warnHops} 跳推理\n\n` +
          `LLM 已调用 ${count + 1} 次工具\n` +
          `如不需要继续，可直接告诉 AI 停止`,
        "warning"
      );
    }

    // 强制中断
    if (step.hop > config.maxHops) {
      ctx.ui.notify(
        `🚫 [MultiHop] 超过最大跳数 (${config.maxHops})\n\n` +
          `为防止无限循环，已中断本次推理\n` +
          `请明确告诉 AI 你想要的结果`,
        "error"
      );
      event.preventDefault?.();
      return { allowed: false };
    }
  });

  // ============================================================
  // 追踪工具结果
  // ============================================================

  pi.on("tool_result", async (event, ctx) => {
    const sessionId = ctx.sessionId || "default";
    const chain = chains.get(sessionId);
    if (!chain) return;

    const lastStep = chain.steps[chain.steps.length - 1];
    if (lastStep && lastStep.toolName === event.toolName && !lastStep.result) {
      lastStep.result = event.result;
      lastStep.duration = Date.now() - lastStep.timestamp;

      // 记录到日志
      try {
        fs.mkdirSync(path.dirname(config.logFile), { recursive: true });
        const logEntry = JSON.stringify({
          sessionId,
          hop: lastStep.hop,
          tool: lastStep.toolName,
          args: lastStep.args,
          duration: lastStep.duration,
          timestamp: lastStep.timestamp,
        }) + "\n";
        fs.appendFileSync(config.logFile, logEntry, "utf-8");
      } catch {}
    }
  });

  // ============================================================
  // 命令
  // ============================================================

  // 查看推理链
  pi.registerCommand({
    name: "trace",
    description: "显示当前的多跳推理链",
    async execute(ctx) {
      const sessionId = ctx.sessionId || "default";
      const chain = chains.get(sessionId);

      if (!chain || chain.steps.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "ℹ️ 当前会话没有推理记录",
            },
          ],
        };
      }

      let message = `🔗 多跳推理链\n\n`;
      message += `会话 ID: ${chain.sessionId}\n`;
      message += `开始时间: ${new Date(chain.startTime).toLocaleString()}\n`;
      message += `总跳数: ${chain.steps.length}\n`;
      message += `最大耗时: ${Math.max(...chain.steps.map((s) => s.duration || 0))}ms\n`;
      message += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

      for (const step of chain.steps) {
        const duration = step.duration ? `${step.duration}ms` : "进行中";
        const argsPreview = JSON.stringify(step.args).substring(0, 50);
        message += `跳 ${step.hop}: ${step.toolName}\n`;
        message += `  参数: ${argsPreview}${argsPreview.length >= 50 ? "..." : ""}\n`;
        message += `  耗时: ${duration}\n`;
        message += `  结果: ${step.result ? "✓" : step.error ? "✗" : "⏳"}\n\n`;
      }

      return { content: [{ type: "text", text: message }] };
    },
  });

  // 推理统计
  pi.registerCommand({
    name: "trace-stats",
    description: "查看推理统计信息",
    async execute(ctx) {
      const sessionId = ctx.sessionId || "default";
      const chain = chains.get(sessionId);

      if (!chain) {
        return {
          content: [
            {
              type: "text",
              text: "ℹ️ 当前会话没有推理记录",
            },
          ],
        };
      }

      // 统计
      const toolUsage = new Map<string, number>();
      let totalDuration = 0;
      let successCount = 0;
      let errorCount = 0;

      for (const step of chain.steps) {
        toolUsage.set(step.toolName, (toolUsage.get(step.toolName) || 0) + 1);
        if (step.duration) totalDuration += step.duration;
        if (step.error) errorCount++;
        else if (step.result) successCount++;
      }

      let message = `📊 推理统计\n\n`;
      message += `总跳数: ${chain.steps.length}\n`;
      message += `成功步骤: ${successCount}\n`;
      message += `失败步骤: ${errorCount}\n`;
      message += `总耗时: ${totalDuration}ms\n`;
      message += `平均耗时: ${chain.steps.length > 0 ? Math.round(totalDuration / chain.steps.length) : 0}ms\n\n`;
      message += `工具使用统计:\n`;

      for (const [tool, count] of toolUsage) {
        message += `  ${tool}: ${count} 次\n`;
      }

      return { content: [{ type: "text", text: message }] };
    },
  });

  // 清除推理历史
  pi.registerCommand({
    name: "trace-clear",
    description: "清除当前会话的推理历史",
    async execute(ctx) {
      const sessionId = ctx.sessionId || "default";
      clearChain(sessionId);
      toolCallCounts.delete(sessionId);
      return {
        content: [
          {
            type: "text",
            text: `✅ 已清除会话 ${sessionId} 的推理历史`,
          },
        ],
      };
    },
  });

  // 导出推理日志
  pi.registerCommand({
    name: "trace-export",
    description: "导出推理日志到 JSON 文件",
    async execute(ctx) {
      const sessionId = ctx.sessionId || "default";
      const chain = chains.get(sessionId);

      if (!chain) {
        return {
          content: [
            {
              type: "text",
              text: "ℹ️ 没有可导出的推理记录",
            },
          ],
        };
      }

      const exportFile = path.join(
        os.homedir(),
        ".pi",
        "agent",
        "logs",
        `trace-${sessionId}-${Date.now()}.json`
      );

      try {
        fs.mkdirSync(path.dirname(exportFile), { recursive: true });
        fs.writeFileSync(
          exportFile,
          JSON.stringify(chain, null, 2),
          "utf-8"
        );

        return {
          content: [
            {
              type: "text",
              text: `✅ 推理日志已导出到: ${exportFile}\n\n总跳数: ${chain.steps.length}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `❌ 导出失败: ${err}`,
            },
          ],
        };
      }
    },
  });
}
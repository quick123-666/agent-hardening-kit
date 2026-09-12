/**
 * Pi Multi-Hop Reasoning Extension (多跳推理追踪)
 *
 * 功能：
 * 1. 自动追踪 LLM 的多步推理过程
 * 2. 记录每一步的工具调用和结果
 * 3. 可视化推理链
 * 4. 支持中断/恢复
 * 5. 检测死循环
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
  maxHops: number;
  warnHops: number;
  repeatWindow: number;
  logFile: string;
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
let config: MultiHopConfig;

// ============================================================
// 核心逻辑
// ============================================================

function startChain(sessionId: string): ReasoningChain {
  const chain: ReasoningChain = { sessionId, startTime: Date.now(), steps: [] };
  chains.set(sessionId, chain);
  return chain;
}

function addStep(sessionId: string, step: ReasoningStep, ctx: any) {
  let chain = chains.get(sessionId);
  if (!chain) chain = startChain(sessionId);
  chain.steps.push(step);

  if (chain.steps.length >= config.repeatWindow) {
    const recent = chain.steps.slice(-config.repeatWindow);
    const signatures = recent.map((s) => `${s.toolName}:${JSON.stringify(s.args)}`);
    const allSame = signatures.every((s) => s === signatures[0]);
    if (allSame) {
      ctx.ui?.notify(`🔄 [MultiHop] 检测到可能的死循环\n\n连续 ${config.repeatWindow} 次调用相同工具\n建议：明确告诉 AI 你想要的结果`, "warning");
    }
  }
}

function getChain(sessionId: string): ReasoningChain | undefined {
  return chains.get(sessionId);
}

function clearChain(sessionId: string) {
  chains.delete(sessionId);
  toolCallCounts.delete(sessionId);
}

// ============================================================
// 扩展主逻辑
// ============================================================

export default function (pi: ExtensionAPI) {
  config = { ...DEFAULT_CONFIG };

  console.log("[MultiHop] 多跳推理追踪扩展已加载");
  console.log(`[MultiHop] 最大跳数: ${config.maxHops}, 警告跳数: ${config.warnHops}`);

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

    addStep(sessionId, step, ctx);

    const count = (toolCallCounts.get(sessionId) || 0) + 1;
    toolCallCounts.set(sessionId, count);

    if (step.hop === config.warnHops) {
      ctx.ui.notify(`⚠️ [MultiHop] 已完成 ${config.warnHops} 跳推理\n\nLLM 已调用 ${count} 次工具\n如不需要继续，可直接告诉 AI 停止`, "warning");
    }

    if (step.hop > config.maxHops) {
      ctx.ui.notify(`🚫 [MultiHop] 超过最大跳数 (${config.maxHops})\n\n为防止无限循环，已中断本次推理\n请明确告诉 AI 你想要的结果`, "error");
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

      try {
        fs.mkdirSync(path.dirname(config.logFile), { recursive: true });
        const logEntry = JSON.stringify({
          sessionId, hop: lastStep.hop, tool: lastStep.toolName,
          args: lastStep.args, duration: lastStep.duration, timestamp: lastStep.timestamp,
        }) + "\n";
        fs.appendFileSync(config.logFile, logEntry, "utf-8");
      } catch {}
    }
  });

  // ============================================================
  // 命令
  // ============================================================

  pi.registerCommand("trace", {
    description: "显示当前的多跳推理链",
    handler: async (_args, ctx) => {
      const sessionId = ctx.sessionId || "default";
      const chain = chains.get(sessionId);

      if (!chain || chain.steps.length === 0) {
        ctx.ui.notify("ℹ️ 当前会话没有推理记录", "info");
        return;
      }

      let message = `🔗 多跳推理链\n\n`;
      message += `会话 ID: ${chain.sessionId}\n`;
      message += `开始时间: ${new Date(chain.startTime).toLocaleString()}\n`;
      message += `总跳数: ${chain.steps.length}\n`;
      message += `最大耗时: ${Math.max(...chain.steps.map((s) => s.duration || 0))}ms\n\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      for (const step of chain.steps) {
        const duration = step.duration ? `${step.duration}ms` : "进行中";
        const argsPreview = JSON.stringify(step.args).substring(0, 50);
        message += `跳 ${step.hop}: ${step.toolName}\n`;
        message += `  参数: ${argsPreview}${argsPreview.length >= 50 ? "..." : ""}\n`;
        message += `  耗时: ${duration}\n`;
        message += `  结果: ${step.result ? "✓" : step.error ? "✗" : "⏳"}\n\n`;
      }

      ctx.ui.notify(message, "info");
    },
  });

  pi.registerCommand("trace-stats", {
    description: "查看推理统计信息",
    handler: async (_args, ctx) => {
      const sessionId = ctx.sessionId || "default";
      const chain = chains.get(sessionId);

      if (!chain) {
        ctx.ui.notify("ℹ️ 当前会话没有推理记录", "info");
        return;
      }

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

      ctx.ui.notify(message, "info");
    },
  });

  pi.registerCommand("trace-clear", {
    description: "清除当前会话的推理历史",
    handler: async (_args, ctx) => {
      const sessionId = ctx.sessionId || "default";
      clearChain(sessionId);
      ctx.ui.notify(`✅ 已清除会话 ${sessionId} 的推理历史`, "info");
    },
  });

  pi.registerCommand("trace-export", {
    description: "导出推理日志到 JSON 文件",
    handler: async (_args, ctx) => {
      const sessionId = ctx.sessionId || "default";
      const chain = chains.get(sessionId);

      if (!chain) {
        ctx.ui.notify("ℹ️ 没有可导出的推理记录", "info");
        return;
      }

      const exportFile = path.join(os.homedir(), ".pi", "agent", "logs", `trace-${sessionId}-${Date.now()}.json`);

      try {
        fs.mkdirSync(path.dirname(exportFile), { recursive: true });
        fs.writeFileSync(exportFile, JSON.stringify(chain, null, 2), "utf-8");
        ctx.ui.notify(`✅ 推理日志已导出到: ${exportFile}\n\n总跳数: ${chain.steps.length}`, "info");
      } catch (err) {
        ctx.ui.notify(`❌ 导出失败: ${err}`, "error");
      }
    },
  });
}

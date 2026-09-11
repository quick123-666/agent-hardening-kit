/**
 * Pi Multi-Hop Subagent Collaboration Extension
 *
 * 实现 Multi-Agent 协作完成复杂的多跳推理任务
 *
 * 功能：
 * 1. 派生子代理（subagent）处理子任务
 * 2. 主代理协调多个子代理
 * 3. 结果合并与综合
 * 4. 并行执行加速
 *
 * 使用方法：
 *   pi -e ~/.pi/agent/extensions/pi-multihop-subagent.ts
 *
 * 命令：
 *   /spawn-subagent <task>     - 派生子代理
 *   /spawn-parallel <tasks...> - 并行派发多个子代理
 *   /collect-results           - 收集子代理结果
 *   /subagent-status           - 查看子代理状态
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ============================================================
// 配置
// ============================================================

const SUBAGENT_DIR = path.join(os.homedir(), ".pi", "agent", "subagents");

// ============================================================
// 类型
// ============================================================

interface SubagentTask {
  id: string;
  parentSessionId: string;
  task: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: string;
  startTime?: number;
  endTime?: number;
  workerId?: string;
}

interface SubagentResult {
  id: string;
  task: string;
  result: string;
  duration: number;
  success: boolean;
}

// ============================================================
// 状态管理
// ============================================================

const tasks = new Map<string, SubagentTask>();
const results = new Map<string, SubagentResult>();

function generateId(): string {
  return `sub-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

function ensureSubagentDir() {
  if (!fs.existsSync(SUBAGENT_DIR)) {
    fs.mkdirSync(SUBAGENT_DIR, { recursive: true });
  }
}

function saveTask(task: SubagentTask) {
  ensureSubagentDir();
  const file = path.join(SUBAGENT_DIR, `${task.id}.json`);
  fs.writeFileSync(file, JSON.stringify(task, null, 2), "utf-8");
}

function loadAllTasks(): SubagentTask[] {
  ensureSubagentDir();
  const files = fs.readdirSync(SUBAGENT_DIR).filter((f) => f.endsWith(".json"));
  const taskList: SubagentTask[] = [];
  for (const f of files) {
    try {
      const content = fs.readFileSync(path.join(SUBAGENT_DIR, f), "utf-8");
      taskList.push(JSON.parse(content));
    } catch {}
  }
  return taskList;
}

// ============================================================
// 核心逻辑
// ============================================================

async function executeSubagentTask(
  pi: ExtensionAPI,
  task: string,
  ctx: any
): Promise<SubagentResult> {
  const id = generateId();
  const startTime = Date.now();

  // 创建子代理任务
  const subTask: SubagentTask = {
    id,
    parentSessionId: ctx.sessionId || "default",
    task,
    status: "running",
    startTime,
  };
  tasks.set(id, subTask);
  saveTask(subTask);

  try {
    // 模拟子代理执行（实际可以调用 LLM）
    // 在真实实现中，这里应该启动一个新的 Pi session 处理这个任务
    //
    // 例如：
    // const subCtx = await pi.createSubSession({
    //   task: task,
    //   parent: ctx.sessionId,
    // });
    //
    // const result = await subCtx.run();

    // 占位实现 - 真实场景中替换为实际子代理调用
    const result = `[子代理 ${id}] 已完成任务: ${task}\n\n执行时间: ${Date.now() - startTime}ms\n\n（这是模拟结果，实际使用需要接入 Pi 的子会话 API）`;

    subTask.status = "completed";
    subTask.result = result;
    subTask.endTime = Date.now();
    saveTask(subTask);

    const subResult: SubagentResult = {
      id,
      task,
      result,
      duration: subTask.endTime - startTime,
      success: true,
    };
    results.set(id, subResult);

    return subResult;
  } catch (err) {
    subTask.status = "failed";
    subTask.endTime = Date.now();
    subTask.result = `Error: ${err}`;
    saveTask(subTask);

    return {
      id,
      task,
      result: `Error: ${err}`,
      duration: Date.now() - startTime,
      success: false,
    };
  }
}

// ============================================================
// 扩展主逻辑
// ============================================================

export default function (pi: ExtensionAPI) {
  console.log("[MultiHop-SubAgent] 子代理协作扩展已加载");
  console.log(`[MultiHop-SubAgent] 任务目录: ${SUBAGENT_DIR}`);

  // ============================================================
  // 派生子代理
  // ============================================================

  pi.registerCommand({
    name: "spawn-subagent",
    description: "派生子代理处理子任务",
    async execute(ctx) {
      const args = ctx.args || [];
      if (args.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "❌ 请提供任务描述\n\n用法: /spawn-subagent <任务>",
            },
          ],
        };
      }

      const task = args.join(" ");
      const result = await executeSubagentTask(pi, task, ctx);

      return {
        content: [
          {
            type: "text",
            text: result.success
              ? `✅ 子代理完成任务\n\n` +
                  `任务: ${task}\n` +
                  `结果: ${result.result}\n` +
                  `耗时: ${result.duration}ms`
              : `❌ 子代理失败\n\n${result.result}`,
          },
        ],
      };
    },
  });

  // ============================================================
  // 并行派发
  // ============================================================

  pi.registerCommand({
    name: "spawn-parallel",
    description: "并行派发多个子代理任务",
    async execute(ctx) {
      const args = ctx.args || [];

      if (args.length === 0) {
        return {
          content: [
            {
              type: "text",
              text:
                "❌ 请提供多个任务\n\n" +
                "用法: /spawn-parallel <任务1> || <任务2> || <任务3>\n\n" +
                "用 || 分隔不同任务",
            },
          ],
        };
      }

      const query = args.join(" ");
      const taskList = query.split("||").map((t) => t.trim()).filter((t) => t.length > 0);

      if (taskList.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "❌ 没有有效任务",
            },
          ],
        };
      }

      // 并行执行
      const promises = taskList.map((task) => executeSubagentTask(pi, task, ctx));
      const results = await Promise.all(promises);

      let message = `✅ 并行执行 ${results.length} 个任务完成\n\n`;

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const icon = r.success ? "✅" : "❌";
        message += `${icon} [${i + 1}] ${r.task}\n`;
        message += `   耗时: ${r.duration}ms\n`;
        message += `   结果: ${r.result.substring(0, 100)}${r.result.length > 100 ? "..." : ""}\n\n`;
      }

      return { content: [{ type: "text", text: message }] };
    },
  });

  // ============================================================
  // 查看子代理状态
  // ============================================================

  pi.registerCommand({
    name: "subagent-status",
    description: "查看子代理状态",
    async execute(ctx) {
      const sessionId = ctx.sessionId || "default";
      const allTasks = loadAllTasks();
      const sessionTasks = allTasks.filter((t) => t.parentSessionId === sessionId);

      if (sessionTasks.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "ℹ️ 当前会话还没有派生子代理",
            },
          ],
        };
      }

      const byStatus = {
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
      };

      for (const t of sessionTasks) {
        byStatus[t.status]++;
      }

      let message = `🤖 子代理状态\n\n`;
      message += `总任务: ${sessionTasks.length}\n`;
      message += `  ⏳ 等待中: ${byStatus.pending}\n`;
      message += `  🔄 运行中: ${byStatus.running}\n`;
      message += `  ✅ 已完成: ${byStatus.completed}\n`;
      message += `  ❌ 失败: ${byStatus.failed}\n\n`;

      // 显示最近 5 个
      const recent = sessionTasks.slice(0, 5);
      message += `最近 ${recent.length} 个任务:\n\n`;

      for (const t of recent) {
        const duration = t.endTime ? `${t.endTime - t.startTime}ms` : "进行中";
        message += `• ${t.id}\n`;
        message += `  任务: ${t.task.substring(0, 60)}\n`;
        message += `  状态: ${t.status} | 耗时: ${duration}\n\n`;
      }

      return { content: [{ type: "text", text: message }] };
    },
  });

  // ============================================================
  // 协调器 - Multi-Agent 编排
  // ============================================================

  pi.registerCommand({
    name: "orchestrate",
    description: "编排多个子代理完成复杂任务",
    async execute(ctx) {
      const args = ctx.args || [];
      if (args.length === 0) {
        return {
          content: [
            {
              type: "text",
              text:
                "❌ 请提供主任务\n\n" +
                "用法: /orchestrate <主任务>\n\n" +
                "系统会自动分解为子任务并协调子代理",
            },
          ],
        };
      }

      const mainTask = args.join(" ");

      // 任务分解（简化版）
      const subtasks = decomposeTask(mainTask);

      ctx.ui.notify(
        `🎭 [Orchestrator] 分解为 ${subtasks.length} 个子任务，开始协调执行`,
        "info"
      );

      // 并行执行子任务
      const subResults = await Promise.all(
        subtasks.map((task) => executeSubagentTask(pi, task, ctx))
      );

      // 综合结果
      const synthesis = synthesizeResults(mainTask, subResults);

      return {
        content: [
          {
            type: "text",
            text: synthesis,
          },
        ],
      };
    },
  });

  // ============================================================
  // 注册子代理工具（供 LLM 使用）
  // ============================================================

  pi.registerTool({
    name: "spawn_subagent",
    description: "派生子代理处理子任务",
    parameters: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "要子代理完成的任务描述",
        },
      },
      required: ["task"],
    },
    async execute(args: { task: string }, ctx) {
      const result = await executeSubagentTask(pi, args.task, ctx);
      return {
        content: [
          {
            type: "text",
            text: result.success
              ? `子代理完成: ${result.result}`
              : `子代理失败: ${result.result}`,
          },
        ],
      };
    },
  });

  pi.registerTool({
    name: "spawn_parallel_subagents",
    description: "并行派发多个子代理",
    parameters: {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          items: { type: "string" },
          description: "多个任务描述",
        },
      },
      required: ["tasks"],
    },
    async execute(args: { tasks: string[] }, ctx) {
      const promises = args.tasks.map((task) =>
        executeSubagentTask(pi, task, ctx)
      );
      const results = await Promise.all(promises);

      const summary = results
        .map(
          (r, i) =>
            `[${i + 1}] ${r.success ? "✅" : "❌"} ${r.task}\n   → ${r.result.substring(0, 200)}`
        )
        .join("\n\n");

      return {
        content: [
          {
            type: "text",
            text: `并行执行 ${results.length} 个子代理完成:\n\n${summary}`,
          },
        ],
      };
    },
  });
}

// ============================================================
// 任务分解（简化实现）
// ============================================================

function decomposeTask(mainTask: string): string[] {
  // 实际实现中可以用 LLM 分解任务
  // 这里提供简单的模式匹配
  const subtasks: string[] = [];

  // 模式 1: "分析 X 和 Y"
  if (mainTask.includes("和") || mainTask.includes("与")) {
    const parts = mainTask.split(/[和与]/);
    for (const part of parts) {
      if (part.trim().length > 0) {
        subtasks.push(`分析: ${part.trim()}`);
      }
    }
  }

  // 模式 2: "研究 X"
  if (mainTask.includes("研究")) {
    subtasks.push(`收集资料: ${mainTask.replace("研究", "").trim()}`);
    subtasks.push(`总结发现: ${mainTask.replace("研究", "").trim()}`);
  }

  // 默认：单任务
  if (subtasks.length === 0) {
    subtasks.push(mainTask);
  }

  return subtasks;
}

function synthesizeResults(mainTask: string, results: SubagentResult[]): string {
  let synthesis = `🎭 协调执行结果\n\n`;
  synthesis += `主任务: ${mainTask}\n`;
  synthesis += `子任务数: ${results.length}\n`;
  synthesis += `成功率: ${results.filter((r) => r.success).length}/${results.length}\n\n`;

  synthesis += `━━━ 各子代理结果 ━━━\n\n`;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    synthesis += `[${i + 1}] ${r.task}\n`;
    synthesis += `    ${r.result}\n\n`;
  }

  synthesis += `━━━ 综合结论 ━━━\n\n`;
  synthesis += `根据 ${results.length} 个子代理的并行分析，`;
  synthesis += `已完成对"${mainTask}"的协调处理。\n`;
  synthesis += `总计耗时: ${Math.max(...results.map((r) => r.duration))}ms`;

  return synthesis;
}
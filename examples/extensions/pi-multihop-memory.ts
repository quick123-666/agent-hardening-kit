/**
 * Pi Multi-Hop + Memory Integration Extension
 *
 * 自动将多跳推理结果保存到长期记忆，让未来的会话可以复用
 *
 * 功能：
 * 1. 自动保存推理链到长期记忆
 * 2. 标记重要推理为 #decision 或 #preference
 * 3. 跨会话检索历史推理
 * 4. 推理失败时保存错误案例
 *
 * 使用方法：
 *   pi -e ~/.pi/agent/extensions/pi-multihop-memory.ts
 *
 * 命令：
 *   /reasoning-save [tags...]   - 保存当前推理链到记忆
 *   /reasoning-recall <query>  - 从记忆中检索相关推理
 *   /reasoning-list            - 列出最近的推理记录
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ============================================================
// 共享状态（与 pi-multihop-reasoning.ts 配合）
// ============================================================

const REASONING_STATE_FILE = path.join(
  os.homedir(),
  ".pi",
  "agent",
  "state",
  "multihop-state.json"
);

// 读取其他扩展的状态
function loadReasoningState(): any {
  try {
    if (fs.existsSync(REASONING_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(REASONING_STATE_FILE, "utf-8"));
    }
  } catch {}
  return { chains: {} };
}

function saveReasoningState(state: any) {
  try {
    fs.mkdirSync(path.dirname(REASONING_STATE_FILE), { recursive: true });
    fs.writeFileSync(REASONING_STATE_FILE, JSON.stringify(state, null, 2));
  } catch {}
}

// ============================================================
// 记忆存储
// ============================================================

interface ReasoningRecord {
  id: string;
  timestamp: number;
  sessionId: string;
  query: string;
  steps: any[];
  conclusion: string;
  tags: string[];
  duration: number;
  success: boolean;
}

const MEMORY_DIR = path.join(os.homedir(), ".pi", "agent", "memory", "reasoning");

function ensureMemoryDir() {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

function generateId(): string {
  return `reasoning-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

function saveReasoning(record: ReasoningRecord) {
  ensureMemoryDir();
  const file = path.join(MEMORY_DIR, `${record.id}.json`);
  fs.writeFileSync(file, JSON.stringify(record, null, 2), "utf-8");
  return file;
}

function loadAllReasonings(): ReasoningRecord[] {
  ensureMemoryDir();
  const files = fs.readdirSync(MEMORY_DIR).filter((f) => f.endsWith(".json"));
  const records: ReasoningRecord[] = [];

  for (const f of files) {
    try {
      const content = fs.readFileSync(path.join(MEMORY_DIR, f), "utf-8");
      records.push(JSON.parse(content));
    } catch {}
  }

  return records.sort((a, b) => b.timestamp - a.timestamp);
}

function searchReasonings(query: string, limit = 5): ReasoningRecord[] {
  const records = loadAllReasonings();
  const lowerQuery = query.toLowerCase();

  // 简单的关键词匹配（可以替换为向量搜索）
  const scored = records.map((r) => {
    let score = 0;
    const text = `${r.query} ${r.conclusion} ${r.tags.join(" ")}`.toLowerCase();
    const words = lowerQuery.split(/\s+/).filter((w) => w.length > 0);

    for (const word of words) {
      if (text.includes(word)) score += 1;
    }

    // 标签完全匹配加分
    for (const tag of r.tags) {
      if (lowerQuery.includes(tag.toLowerCase())) score += 2;
    }

    return { record: r, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.record);
}

// ============================================================
// 扩展主逻辑
// ============================================================

export default function (pi: ExtensionAPI) {
  console.log("[MultiHop+Memory] 多跳推理 + 长期记忆扩展已加载");
  console.log(`[MultiHop+Memory] 记忆目录: ${MEMORY_DIR}`);

  // ============================================================
  // 保存推理到记忆
  // ============================================================

  pi.registerCommand({
    name: "reasoning-save",
    description: "保存当前推理链到长期记忆",
    async execute(ctx) {
      const args = ctx.args || [];
      const tags = args.length > 0 ? args : ["reasoning"];

      // 加载共享状态
      const state = loadReasoningState();
      const sessionId = ctx.sessionId || "default";
      const chain = state.chains[sessionId];

      if (!chain || !chain.steps || chain.steps.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "ℹ️ 当前会话没有推理记录可保存\n\n请先进行一些工具调用再保存",
            },
          ],
        };
      }

      // 构造记录
      const record: ReasoningRecord = {
        id: generateId(),
        timestamp: Date.now(),
        sessionId,
        query: chain.query || "(未捕获查询)",
        steps: chain.steps,
        conclusion: chain.finalAnswer || "(推理中)",
        tags,
        duration: chain.duration || 0,
        success: chain.success !== false,
      };

      const file = saveReasoning(record);

      return {
        content: [
          {
            type: "text",
            text: `✅ 推理已保存到长期记忆\n\n` +
              `ID: ${record.id}\n` +
              `标签: ${tags.join(", ")}\n` +
              `跳数: ${chain.steps.length}\n` +
              `文件: ${file}`,
          },
        ],
      };
    },
  });

  // ============================================================
  // 从记忆检索推理
  // ============================================================

  pi.registerCommand({
    name: "reasoning-recall",
    description: "从长期记忆中检索相关推理",
    async execute(ctx) {
      const args = ctx.args || [];
      if (args.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "❌ 请提供查询关键词\n\n用法: /reasoning-recall <关键词>",
            },
          ],
        };
      }

      const query = args.join(" ");
      const results = searchReasonings(query);

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `ℹ️ 没有找到关于 "${query}" 的推理记录`,
            },
          ],
        };
      }

      let message = `🔍 找到 ${results.length} 条相关推理\n\n`;

      for (const r of results) {
        const date = new Date(r.timestamp).toLocaleString();
        message += `━━━ ${r.id} ━━━\n`;
        message += `时间: ${date}\n`;
        message += `查询: ${r.query.substring(0, 80)}\n`;
        message += `标签: ${r.tags.join(", ")}\n`;
        message += `跳数: ${r.steps.length}\n`;
        message += `结论: ${r.conclusion.substring(0, 100)}${r.conclusion.length > 100 ? "..." : ""}\n\n`;
      }

      return { content: [{ type: "text", text: message }] };
    },
  });

  // ============================================================
  // 列出最近推理
  // ============================================================

  pi.registerCommand({
    name: "reasoning-list",
    description: "列出最近的推理记录",
    async execute(ctx) {
      const records = loadAllReasonings().slice(0, 10);

      if (records.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "ℹ️ 还没有保存任何推理记录",
            },
          ],
        };
      }

      let message = `📚 最近的 ${records.length} 条推理\n\n`;

      for (const r of records) {
        const date = new Date(r.timestamp).toLocaleString();
        message += `• [${date}] ${r.query.substring(0, 60)}\n`;
        message += `  ID: ${r.id} | 标签: ${r.tags.join(", ")} | 跳数: ${r.steps.length}\n\n`;
      }

      message += `\n使用 /reasoning-recall <关键词> 检索特定推理`;

      return { content: [{ type: "text", text: message }] };
    },
  });

  // ============================================================
  // 自动保存重要推理
  // ============================================================

  // 监听工具调用，当调用数达到阈值时自动提示保存
  const toolCallCounts = new Map<string, number>();

  pi.on("tool_call", async (event, ctx) => {
    const sessionId = ctx.sessionId || "default";
    const count = (toolCallCounts.get(sessionId) || 0) + 1;
    toolCallCounts.set(sessionId, count);

    // 每 10 次工具调用提醒一次
    if (count % 10 === 0) {
      ctx.ui.notify(
        `📝 [MultiHop+Memory] 已完成 ${count} 跳推理\n\n` +
          `使用 /reasoning-save [标签] 保存到长期记忆`,
        "info"
      );
    }
  });

  // ============================================================
  // 清理
  // ============================================================

  pi.on("session_shutdown", async () => {
    toolCallCounts.clear();
  });
}
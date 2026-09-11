/**
 * Pi Mechanism Verify Extension (元约束 - 先验证机制)
 *
 * 强制 Spike-First 工作流：
 * 在使用任何第三方库/工具/数据库之前，先做机制验证（spike），
 * 验证关键假设（如状态管理、资源锁定、并发行为）。
 *
 * 功能：
 * 1. 风险模式检测（Milvus Lite、并发、文件锁、嵌入式 DB 等）
 * 2. 已验证机制跟踪（持久化到 JSON）
 * 3. 生成 spike 验证脚本
 * 4. 在 LLM 调用前温和提醒（不强制拦截）
 *
 * 命令：
 *   /spike <topic>          - 生成 spike 验证脚本
 *   /verify <topic> [risk]  - 标记机制已验证
 *   /mechanism-status       - 查看已验证清单
 *   /mechanism-clear        - 清除验证记录
 *
 * 设计原则：
 *   - 不强制拦截，只提醒（避免影响正常使用）
 *   - 提供工具但不强制使用
 *   - 让用户主动选择
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@earendil-works/pi-ai";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ============================================================
// 风险模式定义
// ============================================================

interface RiskPattern {
  id: string;
  category: string;
  pattern: RegExp;
  reason: string;
  spikeHint: string;
  spikeTemplate: string;
}

const RISK_PATTERNS: RiskPattern[] = [
  {
    id: "milvus-lite",
    category: "向量数据库 (Milvus Lite)",
    pattern: /MilvusClient|create_collection|drop_collection|load_collection|pymilvus/,
    reason: "Milvus Lite collection 在创建/插入后会 release 状态，查询/统计前必须 load_collection()",
    spikeHint: "create → insert → query 的完整生命周期，特别是跨连接的 state 转换",
    spikeTemplate: `import sys, os
sys.stdout.reconfigure(encoding='utf-8')
os.environ['QDRANT_FASTEMBED_CACHE_PATH'] = r'C:\\Users\\Administrator\\.cache\\qdrant'

from pymilvus import MilvusClient

# 测试 1: 单连接生命周期
client1 = MilvusClient(uri='./spike.db')
client1.create_collection('test', dimension=512)
# ⚠️ 此时状态是 released
try:
    stats = client1.get_collection_stats('test')  # 可能报错
    print('Test 1 [no load]: OK', stats)
except Exception as e:
    print('Test 1 [no load]: FAIL -', e)

# 测试 2: load 后可用
client1.load_collection('test')
stats = client1.get_collection_stats('test')
print('Test 2 [with load]: OK', stats)

# 测试 3: 新连接需要重新 load
client2 = MilvusClient(uri='./spike.db')
try:
    stats = client2.get_collection_stats('test')  # 新连接，可能需要重新 load
    print('Test 3 [new conn]: OK')
except Exception as e:
    print('Test 3 [new conn]: FAIL -', e)
    client2.load_collection('test')
    stats = client2.get_collection_stats('test')
    print('Test 3 [after reload]: OK')
`,
  },
  {
    id: "concurrent-threads",
    category: "并发/线程安全",
    pattern: /ThreadPoolExecutor|multiprocess|asyncio\.create_task|concurrent\.futures|threading\.Thread/,
    reason: "并发场景下资源锁定、连接状态共享、异常传播容易出错",
    spikeHint: "每个 worker 的连接生命周期、锁的获取/释放、异常处理、资源清理",
    spikeTemplate: `import sys, time
sys.stdout.reconfigure(encoding='utf-8')
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# 测试 1: 每个线程独立资源
def worker(i):
    # 关键假设: 每个线程是否需要独立的连接？
    # 验证方法: 在线程内创建新资源
    return f"worker-{i} done"

with ThreadPoolExecutor(max_workers=4) as ex:
    futures = [ex.submit(worker, i) for i in range(8)]
    for f in as_completed(futures):
        print(f.result())

# 测试 2: 共享资源加锁
shared_counter = 0
lock = threading.Lock()

def increment():
    global shared_counter
    with lock:
        temp = shared_counter
        time.sleep(0.001)
        shared_counter = temp + 1

with ThreadPoolExecutor(max_workers=4) as ex:
    list(ex.map(lambda _: increment(), range(100)))

print(f"Final counter: {shared_counter} (expect 100)")
assert shared_counter == 100, "Race condition!"
print('Concurrency spike: PASS')
`,
  },
  {
    id: "file-lock",
    category: "文件/资源锁",
    pattern: /msvcrt\.|fcntl\.|flock\(|FileLock|exclusive.*lock/,
    reason: "文件锁行为跨平台差异大（Windows/Linux/macOS）",
    spikeHint: "锁的获取/释放、超时机制、跨进程行为、平台差异",
    spikeTemplate: `import sys, os, time, threading
sys.stdout.reconfigure(encoding='utf-8')

# Windows 文件锁测试
lock_file = './spike.lock'
if os.path.exists(lock_file):
    os.unlink(lock_file)

# 创建锁文件
with open(lock_file, 'w') as f:
    f.write('locked')

def try_lock():
    try:
        import msvcrt
        with open(lock_file, 'r+') as f:
            try:
                msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
                print(f'Thread {threading.current_thread().name}: Got lock')
                time.sleep(0.5)
                msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, 1)
                print(f'Thread {threading.current_thread().name}: Released')
                return True
            except OSError:
                print(f'Thread {threading.current_thread().name}: LOCKED by others')
                return False
    except ImportError:
        # 非 Windows
        return None

# 多线程竞争锁
threads = [threading.Thread(target=try_lock) for _ in range(3)]
for t in threads: t.start()
for t in threads: t.join()

os.unlink(lock_file)
print('File lock spike: PASS')
`,
  },
  {
    id: "embedded-db",
    category: "嵌入式数据库",
    pattern: /(?:SQLite|Milvus\.Lite|leveldb|rocksdb|berkeley)/i,
    reason: "嵌入式数据库行为可能与 Server 版本不同（锁定、并发、关闭）",
    spikeHint: "启动/连接/并发访问/正常关闭/异常关闭 后的数据完整性",
    spikeTemplate: `import sys, os, time
sys.stdout.reconfigure(encoding='utf-8')

# 测试嵌入式 DB 的关键行为
db_path = './spike_embedded.db'
if os.path.exists(db_path):
    os.unlink(db_path)

# Test 1: 启动并写入
# Test 2: 关闭后重连数据是否保留
# Test 3: 并发访问是否锁
# Test 4: 异常关闭后能否恢复

print('Embedded DB spike: TODO - 根据具体 DB 实现')
`,
  },
  {
    id: "embedding-model",
    category: "Embedding 模型",
    pattern: /fastembed|sentence.transformers|text.embedding.ada|TextEmbedding\(/,
    reason: "Embedding 模型首次运行需下载，离线场景会失败",
    spikeHint: "模型缓存路径、下载行为、降级方案",
    spikeTemplate: `import sys, os
sys.stdout.reconfigure(encoding='utf-8')
os.environ['QDRANT_FASTEMBED_CACHE_PATH'] = r'C:\\Users\\Administrator\\.cache\\qdrant'

# Test 1: 检查缓存
cache = os.environ.get('QDRANT_FASTEMBED_CACHE_PATH', '')
print(f'Cache path: {cache}')
print(f'Cache exists: {os.path.exists(cache)}')

# Test 2: 模型加载（可能需要下载）
try:
    from fastembed import TextEmbedding
    model = TextEmbedding(model_name='BAAI/bge-small-zh-v1.5')
    vec = list(model.embed(['test']))[0]
    print(f'Embedding dim: {len(vec)}')
    print('Embedding spike: PASS')
except Exception as e:
    print(f'Embedding spike: FAIL - {e}')
    print('可能原因: 网络无法访问 huggingface.co，需要预下载模型')
`,
  },
];

// ============================================================
// 验证存储
// ============================================================

interface VerificationRecord {
  topic: string;
  riskId: string;
  verifiedAt: string;
  evidence: string;
}

const VERIFICATION_FILE = path.join(os.homedir(), ".pi", "agent", "memory", "mechanism-verifications.json");

class VerificationStore {
  private records: VerificationRecord[] = [];

  load() {
    try {
      if (fs.existsSync(VERIFICATION_FILE)) {
        this.records = JSON.parse(fs.readFileSync(VERIFICATION_FILE, "utf-8"));
      }
    } catch {}
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(VERIFICATION_FILE), { recursive: true });
      fs.writeFileSync(VERIFICATION_FILE, JSON.stringify(this.records, null, 2));
    } catch {}
  }

  markVerified(topic: string, riskId: string, evidence: string) {
    this.records = this.records.filter(r => r.topic !== topic);
    this.records.push({
      topic, riskId, verifiedAt: new Date().toISOString(), evidence,
    });
    this.save();
  }

  isVerified(riskId: string): boolean {
    return this.records.some(r => r.riskId === riskId);
  }

  list(): VerificationRecord[] {
    return this.records.slice(-50);
  }

  clear() {
    this.records = [];
    this.save();
  }
}

// ============================================================
// 风险检测
// ============================================================

function detectRisks(text: string): RiskPattern[] {
  return RISK_PATTERNS.filter(r => r.pattern.test(text));
}

// ============================================================
// 扩展主逻辑
// ============================================================

export default function (pi: ExtensionAPI) {
  const store = new VerificationStore();
  store.load();

  console.log("[MechanismVerify] 元约束扩展已加载（先验证机制）");
  console.log(`[MechanismVerify] 已验证机制: ${store.list().length} 个`);
  console.log("[MechanismVerify] 命令: /spike, /verify, /mechanism-status");

  // ============================================================
  // 在用户消息中检测风险
  // ============================================================
  pi.on("user_message", async (event, ctx) => {
    const content = typeof event.message === "string"
      ? event.message
      : event.message?.content || "";

    if (!content) return;

    const risks = detectRisks(content);
    if (risks.length > 0) {
      const unverified = risks.filter(r => !store.isVerified(r.id));
      if (unverified.length > 0) {
        // 打印提醒到 UI（不阻塞）
        const msg = `⚠️ [MechanismVerify] 检测到 ${unverified.length} 个未验证机制风险\n` +
                    unverified.map(r => `  • ${r.category}`).join("\n") +
                    `\n建议先 /spike 验证，或 /verify 标记已验证`;
        console.log(msg);
      }
    }
  });

  // ============================================================
  // 在 LLM 处理前注入提醒
  // ============================================================
  pi.on("before_agent", async (event, ctx) => {
    const prompt = event.prompt || "";
    const risks = detectRisks(prompt);
    if (risks.length === 0) return;

    const unverified = risks.filter(r => !store.isVerified(r.id));
    if (unverified.length === 0) return;

    const reminders = unverified.map(r =>
      `【${r.category}】\n   原因: ${r.reason}\n   Spike: ${r.spikeHint}`
    ).join("\n\n");

    event.prompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ 元约束：先验证机制（Spike-First）\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${reminders}\n\n使用 /spike 生成验证脚本，或 /verify 标记已验证。\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  });

  // ============================================================
  // 命令：/spike
  // ============================================================
  pi.registerCommand("spike", {
    description: "生成 spike 验证脚本（先验证机制）",
    handler: async (args, ctx) => {
      const topic = args?.trim() || "";
      const risks = RISK_PATTERNS;

      let target: RiskPattern | undefined;

      if (topic) {
        // 按 topic 查找匹配
        target = risks.find(r =>
          r.id.includes(topic.toLowerCase()) ||
          r.category.toLowerCase().includes(topic.toLowerCase()) ||
          topic.toLowerCase().includes(r.id)
        );
      }

      if (!target) {
        // 显示所有可用 topic
        let msg = "📋 可用的 Spike 模板:\n\n";
        risks.forEach((r, i) => {
          msg += `${i + 1}. **${r.category}** (\`/spike ${r.id}\`)\n`;
          msg += `   ${r.spikeHint}\n\n`;
        });
        msg += "用法: `/spike <topic>` 生成对应验证脚本";
        ctx.ui.notify(msg, "info");
        return;
      }

      // 生成 spike 脚本
      const spikePath = path.join(process.cwd(), `spike_${target.id}.py`);
      const content = `#!/usr/bin/env python3
"""
Spike: ${target.category}
生成时间: ${new Date().toISOString()}

目的: ${target.reason}

验证点: ${target.spikeHint}

使用方法:
  python spike_${target.id}.py
  # 验证通过后，使用 /verify ${target.id} 记录
"""

${target.spikeTemplate}
`;

      try {
        fs.writeFileSync(spikePath, content, "utf-8");
        ctx.ui.notify(
          `✅ Spike 脚本已生成: ${spikePath}\n\n` +
          `下一步:\n` +
          `1. 运行: python spike_${target.id}.py\n` +
          `2. 根据输出调整假设\n` +
          `3. 验证通过后: /verify ${target.id}`,
          "info"
        );
      } catch (err) {
        ctx.ui.notify(`生成失败: ${err}`, "warning");
      }
    },
  });

  // ============================================================
  // 命令：/verify
  // ============================================================
  pi.registerCommand("verify", {
    description: "标记机制已验证（先验证机制）",
    handler: async (args, ctx) => {
      const parts = (args || "").trim().split(/\s+/);
      const topic = parts[0];
      const evidence = parts.slice(1).join(" ") || "已通过 spike 验证";

      if (!topic) {
        ctx.ui.notify(
          "用法: /verify <topic> [evidence]\n" +
          "例如: /verify milvus-lite 通过 spike_test.py 确认 load_collection() 必要性",
          "warning"
        );
        return;
      }

      const risk = RISK_PATTERNS.find(r => r.id === topic);
      if (!risk) {
        ctx.ui.notify(
          `未知 topic: ${topic}\n可用: ${RISK_PATTERNS.map(r => r.id).join(", ")}`,
          "warning"
        );
        return;
      }

      store.markVerified(topic, topic, evidence);
      ctx.ui.notify(
        `✅ 已标记为已验证: ${risk.category}\n证据: ${evidence}`,
        "info"
      );
    },
  });

  // ============================================================
  // 命令：/mechanism-status
  // ============================================================
  pi.registerCommand("mechanism-status", {
    description: "查看已验证机制清单",
    handler: async (args, ctx) => {
      const records = store.list();
      const allRisks = RISK_PATTERNS;

      let msg = `📊 机制验证状态\n\n`;

      msg += `已验证: ${records.length}/${allRisks.length}\n\n`;

      allRisks.forEach(r => {
        const verified = records.find(rec => rec.riskId === r.id);
        const status = verified ? "✅" : "⏳";
        msg += `${status} ${r.category}\n`;
        if (verified) {
          const date = new Date(verified.verifiedAt).toLocaleString("zh-CN");
          msg += `   验证时间: ${date}\n`;
          msg += `   证据: ${verified.evidence}\n`;
        }
        msg += "\n";
      });

      ctx.ui.notify(msg, "info");
    },
  });

  // ============================================================
  // 命令：/mechanism-clear
  // ============================================================
  pi.registerCommand("mechanism-clear", {
    description: "清除所有验证记录",
    handler: async (args, ctx) => {
      store.clear();
      ctx.ui.notify("✅ 所有验证记录已清除", "info");
    },
  });

  // ============================================================
  // 工具：mechanism_check
  // ============================================================
  pi.registerTool({
    name: "mechanism_check",
    description: "检查文本中是否包含潜在风险操作（向量数据库、并发、文件锁、嵌入式 DB 等）",
    parameters: Type.Object({
      text: Type.String({ description: "要检查的文本" }),
    }),
    handler: async (args: { text: string }) => {
      const risks = detectRisks(args.text);
      const result = risks.map(r => ({
        id: r.id,
        category: r.category,
        verified: store.isVerified(r.id),
        reason: r.reason,
        spikeHint: r.spikeHint,
      }));

      return {
        message: `检测到 ${risks.length} 个潜在风险`,
        risks: result,
      };
    },
  });

  // ============================================================
  // 工具：spike_generate
  // ============================================================
  pi.registerTool({
    name: "spike_generate",
    description: "生成机制验证 spike 脚本模板",
    parameters: Type.Object({
      topic: Type.String({ description: "风险类型 ID（如 milvus-lite, concurrent-threads）" }),
    }),
    handler: async (args: { topic: string }) => {
      const risk = RISK_PATTERNS.find(r => r.id === args.topic);
      if (!risk) {
        return { error: `未知 topic: ${args.topic}`, available: RISK_PATTERNS.map(r => r.id) };
      }

      const spikePath = path.join(process.cwd(), `spike_${risk.id}.py`);
      const content = `#!/usr/bin/env python3
"""
Spike: ${risk.category}
"""
${risk.spikeTemplate}
`;

      try {
        fs.writeFileSync(spikePath, content, "utf-8");
        return {
          message: `Spike 脚本已生成: ${spikePath}`,
          path: spikePath,
          risk: { id: risk.id, category: risk.category, reason: risk.reason },
        };
      } catch (err) {
        return { error: `生成失败: ${err}` };
      }
    },
  });
}

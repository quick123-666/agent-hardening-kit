# Pi 扩展案例 (Examples/Extensions)

本目录包含基于 [agent-hardening-kit](https://github.com/quick123-666/agent-hardening-kit) 理念实现的 Pi Coding Agent 扩展。

## 核心设计原则

> **零信任安全 + Runtime 硬拦截 + 直接操作工具注册表**

不同于"在 prompt 里写禁止"，我们通过 Pi 的扩展 API 直接操作工具列表，从根本上移除危险工具。

## 扩展列表

| 扩展 | 功能 | 安全等级 |
|------|------|----------|
| `pi-disable-bash.ts` | 🔴 **禁用 bash 工具** | 最高 |
| `pi-no-delete-db.ts` | 禁止删除数据库 | 高 |
| `pi-mechanism-verify.ts` | 机制验证提醒 | 中 |

---

## pi-disable-bash.ts (最高安全等级)

### 核心原理

```typescript
// 直接从 LLM 工具列表中移除 bash
const active = pi.getActiveTools();
const safeTools = active.filter(tool => tool !== "bash");
pi.setActiveTools(safeTools);  // LLM 看不到 bash
```

### 保护效果

| 层级 | 机制 | 说明 |
|------|------|------|
| 第1层 | `setActiveTools` | LLM 工具列表里根本看不到 bash |
| 第2层 | `session_start` hook | 每次会话自动禁用 |
| 第3层 | `tool_call` 拦截器 | 备用保护 |

### 安装

```bash
# 复制到全局扩展目录
cp pi-disable-bash.ts ~/.pi/agent/extensions/

# 加载扩展
pi -e ~/.pi/agent/extensions/pi-disable-bash.ts
```

### 命令

```bash
/bash-status      # 查看 bash 工具状态
/allow-bash       # 临时启用 bash（需人工确认）
/disable-bash     # 禁用 bash
/list-tools       # 列出所有可用工具
```

### LLM 看到的工具（禁用后）

```
✅ read
✅ edit
✅ write
❌ bash  ← 完全移除
```

---

## pi-no-delete-db.ts (数据库保护)

### 保护对象

| 数据库 | 保护操作 |
|--------|----------|
| SQL (MySQL/PostgreSQL) | DROP DATABASE/TABLE/SCHEMA, DELETE FROM, TRUNCATE |
| Milvus | drop_collection, drop_database |
| MongoDB | dropDatabase, .drop |
| Redis | FLUSHALL, FLUSHDB |
| 文件系统 | rm 数据库文件, rm -rf 数据库目录 |

### 安装

```bash
cp pi-no-delete-db.ts ~/.pi/agent/extensions/
pi -e ~/.pi/agent/extensions/pi-no-delete-db.ts
```

### 命令

```bash
/no-delete-db status     # 查看保护状态
/no-delete-db list      # 列出禁用操作
/no-delete-db allow X    # 临时允许特定操作
/no-delete-db block X   # 重新禁止
/no-delete-db config    # 查看配置
```

---

## pi-mechanism-verify.ts (元约束)

### 核心原则

> **5 分钟 Spike > 1 小时返工**

在使用任何第三方库/工具/数据库之前，先做机制验证（Spike），验证关键假设。

### 风险模式

| ID | 类别 | 风险 |
|----|------|------|
| `milvus-lite` | 向量数据库 | Collection released 状态问题 |
| `concurrent-threads` | 并发 | 线程安全问题 |
| `file-lock` | 文件锁 | 死锁风险 |
| `embedded-db` | 嵌入式数据库 | 状态持久化问题 |
| `embedding-model` | Embedding 模型 | 模型兼容性 |

### 安装

```bash
cp pi-mechanism-verify.ts ~/.pi/agent/extensions/
pi -e ~/.pi/agent/extensions/pi-mechanism-verify.ts
```

### 命令

```bash
/spike <topic>           # 生成 spike 验证脚本
/verify <topic> [risk]  # 标记机制已验证
/mechanism-status       # 查看已验证清单
/mechanism-clear        # 清除验证记录
```

### 教训案例：Milvus Lite

```
问题：Milvus Lite 的 Collection 在插入后自动 release 状态
现象：create → insert 成功，但 query 报错 "Collection is released"
原因：没有在查询前调用 load_collection()
教训：使用任何数据库前必须做完整生命周期 spike
```

---

## 加载配置

### 最高安全（禁用所有命令）

```bash
pi -e ~/.pi/agent/extensions/pi-disable-bash.ts
```

### 数据库保护（禁用 bash + 数据库保护）

```bash
pi -e ~/.pi/agent/extensions/pi-disable-bash.ts \
   -e ~/.pi/agent/extensions/pi-no-delete-db.ts
```

### 完整项目（安全 + 数据库 + 机制验证）

```bash
pi -e ~/.pi/agent/extensions/pi-disable-bash.ts \
   -e ~/.pi/agent/extensions/pi-no-delete-db.ts \
   -e ~/.pi/agent/extensions/pi-mechanism-verify.ts
```

---

## 与其他约束的关系

```
┌─────────────────────────────────────────────────────────┐
│                    Agent Hardening Kit                    │
├─────────────────────────────────────────────────────────┤
│  安全约束 (Security Constraints)                        │
│  ├─ pi-disable-bash.ts      ← 禁用 bash 工具          │
│  ├─ pi-no-delete-db.ts      ← 数据库删除保护           │
│  └─ 路径白名单              ← 文件操作限制（待实现）    │
├─────────────────────────────────────────────────────────┤
│  稳定性保障 (Stability)                                 │
│  ├─ 会话轮次封顶                                       │
│  ├─ 噪声过滤                                          │
│  └─ 推理终止检测                                       │
├─────────────────────────────────────────────────────────┤
│  交付收敛 (Delivery)                                   │
│  ├─ 变更粒度控制                                       │
│  └─ 强制交付                                           │
├─────────────────────────────────────────────────────────┤
│  元约束 (Meta-Constraints)                             │
│  └─ pi-mechanism-verify.ts ← Spike-First 验证        │
└─────────────────────────────────────────────────────────┘
```

---

## 许可

本目录中的扩展遵循与主项目相同的 MIT 许可。

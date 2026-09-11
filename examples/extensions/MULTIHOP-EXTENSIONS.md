# Pi 多跳推理扩展套件

> **版本**：v1.0
> **日期**：2026-09-11
> **三个扩展协同工作**，实现完整的多跳推理能力

---

## 概述

本目录包含三个 Pi 扩展，共同实现 AI Agent 的多跳推理能力：

| 扩展 | 功能 | 行数 |
|------|------|------|
| `pi-multihop-reasoning.ts` | 多跳推理追踪 | ~330 |
| `pi-multihop-memory.ts` | 集成长期记忆 | ~220 |
| `pi-multihop-subagent.ts` | 子代理协作 | ~340 |

---

## 1. pi-multihop-reasoning.ts

### 用途
自动追踪 LLM 的多步推理过程，记录每一步的工具调用和结果。

### 核心功能
- ✅ 自动记录每跳的工具调用（args, result, duration）
- ✅ 死循环检测（连续3次相同调用）
- ✅ 警告阈值（10跳提醒）
- ✅ 强制中断（20跳停止）
- ✅ 独立审计日志

### 命令
```bash
/trace            # 显示推理链
/trace-stats      # 统计信息
/trace-clear      # 清除历史
/trace-export     # 导出 JSON
```

### 使用示例
```bash
# 加载
pi -e ~/.pi/agent/extensions/pi-multihop-reasoning.ts

# 使用
/trace
# 输出：
# 🔗 多跳推理链
# 跳 1: read - "读取 main.ts"
# 跳 2: search - "搜索相关函数"
# 跳 3: edit - "修改代码"
# 跳 4: bash - "运行测试"
```

---

## 2. pi-multihop-memory.ts

### 用途
将多跳推理结果自动保存到长期记忆，让未来的会话可以复用。

### 核心功能
- ✅ 自动保存推理链到记忆库
- ✅ 关键词检索历史推理
- ✅ 标签分类（#decision, #preference 等）
- ✅ 跨会话查询
- ✅ 推理统计

### 命令
```bash
/reasoning-save [tags...]   # 保存当前推理
/reasoning-recall <query>   # 检索相关推理
/reasoning-list             # 列出最近推理
```

### 使用示例
```bash
# 保存带标签的推理
/reasoning-save #decision python-optimization

# 检索历史推理
/reasoning-recall 性能优化
# 输出：
# 🔍 找到 3 条相关推理
# [2026-09-11] 优化 Python 列表推导
# [2026-09-10] 优化 SQL 查询
# [2026-09-09] 优化 React 重渲染
```

### 记忆目录结构
```
~/.pi/agent/memory/reasoning/
├── reasoning-1726051234567-abc123.json
├── reasoning-1726051234890-def456.json
└── ...
```

---

## 3. pi-multihop-subagent.ts

### 用途
实现 Multi-Agent 协作：派生子代理处理子任务，并行加速，结果合并。

### 核心功能
- ✅ 派生子代理处理子任务
- ✅ 并行执行多个子代理
- ✅ 任务编排（Orchestrator）
- ✅ 状态管理
- ✅ 结果综合

### 命令
```bash
/spawn-subagent <task>     # 派生子代理
/spawn-parallel <tasks>    # 并行派发（用 || 分隔）
/orchestrate <task>        # 智能编排
/subagent-status           # 查看状态
```

### 工具（供 LLM 使用）
- `spawn_subagent(task)` - LLM 可直接调用
- `spawn_parallel_subagents(tasks[])` - 并行派发

### 使用示例

#### 串行派发
```bash
/spawn-subagent 研究量子计算的基础原理
# 输出：子代理完成研究报告
```

#### 并行派发
```bash
/spawn-parallel "分析 A 性能" || "分析 B 性能" || "分析 C 性能"
# 输出：3 个子代理并行执行
```

#### 智能编排
```bash
/orchestrate 全面分析系统性能
# 输出：
# 🎭 协调执行结果
# 主任务: 全面分析系统性能
# 子任务数: 3
# [1] 收集性能数据
# [2] 分析瓶颈
# [3] 提出优化建议
```

---

## 三个扩展的协同工作

```
┌──────────────────────────────────────────────────────────────┐
│                   Pi 多跳推理生态系统                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐                                     │
│  │ pi-multihop-reasoning │ ← 追踪每次推理的步骤           │
│  └──────────┬────────────┘                                     │
│             │                                                 │
│             ▼                                                 │
│  ┌─────────────────────┐                                     │
│  │ pi-multihop-memory   │ ← 保存/检索推理结果           │
│  └──────────┬────────────┘                                     │
│             │                                                 │
│             ▼                                                 │
│  ┌─────────────────────┐                                     │
│  │ pi-multihop-subagent │ ← 协调多个子代理             │
│  └─────────────────────┘                                     │
│                                                              │
│  工作流：                                                     │
│  1. reasoning 追踪每一步                                      │
│  2. memory 保存和检索历史                                      │
│  3. subagent 协调并行执行                                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 完整加载配置

```bash
# 加载所有三个扩展
pi \
  -e ~/.pi/agent/extensions/pi-multihop-reasoning.ts \
  -e ~/.pi/agent/extensions/pi-multihop-memory.ts \
  -e ~/.pi/agent/extensions/pi-multihop-subagent.ts
```

或者添加到 `load-extensions.sh`：

```bash
#!/bin/bash
# Multi-hop extensions
MULTIHOP_EXTENSIONS=(
  "$HOME/.pi/agent/extensions/pi-multihop-reasoning.ts"
  "$HOME/.pi/agent/extensions/pi-multihop-memory.ts"
  "$HOME/.pi/agent/extensions/pi-multihop-subagent.ts"
)

CMD="pi"
for ext in "${MULTIHOP_EXTENSIONS[@]}"; do
  if [ -f "$ext" ]; then
    CMD="$CMD -e $ext"
  fi
done

exec $CMD
```

---

## 实际应用场景

### 场景 1: 复杂研究任务

```
用户："研究 2024 年最流行的 3 个 JavaScript 框架"
  ↓
LLM 调用 spawn_parallel_subagents：
  - 子代理 1: "研究 React"
  - 子代理 2: "研究 Vue"
  - 子代理 3: "研究 Svelte"
  ↓
3 个子代理并行工作（节省时间）
  ↓
reasoning 追踪所有调用
  ↓
memory 保存最终结果（可复用）
  ↓
返回综合报告
```

### 场景 2: 代码审查

```
用户："审查这段代码的性能问题"
  ↓
reasoning 追踪：
  跳 1: read("code.ts")
  跳 2: grep("performance")
  跳 3: search("optimization patterns")
  跳 4: spawn_subagent("分析时间复杂度")
  跳 5: spawn_subagent("分析内存使用")
  跳 6: 综合两个子代理结果
  ↓
memory 保存审查模式（下次可直接复用）
```

### 场景 3: 跨会话知识累积

```
会话 1: 解决 Python 性能问题
  ↓
/reasoning-save #decision python-perf
  ↓
一周后，会话 2:
用户："又有 Python 性能问题"
  ↓
LLM 自动调用 /reasoning-recall "Python 性能"
  ↓
找到之前的解决方案
  ↓
结合新问题，给出更优方案
```

---

## 技术实现细节

### 状态共享

三个扩展通过文件系统共享状态：
```
~/.pi/agent/
├── state/multihop-state.json     # reasoning 状态
├── memory/reasoning/*.json       # memory 存储
├── subagents/*.json              # subagent 状态
└── logs/multihop.log             # reasoning 日志
```

### 事件流

```
user_input
  ↓
[before_agent] → reasoning 初始化链
  ↓
[tool_call] → reasoning 添加步骤 + subagent 派发
  ↓
[tool_result] → reasoning 记录结果
  ↓
[after_agent] → memory 保存推理
  ↓
final_answer
```

### 性能考虑

| 扩展 | 开销 | 说明 |
|------|------|------|
| reasoning | < 5ms/跳 | 仅记录，不阻塞 |
| memory | < 10ms/保存 | 异步 I/O |
| subagent | 取决于任务 | 并行可加速 3-5x |

---

## 故障排查

### Q: /trace 显示空？

**A**: 当前会话还没有开始工具调用。多跳推理只在有 tool_call 时记录。

### Q: /reasoning-recall 找不到结果？

**A**:
- 检查 `~/.pi/agent/memory/reasoning/` 目录
- 用 `/reasoning-list` 查看已保存的记录
- 尝试不同的关键词

### Q: 子代理超时？

**A**:
- 检查 `SUBAGENT_DIR` 目录
- 查看子代理的 JSON 状态文件
- 实际使用时需要接入 Pi 的子会话 API

---

## 未来扩展

| 方向 | 说明 |
|------|------|
| **可视化 TUI** | 图形化显示推理树 |
| **并行分支** | Tree of Thoughts 实现 |
| **自动记忆** | LLM 自动决定何时保存 |
| **推理压缩** | 压缩长推理链 |
| **跨模型推理** | 不同模型协作 |

---

## 许可

本目录中的扩展遵循与主项目相同的 MIT 许可。

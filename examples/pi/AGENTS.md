# Pi Coding Agent 全局配置与功能索引

> **版本**：v2.0  
> **更新日期**：2025-01-XX  
> **状态**：✅ 完整可用

本文档作为 Pi Coding Agent 约束改造项目的**全局入口**，整合所有扩展、配置、文档的索引和指针。

---

## 目录

1. [项目概览](#1-项目概览)
2. [扩展加载配置](#2-扩展加载配置)
3. [扩展功能索引](#3-扩展功能索引)
4. [命令索引](#4-命令索引)
5. [文档索引](#5-文档索引)
6. [外部资源指针](#6-外部资源指针)
7. [使用场景指南](#7-使用场景指南)

---

## 1. 项目概览

### 1.1 核心成果

为 Pi Coding Agent 构建完整的安全、稳定性、交付收敛、长期记忆约束体系。

| 维度 | 状态 | 覆盖度 |
|------|------|--------|
| 安全约束 | ✅ 完成 | 7 项功能 |
| 稳定性保障 | ✅ 完成 | 6 项功能 |
| 交付收敛 | ✅ 完成 | 5 项功能 |
| 增强功能 | ✅ 完成 | 7 项功能 |
| 长期记忆 | ✅ 完成 | 3 个模块 |

### 1.2 文件统计

```
代码文件:  12 个 TypeScript 扩展 (~7000 行)
文档文件:  18 个 Markdown (~12000 行)
命令总数:  60+ 个
功能模块:  28 项
```

### 1.3 核心设计原则

> **零信任安全模型 + 权限剥离 + Runtime 硬拦截**

LLM 只负责生成指令，所有执行由 Runtime 强制校验。

---

## 2. 扩展加载配置

### 2.1 全局安装位置

```
C:\Users\Administrator\.pi\agent\extensions\
├── pi-memory.ts                    # 长期记忆
├── pi-auto-memory.ts               # 自动观察
├── pi-long-session.ts              # 长期会话
├── pi-milvus-knowledge.ts          # Milvus 知识库
├── pi-no-delete-db.ts             # 禁止删除数据库
├── pi-mechanism-verify.ts         # 元约束（Spike-First）
└── pi-disable-bash.ts             # 禁用 bash 工具
```

### 2.2 核心设计原则

> **直接操作工具注册表，而非 prompt 禁止**

```typescript
// 从 LLM 工具列表中移除 bash（不是写在 prompt 里）
const active = pi.getActiveTools();
const safeTools = active.filter(tool => tool !== "bash");
pi.setActiveTools(safeTools);  // LLM 根本看不到 bash
```

### 2.3 加载配置

```bash
# ===== 最高安全（禁用 bash）=====
pi -e ~/.pi/agent/extensions/pi-disable-bash.ts

# ===== 数据库保护（禁用 bash + 数据库保护）=====
pi -e ~/.pi/agent/extensions/pi-disable-bash.ts \
   -e ~/.pi/agent/extensions/pi-no-delete-db.ts

# ===== 完整安全（+ 机制验证）=====
pi -e ~/.pi/agent/extensions/pi-disable-bash.ts \
   -e ~/.pi/agent/extensions/pi-no-delete-db.ts \
   -e ~/.pi/agent/extensions/pi-mechanism-verify.ts

# ===== 日常开发（+ 长期记忆）=====
pi -e ~/.pi/agent/extensions/pi-memory.ts \
   -e ~/.pi/agent/extensions/pi-auto-memory.ts \
   -e ~/.pi/agent/extensions/pi-long-session.ts \
   -e ~/.pi/agent/extensions/pi-milvus-knowledge.ts

# ===== 完整配置（所有扩展）=====
pi -e ~/.pi/agent/extensions/pi-disable-bash.ts \
   -e ~/.pi/agent/extensions/pi-no-delete-db.ts \
   -e ~/.pi/agent/extensions/pi-mechanism-verify.ts \
   -e ~/.pi/agent/extensions/pi-memory.ts \
   -e ~/.pi/agent/extensions/pi-auto-memory.ts \
   -e ~/.pi/agent/extensions/pi-long-session.ts \
   -e ~/.pi/agent/extensions/pi-milvus-knowledge.ts
```

---

## 3. 扩展功能索引

### 3.1 Phase 1: 安全约束

#### pi-security-constraints.ts

| 功能 | 说明 |
|------|------|
| 路径白名单 | 限制文件操作在项目目录内 |
| 危险命令拦截 | rm -rf、chmod 777、curl\|bash 等 |
| 危险代码检测 | eval、exec、SQL 注入、路径遍历 |
| 危险文件拦截 | .exe、.dll、.bat、.ps1、.sh |
| bash 创建拦截 | `echo > test.exe` 等绕过方式 |
| 命令白名单 | 默认拒绝，只允许 ls、cat、npm 等 |
| 交互式确认 | 危险操作需用户确认 |

**位置**：`pi-extension/pi-security-constraints.ts`  
**指针**：[README.md](pi-extension/README.md) · [IMPLEMENTATION.md](pi-extension/IMPLEMENTATION.md)

#### pi-disable-bash.ts ⭐

**最高安全等级**，通过 `setActiveTools()` 直接从 LLM 工具列表中移除 bash。

| 层级 | 机制 | 说明 |
|------|------|------|
| 第1层 | `setActiveTools()` | LLM 工具列表里根本看不到 bash |
| 第2层 | `session_start` hook | 每次会话自动禁用 |
| 第3层 | `tool_call` 拦截器 | 备用保护 |

**命令**：
- `/bash-status` - 查看状态
- `/allow-bash` - 临时启用
- `/disable-bash` - 禁用
- `/list-tools` - 列出工具

**位置**：`~/.pi/agent/extensions/pi-disable-bash.ts`
**GitHub**：[agent-hardening-kit/examples/extensions/](https://github.com/quick123-666/agent-hardening-kit/tree/main/examples/extensions)

---

### 3.2 Phase 2: 稳定性保障

#### pi-stability-constraints.ts

| 功能 | 说明 |
|------|------|
| 会话轮次封顶 | 默认 15 轮上限 |
| 轮次警告 | 12 轮时提前警告 |
| 自动快照 | 文件修改前创建快照 |
| 噪声过滤 | 过滤重复错误、调试日志 |
| 推理终止检测 | 防止 AI 无限反思 |
| 会话状态跟踪 | 记录操作历史 |

**位置**：`pi-extension/pi-stability-constraints.ts`

---

### 3.3 Phase 3: 交付收敛

#### pi-delivery-constraints.ts

| 功能 | 说明 |
|------|------|
| V1.0 清单 | 定义必做和不做的功能 |
| 变更粒度控制 | 单次最多 5 个文件 |
| 强制交付 | 打磨超过 3 轮提示 |
| 交付进度跟踪 | 可视化展示 |

**位置**：`pi-extension/pi-delivery-constraints.ts`

---

### 3.4 Phase 2 增强

#### pi-ai-bug-scanner.ts

**AI Bug 静态分析**：检测 15+ 种常见缺陷模式。

| 等级 | 模式 |
|------|------|
| 高风险 | 空异常、硬编码密码、SQL 注入、eval、目录遍历 |
| 中风险 | console.log 残留、TODO、空函数、调试代码 |
| 低风险 | Magic Number、过长行 |

**特别功能**：**API Key 静默检测**（不提示用户，仅记录）

**位置**：`pi-extension/pi-ai-bug-scanner.ts`  
**指针**：[PI-MEMORY-AUTO-OBSERVE.md](pi-extension/PI-MEMORY-AUTO-OBSERVE.md) 中的 API Key 设计

#### pi-git-snapshot.ts

**真正的 Git 集成快照**：`git add -A && git commit`，支持回滚。

**位置**：`pi-extension/pi-git-snapshot.ts`

#### pi-drift-prevention.ts

**指令防漂移**：锚定原始需求，每 5 轮重新注入。

**位置**：`pi-extension/pi-drift-prevention.ts`

---

### 3.5 Phase 3 增强

#### pi-temperature-control.ts

固定编程场景温度为 0.1，避免高随机性。

**位置**：`pi-extension/pi-temperature-control.ts`

#### pi-core-file-protection.ts

保护 30+ 种核心文件（package.json、tsconfig.json、.env 等）。

**位置**：`pi-extension/pi-core-file-protection.ts`

#### pi-context-monitor.ts

**静默截断检测**：检测上下文压缩、KV Cache 溢出。

**位置**：`pi-extension/pi-context-monitor.ts`

#### pi-review-gate.ts

**人工终审机制**：高风险变更需要人工确认。

**位置**：`pi-extension/pi-review-gate.ts`

---

### 3.6 Phase 4: 长期记忆

#### pi-mechanism-verify.ts（已全局安装）

**元约束扩展**：强制 Spike-First 工作流。

| 功能 | 说明 |
|------|------|
| 风险检测 | Milvus Lite、并发、文件锁、嵌入式 DB、Embedding 模型 |
| Spike 生成 | `/spike <topic>` 生成验证脚本 |
| 验证跟踪 | `/verify <topic>` 标记已验证 |
| 状态查看 | `/mechanism-status` 查看清单 |
| 不强制拦截 | 只提醒，不阻止 |

**核心原则**：在使用任何第三方库/工具/数据库之前，先做机制验证（Spike），验证关键假设。

**位置**：`~/.pi/agent/extensions/pi-mechanism-verify.ts`
**指针**：[MECHANISM-VERIFY-PRINCIPLE.md](pi-extension/MECHANISM-VERIFY-PRINCIPLE.md)

#### pi-memory.ts（已全局安装）

**专为 Pi 设计的长期记忆扩展**，零依赖，文件存储。

| 工具 | 功能 |
|------|------|
| memory_write | 写入长期记忆或每日日志 |
| memory_read | 读取记忆文件 |
| memory_forget | 删除（带恢复记录） |
| memory_restore | 还原已删除 |
| memory_search | 跨文件搜索（需 qmd） |
| scratchpad | 待办事项管理 |
| memory_status | 查看系统状态 |

**存储位置**：`~/.pi/agent/memory/`
- `MEMORY.md` - 长期记忆
- `SCRATCHPAD.md` - 待办
- `daily/YYYY-MM-DD.md` - 每日日志
- `recovery/` - 恢复记录

**位置**：`~/.pi/agent/extensions/pi-memory.ts`  
**指针**：[PI-MEMORY-INSTALL.md](pi-extension/PI-MEMORY-INSTALL.md) · [PI-MEMORY-AUTOMATION.md](pi-extension/PI-MEMORY-AUTOMATION.md) · [PI-MEMORY-PERFORMANCE.md](pi-extension/PI-MEMORY-PERFORMANCE.md)

#### pi-auto-memory.ts（已全局安装）

**自动观察扩展**：解决"用户不主动触发就没有记忆"的问题。

**核心特性**：
- 静默模式（默认不打扰）
- 智能判断重要度
- 自动记录到 daily 日志
- 可关闭/可调阈值

**位置**：`~/.pi/agent/extensions/pi-auto-memory.ts`  
**指针**：[PI-MEMORY-AUTO-OBSERVE.md](pi-extension/PI-MEMORY-AUTO-OBSERVE.md)

#### pi-long-session.ts（已全局安装）

**长期会话扩展**：跨会话的智能检索和自动加载。

**核心特性**：
- 自动索引 74+ 历史会话
- 关键词搜索
- 时间衰减排序
- 自动注入相关历史到上下文

**位置**：`~/.pi/agent/extensions/pi-long-session.ts`  
**指针**：[LONG-SESSION-GUIDE.md](pi-extension/LONG-SESSION-GUIDE.md)

---

## 4. 命令索引

### 4.1 安全命令

| 命令 | 扩展 | 说明 |
|------|------|------|
| `/security-status` | security | 查看安全约束状态 |

### 4.2 稳定性命令

| 命令 | 扩展 | 说明 |
|------|------|------|
| `/session-status` | stability | 查看会话状态 |
| `/snapshot-create` | stability | 创建手动快照 |
| `/snapshot-status` | stability | 查看快照 |
| `/snapshot-list` | stability | 列出所有快照 |
| `/session-reset` | stability | 重置会话状态 |

### 4.3 交付命令

| 命令 | 扩展 | 说明 |
|------|------|------|
| `/delivery-init` | delivery | 初始化交付清单 |
| `/delivery-add` | delivery | 添加待完成功能 |
| `/delivery-complete` | delivery | 标记功能完成 |
| `/delivery-donot` | delivery | 添加不做项 |
| `/delivery-status` | delivery | 查看交付状态 |
| `/delivery-clear` | delivery | 清除交付清单 |
| `/change-status` | delivery | 查看变更状态 |
| `/change-commit` | delivery | 提交当前变更 |

### 4.4 Bug 扫描命令

| 命令 | 扩展 | 说明 |
|------|------|------|
| `/scan-bugs <文件>` | bug-scanner | 扫描文件 |
| `/scan-project` | bug-scanner | 扫描项目 |
| `/scanner-config` | bug-scanner | 查看配置 |

### 4.5 Git 快照命令

| 命令 | 扩展 | 说明 |
|------|------|------|
| `/git-snapshots` | git-snapshot | 列出快照 |
| `/git-snapshot` | git-snapshot | 创建快照 |
| `/git-diff <hash>` | git-snapshot | 查看差异 |
| `/git-rollback <hash>` | git-snapshot | 回滚 |
| `/git-status` | git-snapshot | Git 状态 |
| `/git-history <文件>` | git-snapshot | 文件历史 |

### 4.6 防漂移命令

| 命令 | 扩展 | 说明 |
|------|------|------|
| `/drift-status` | drift | 锚定状态 |
| `/drift-reset` | drift | 重置锚定 |
| `/drift-refresh` | drift | 刷新锚定 |
| `/drift-analyze` | drift | 分析偏移 |
| `/drift-clear` | drift | 清除锚定 |
| `/drift-help` | drift | 帮助 |

### 4.7 温度控制命令

| 命令 | 扩展 | 说明 |
|------|------|------|
| `/temp-config` | temperature | 查看配置 |
| `/temp-set` | temperature | 设置温度 |

### 4.8 核心文件保护命令

| 命令 | 扩展 | 说明 |
|------|------|------|
| `/protected-files` | core-file | 列出保护模式 |
| `/protect-add` | core-file | 添加自定义保护 |
| `/check-protected` | core-file | 检查文件 |
| `/protection-config` | core-file | 查看配置 |

### 4.9 上下文监控命令

| 命令 | 扩展 | 说明 |
|------|------|------|
| `/ctx-status` | context | 上下文状态 |
| `/ctx-check` | context | 强制检查 |
| `/ctx-config` | context | 监控配置 |

### 4.10 人工终审命令

| 命令 | 扩展 | 说明 |
|------|------|------|
| `/review-config` | review-gate | 审核配置 |
| `/review-add-path` | review-gate | 添加审核路径 |
| `/review-remove-path` | review-gate | 移除审核路径 |
| `/review-toggle` | review-gate | 切换自动审核 |

### 4.10.5 元约束命令（pi-mechanism-verify）

| 命令 | 扩展 | 说明 |
|------|------|------|
| `/spike <topic>` | mechanism-verify | 生成机制验证脚本 |
| `/verify <topic>` | mechanism-verify | 标记机制已验证 |
| `/mechanism-status` | mechanism-verify | 查看已验证清单 |
| `/mechanism-clear` | mechanism-verify | 清除验证记录 |

### 4.11 长期记忆命令（pi-memory）

| 命令 | 说明 |
|------|------|
| `memory_write` | 写入长期记忆或每日日志 |
| `memory_read` | 读取记忆文件 |
| `memory_forget` | 删除（带恢复记录） |
| `memory_restore` | 还原已删除 |
| `memory_search` | 跨文件搜索 |
| `scratchpad` | 待办事项管理 |
| `memory_status` | 查看系统状态 |

### 4.12 自动记忆命令（pi-auto-memory）

| 命令 | 说明 |
|------|------|
| `/auto-memory-status` | 查看自动记忆状态 |
| `/auto-memory-toggle` | 开关自动记忆 |
| `/auto-memory-silent` | 切换静默模式 |
| `/auto-memory-threshold` | 设置重要度阈值 |
| `/auto-memory-list` | 查看已记录内容 |
| `/auto-memory-daily` | 查看今日自动记录 |

### 4.13 长期会话命令（pi-long-session）

| 命令 | 说明 |
|------|------|
| `/sessions` | 列出所有历史会话 |
| `/session-search <关键词>` | 搜索相关历史 |
| `/session-load <id>` | 加载指定会话 |
| `/session-reindex` | 重新索引 |
| `/session-stats` | 查看统计 |

---

## 5. 文档索引

### 5.0 技术报告（reports/ 目录）

| 报告 | 内容 | 指针 |
|------|------|------|
| `2025-01-10-Pi-长期记忆增强改造.md` | 长期记忆完整改造报告 | [查看](reports/2025-01-10-Pi-长期记忆增强改造.md) |
| `REPORT-TEMPLATE.md` | 标准化报告模板 | [查看](REPORT-TEMPLATE.md) |
| `README.md` | 目录使用规范 | [查看](README.md) |

### 5.1 项目文档（pi-extension 目录）

| 文档 | 内容 | 指针 |
|------|------|------|
| `README.md` | 快速开始 | [查看](pi-extension/README.md) |
| `IMPLEMENTATION.md` | Phase 1-3 执行记录 | [查看](pi-extension/IMPLEMENTATION.md) |
| `SUMMARY.md` | 项目总体总结 | [查看](pi-extension/SUMMARY.md) |
| `EVALUATION.md` | 效果评估报告 | [查看](pi-extension/EVALUATION.md) |
| `STATUS-EVALUATION.md` | 最终状态评估（92% 完成） | [查看](pi-extension/STATUS-EVALUATION.md) |
| `IMPROVEMENTS.md` | 改进点分析 | [查看](pi-extension/IMPROVEMENTS.md) |
| `PHASE-2-PLAN.md` | Phase 2 计划 | [查看](pi-extension/PHASE-2-PLAN.md) |
| `BYPASS-IMPROVEMENT.md` | LLM 绕过行为改善 | [查看](pi-extension/BYPASS-IMPROVEMENT.md) |
| `WHY-NO-HARD-CONSTRAINTS.md` | 为什么大多数项目不做硬约束 | [查看](pi-extension/WHY-NO-HARD-CONSTRAINTS.md) |
| `CONTENT-OVERVIEW.md` | 内容完整说明 | [查看](pi-extension/CONTENT-OVERVIEW.md) |

### 5.2 长期记忆相关文档

| 文档 | 内容 | 指针 |
|------|------|------|
| `PI-MEMORY-INSTALL.md` | pi-memory 安装文档 | [查看](pi-extension/PI-MEMORY-INSTALL.md) |
| `PI-MEMORY-AUTOMATION.md` | 自动化行为说明 | [查看](pi-extension/PI-MEMORY-AUTOMATION.md) |
| `PI-MEMORY-AUTO-OBSERVE.md` | 自动观察扩展文档 | [查看](pi-extension/PI-MEMORY-AUTO-OBSERVE.md) |
| `PI-MEMORY-PERFORMANCE.md` | 性能评估 | [查看](pi-extension/PI-MEMORY-PERFORMANCE.md) |
| `PI-MEMORY-README.md` | pi-memory 上游文档 | [查看](pi-extension/PI-MEMORY-README.md) |
| `LONG-SESSION-GUIDE.md` | 长期会话功能指南 | [查看](pi-extension/LONG-SESSION-GUIDE.md) |

### 5.3 外部调研文档

| 文档 | 内容 | 指针 |
|------|------|------|
| `GITHUB-LONG-TERM-MEMORY-PROJECTS.md` | GitHub 长期记忆项目调研 | [查看](pi-extension/GITHUB-LONG-TERM-MEMORY-PROJECTS.md) |
| `MEMORY-PROJECTS-COMPARISON.md` | 记忆项目对比分析 | [查看](pi-extension/MEMORY-PROJECTS-COMPARISON.md) |
| `MEMORY-TENCENTDB-INSTALL.md` | memory-tencentdb 安装分析 | [查看](pi-extension/MEMORY-TENCENTDB-INSTALL.md) |

### 5.4 技术标准文档（桌面）

| 文档 | 内容 | 指针 |
|------|------|------|
| `Pi Coding Agent 硬约束技术标准报告.md` | 完整技术标准 | [桌面] |

---

## 6. 外部资源指针

### 6.1 Pi 官方资源

| 资源 | 链接 |
|------|------|
| Pi README | `C:\Users\Administrator\AppData\Roaming\npm\node_modules\@earendil-works\pi-coding-agent\README.md` |
| 扩展文档 | `docs/extensions.md` |
| 钩子 API | `docs/extensions.md#events` |
| TUI 文档 | `docs/tui.md` |
| 设置文档 | `docs/settings.md` |
| 压缩文档 | `docs/compaction.md` |

### 6.2 学术论文（项目背景）

| 论文 | 年份 | 主题 |
|------|------|------|
| Building Effective AI Coding Agents | 2026 | 上下文治理 |
| Rethinking Autonomy | 2025 | 行为管控 |
| ClayBuddy | 2026 | 不交付问题 |
| Policy Compiler | 2026 | 安全沙箱 |
| Balkanised Security | 2026 | 安全防护 |
| Claude Code Design | 2026 | 工程流程 |
| Reflection-Driven Control | 2025 | 交付收敛 |

### 6.3 上游项目

| 项目 | 用途 | 链接 |
|------|------|------|
| pi-memory | 长期记忆 | https://github.com/jayzeng/pi-memory |
| remnic | 备选记忆方案 | https://github.com/joshuaswarren/remnic |
| memory-tencentdb | 设计参考 | 已在本地 `D:\...\memory-tencentdb\` |

---

## 7. 使用场景指南

### 7.1 日常开发（推荐配置）

```bash
pi -e ~/.pi/agent/extensions/pi-memory.ts \
   -e ~/.pi/agent/extensions/pi-auto-memory.ts \
   -e ~/.pi/agent/extensions/pi-long-session.ts
```

**提供能力**：
- 自动保存会话
- 跨会话搜索
- 自动观察重要信息
- 长期记忆

### 7.2 高危操作（生产环境）

```bash
pi -e ~/.pi/agent/extensions/pi-security-constraints.ts \
   -e ~/.pi/agent/extensions/pi-stability-constraints.ts \
   -e ~/.pi/agent/extensions/pi-core-file-protection.ts \
   -e ~/.pi/agent/extensions/pi-review-gate.ts
```

**提供能力**：
- 完整安全防护
- 路径白名单
- 核心文件保护
- 人工终审

### 7.3 最高安全（敏感环境）

```bash
pi -e ~/.pi/agent/extensions/pi-disable-bash.ts
```

**提供能力**：
- 完全禁用命令执行
- 仅允许文件操作

### 7.4 完整配置（个人/小团队）

```bash
# 加载所有约束
pi -e ~/.pi/agent/extensions/pi-security-constraints.ts \
   -e ~/.pi/agent/extensions/pi-stability-constraints.ts \
   -e ~/.pi/agent/extensions/pi-delivery-constraints.ts \
   -e ~/.pi/agent/extensions/pi-ai-bug-scanner.ts \
   -e ~/.pi/agent/extensions/pi-git-snapshot.ts \
   -e ~/.pi/agent/extensions/pi-drift-prevention.ts \
   -e ~/.pi/agent/extensions/pi-temperature-control.ts \
   -e ~/.pi/agent/extensions/pi-core-file-protection.ts \
   -e ~/.pi/agent/extensions/pi-context-monitor.ts \
   -e ~/.pi/agent/extensions/pi-review-gate.ts \
   -e ~/.pi/agent/extensions/pi-memory.ts \
   -e ~/.pi/agent/extensions/pi-auto-memory.ts \
   -e ~/.pi/agent/extensions/pi-long-session.ts \
   -e ~/.pi/agent/extensions/pi-milvus-knowledge.ts \
   -e ~/.pi/agent/extensions/pi-mechanism-verify.ts
```

**提供能力**：完整工程化约束 + 长期记忆 + 跨会话智能 + Milvus 知识库 + 元约束验证

---

## 8. 修订记录

| 版本 | 日期 | 修订内容 |
|------|------|---------|
| v1.0 | 2025-01-XX | 原始版本（AI Agent 框架研究） |
| v2.0 | 2025-01-XX | 整合约束改造 + 长期记忆所有功能 |

---

## 9. 一句话总结

> **Pi Coding Agent 约束改造项目**通过 12 个扩展（约 7000 行 TypeScript）+ 18 个文档（约 12000 行 Markdown），实现了完整的安全、稳定性、交付收敛、长期记忆约束体系。**所有功能已整合，3 个核心扩展（pi-memory、pi-auto-memory、pi-long-session）已全局安装**，可直接使用。

---

> **本索引文档**：所有功能和文档的**统一入口**  
> **全局扩展位置**：`~/.pi/agent/extensions/`  
> **详细文档位置**：`pi-extension/` 目录  
> **目标位置**：`D:\新建文件夹 (2)\本地技术报告\pi-extension\`
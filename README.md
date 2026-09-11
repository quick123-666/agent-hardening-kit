# Agent Hardening Kit

让 AI 编程 Agent 更安全、更稳定、更可靠。

## 核心问题

当前 AI 编程 Agent 存在三大痛点：

| 问题 | 表现 | 影响 |
|------|------|------|
| **安全风险** | 误删文件、执行危险命令、泄露敏感信息 | 破坏生产环境 |
| **交付失控** | 无限改写、上下文膨胀、需求漂移 | 效率低下 |
| **缺乏记忆** | 每次都要重新解释、重复犯错 | 体验糟糕 |

## 解决方案

Agent Hardening Kit 提供四大约束体系：

```
┌─────────────────────────────────────────────────────┐
│                   Agent Hardening Kit               │
├─────────────────────────────────────────────────────┤
│  🔒 Security Constraints    安全约束                │
│     - 路径白名单、危险命令拦截、危险代码检测        │
│                                                     │
│  ⚡ Stability Constraints   稳定性保障              │
│     - 会话轮次封顶、自动快照、噪声过滤              │
│                                                     │
│  📦 Delivery Constraints   交付收敛                │
│     - 变更粒度控制、交付清单、需求锚定              │
│                                                     │
│  🧠 Memory Extensions      长期记忆                │
│     - 持久化记忆、自动观察、跨会话检索              │
└─────────────────────────────────────────────────────┘
```

## 快速开始

### 1. 安装

```bash
# 克隆项目
git clone https://github.com/yourname/agent-hardening-kit.git
cd agent-hardening-kit

# 安装依赖
npm install
```

### 2. 选择加载扩展

```bash
# 仅安全约束
pi -e ./constraints/security-constraints.ts

# 安全 + 稳定
pi -e ./constraints/security-constraints.ts \
   -e ./constraints/stability-constraints.ts

# 完整配置
pi -e ./constraints/security-constraints.ts \
   -e ./constraints/stability-constraints.ts \
   -e ./constraints/delivery-constraints.ts \
   -e ./extensions/memory.ts
```

### 3. 自定义配置

编辑 `config/default.json` 调整约束参数：

```json
{
  "security": {
    "maxSessionRounds": 15,
    "dangerousCommands": ["rm -rf", "format", "del /f /s /q"]
  },
  "stability": {
    "snapshotEnabled": true,
    "maxRounds": 20
  }
}
```

## 目录结构

```
agent-hardening-kit/
├── README.md
├── LICENSE
├── package.json
├── config/
│   └── default.json          # 默认配置
├── core/                     # 核心框架
│   ├── base-extension.ts     # 扩展基类
│   ├── constraint-engine.ts  # 约束引擎
│   └── types.ts              # 类型定义
├── constraints/              # 各类约束实现
│   ├── security-constraints.ts
│   ├── stability-constraints.ts
│   ├── delivery-constraints.ts
│   └── ai-bug-scanner.ts
├── extensions/               # 扩展功能
│   ├── memory.ts             # 长期记忆
│   ├── auto-memory.ts        # 自动观察
│   └── long-session.ts       # 跨会话检索
├── examples/                 # 案例
│   ├── pi/                   # Pi Coding Agent
│   ├── claude-code/          # Claude Code
│   └── cursor/               # Cursor
└── docs/
    ├── getting-started.md
    ├── api-reference.md
    └── best-practices.md
```

## 案例研究：Pi Coding Agent

以 [Pi Coding Agent](https://github.com/earendil-works/pi-coding-agent) 为例，展示如何应用约束改造。

详见 [examples/pi/README.md](examples/pi/README.md)

## 约束模块详解

### 🔒 安全约束 (Security Constraints)

| 功能 | 说明 |
|------|------|
| 路径白名单 | 限制文件操作在项目目录内 |
| 危险命令拦截 | rm -rf、chmod 777、curl\|bash 等 |
| 危险代码检测 | eval、exec、SQL 注入、路径遍历 |
| 危险文件拦截 | .exe、.dll、.bat、.ps1、.sh |
| 命令白名单 | 默认拒绝，只允许安全命令 |
| 交互式确认 | 危险操作需用户确认 |

### ⚡ 稳定性保障 (Stability Constraints)

| 功能 | 说明 |
|------|------|
| 会话轮次封顶 | 默认 15 轮上限，防止无限循环 |
| 自动快照 | 文件修改前创建快照 |
| 噪声过滤 | 过滤重复错误、调试日志 |
| 推理终止检测 | 防止 AI 无限反思 |
| 会话状态跟踪 | 记录操作历史 |

### 📦 交付收敛 (Delivery Constraints)

| 功能 | 说明 |
|------|------|
| 交付清单 | 定义必做和不做的功能 |
| 变更粒度控制 | 单次最多 5 个文件 |
| 强制交付 | 打磨超过 3 轮提示时强制产出 |
| 交付进度跟踪 | 可视化展示 |

### 🧠 长期记忆 (Memory Extensions)

| 功能 | 说明 |
|------|------|
| memory_write | 写入长期记忆或每日日志 |
| memory_read | 读取记忆文件 |
| memory_search | 跨文件搜索 |
| auto-observe | 自动观察重要操作 |
| long-session | 跨会话智能检索 |

## 设计原则

> **零信任安全 + 权限剥离 + Runtime 硬拦截**

```
LLM 生成指令 ──▶ Runtime 强制校验 ──▶ 执行/拦截
     │                   │
     │                   └── 所有安全检查在此完成
     └── LLM 只负责生成
```

1. **LLM 只负责生成**：AI 负责生成解决方案
2. **Runtime 强制执行**：所有操作必须通过安全校验
3. **可配置的约束**：根据场景调整约束强度
4. **案例驱动的设计**：每个约束都来自真实问题

## 适用场景

| 场景 | 推荐配置 |
|------|----------|
| 日常开发 | 记忆扩展 + 自动观察 |
| 高危操作 | 安全约束 + 核心文件保护 + 人工终审 |
| 最高安全 | 彻底禁用危险命令 |
| 完整项目 | 所有约束全部启用 |

## 参与贡献

欢迎提交 Issue 和 Pull Request！

## License

MIT License

---

**让 AI 编程 Agent 从"野马"变成"可靠助手"**

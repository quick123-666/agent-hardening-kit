# 🛡️ Agent Hardening Kit（中文）

<div align="center">

[![许可证: MIT](https://img.shields.io/badge/许可证-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-16+-green.svg)](https://nodejs.org/)

**让 AI 编程代理更安全、更稳定、更可靠。**

[English](./README.md) · [简体中文](./README.zh.md) · [日本語](./README.ja.md) · [Español](./README.es.md) · [Français](./README.fr.md)

</div>

---

## ✨ 为什么需要 Agent Hardening Kit？

现代 AI 编程代理功能强大但很脆弱。如果没有适当的"护栏"，它们可能：
- ❌ 删除关键系统文件
- ❌ 执行 `rm -rf /` 等危险命令
- ❌ 在长会话中丢失上下文
- ❌ 偏离原始需求
- ❌ 跨会话忘记用户偏好

**Agent Hardening Kit** 提供了一套全面的约束和扩展，作为 AI 编程代理的**护栏**，确保安全、稳定和可预测的行为。

---

## 🎯 核心功能

### 🔒 安全约束
- **路径白名单** — 将文件操作限制在项目目录内
- **危险命令拦截** — 阻止 `rm -rf`、`chmod 777`、`curl|bash` 等
- **代码注入防护** — 检测 `eval()`、`exec()`、SQL 注入、路径遍历
- **二进制文件创建拦截** — 阻止 `.exe`、`.dll`、`.bat`、`.ps1`、`.sh`
- **命令白名单** — 默认拒绝，只允许安全命令

### ⚡ 稳定性约束
- **会话轮次限制** — 防止无限循环（默认 15 轮）
- **自动快照** — 文件修改前创建快照
- **噪声过滤** — 过滤重复错误和调试日志
- **推理终止检测** — 防止无限自我反思
- **会话状态跟踪** — 记录操作历史

### 📦 交付约束
- **变更粒度控制** — 单次最多 5 个文件
- **强制交付** — 打磨超过 3 轮后强制产出
- **交付进度跟踪** — 可视化状态显示
- **需求锚定** — 防止需求漂移

### 🧠 记忆扩展
- **长期记忆** — 跨会话持久化知识
- **自动观察** — 静默记录重要操作
- **跨会话搜索** — 搜索历史会话
- **恢复机制** — 恢复已删除的记忆

---

## 🚀 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/quick123-666/agent-hardening-kit.git
cd agent-hardening-kit

# 安装依赖
npm install
```

### 基础使用

```typescript
import {
  createSecurityExtension,
  createStabilityExtension,
  createMemoryExtension,
} from 'agent-hardening-kit';

// 创建安全约束
const security = createSecurityExtension({
  allowedPaths: ['/path/to/project'],
});

// 创建稳定性约束
const stability = createStabilityExtension({
  maxRounds: 15,
  snapshotEnabled: true,
});

// 创建记忆扩展
const memory = createMemoryExtension({
  memoryDir: './memory',
  silentMode: true,
});

// 初始化
await Promise.all([security.init(), stability.init(), memory.init()]);
```

### 集成到 Pi Coding Agent

```bash
# 加载所有约束
pi \
  -e ./examples/pi/pi-security-constraints.ts \
  -e ./examples/pi/pi-stability-constraints.ts \
  -e ./examples/pi/pi-memory.ts
```

---

## 📚 文档

- 📖 [快速开始](./docs/getting-started.md) — 快速上手指南
- 🔧 [API 参考](./docs/api-reference.md) — 详细 API 文档
- 💡 [最佳实践](./docs/best-practices.md) — 推荐模式
- 🎓 [Pi Coding Agent 案例研究](./examples/pi/README.md) — 完整案例

---

## 🏗️ 架构

```
┌─────────────────────────────────────────────────────┐
│              Agent Hardening Kit                    │
├─────────────────────────────────────────────────────┤
│  🔒 安全层        ⚡ 稳定层      📦 交付层         │
│                                                     │
│              ┌──────────────────┐                   │
│              │   运行时引擎      │                   │
│              │   （零信任）      │                   │
│              └──────────────────┘                   │
│                       │                             │
│              ┌────────▼─────────┐                   │
│              │    约束检查       │                   │
│              │     流水线        │                   │
│              └────────┬─────────┘                   │
│                       │                             │
│         ┌─────────────┼─────────────┐               │
│         │             │             │               │
│    ┌────▼───┐   ┌────▼───┐   ┌────▼───┐            │
│    │ 命令   │   │ 文件   │   │ 记忆   │            │
│    │ 操作   │   │ 操作   │   │ 操作   │            │
│    └────────┘   └────────┘   └────────┘            │
└─────────────────────────────────────────────────────┘
```

### 设计原则

1. **零信任安全** — 每个操作必须通过运行时验证
2. **纵深防御** — 多个约束层协同工作
3. **最小权限原则** — 默认拒绝，明确允许
4. **故障安全默认** — 有疑问时阻止操作
5. **可观察行为** — 所有决策都有日志记录

---

## 📂 项目结构

```
agent-hardening-kit/
├── core/                    # 核心框架
│   ├── types.ts             # 类型定义
│   ├── base-extension.ts    # 扩展基类
│   └── index.ts             # 入口
├── constraints/             # 约束实现
├── extensions/              # 扩展模块
├── examples/
│   └── pi/                  # Pi Coding Agent 案例
├── config/
│   └── default.json         # 默认配置
├── docs/                    # 文档
├── README.md                # English
├── README.zh.md             # 简体中文
├── README.ja.md             # 日本語
├── README.es.md             # Español
├── README.fr.md             # Français
├── LICENSE
└── package.json
```

---

## 🤝 贡献

欢迎贡献！请先阅读我们的[贡献指南](./CONTRIBUTING.md)。

1. Fork 仓库
2. 创建功能分支（`git checkout -b feature/amazing-feature`）
3. 提交更改（`git commit -m '添加某个了不起的功能'`）
4. 推送到分支（`git push origin feature/amazing-feature`）
5. 开启 Pull Request

---

## 📊 统计数据

- **代码行数**：~3,000+
- **约束模块**：10+
- **支持的 AI 代理**：Pi Coding Agent（更多即将到来）
- **检测的 Bug 模式**：15+
- **语言**：TypeScript

---

## 📄 许可证

本项目采用 MIT 许可证 — 详见 [LICENSE](./LICENSE) 文件。

---

## 🙏 致谢

- 灵感来自于对更安全 AI 编程工具的需求
- 构建于优秀的 [Pi Coding Agent](https://github.com/earendil-works/pi-coding-agent) 之上
- 感谢所有[贡献者](https://github.com/quick123-666/agent-hardening-kit/graphs/contributors)

---

## 📬 联系方式

- GitHub: [@quick123-666](https://github.com/quick123-666)
- 问题反馈：[GitHub Issues](https://github.com/quick123-666/agent-hardening-kit/issues)

---

<div align="center">

**⭐ 如果觉得有用，请给个 Star！**

用 ❤️ 为更安全的 AI 编程而打造

</div>

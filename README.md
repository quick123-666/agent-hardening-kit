# 🛡️ Agent Hardening Kit

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-16+-green.svg)](https://nodejs.org/)
[![GitHub stars](https://img.shields.io/github/stars/quick123-666/agent-hardening-kit.svg)](https://github.com/quick123-666/agent-hardening-kit/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/quick123-666/agent-hardening-kit.svg)](https://github.com/quick123-666/agent-hardening-kit/network)

**Make AI Coding Agents Safer, More Stable, and More Reliable.**

让 AI 编程代理更安全、更稳定、更可靠。

[English](#english) · [简体中文](#简体中文) · [日本語](#日本語) · [Español](#español) · [Français](#français)

</div>

---

## ✨ Why Agent Hardening Kit?

Modern AI coding agents are powerful but fragile. Without proper guardrails, they can:
- ❌ Delete critical system files
- ❌ Execute dangerous commands like `rm -rf /`
- ❌ Lose context in long sessions
- ❌ Drift away from the original requirements
- ❌ Forget user preferences between sessions

**Agent Hardening Kit** provides a comprehensive set of constraints and extensions that act as **guardrails** for AI coding agents, ensuring safe, stable, and predictable behavior.

---

## 🎯 Core Features

### 🔒 Security Constraints
- **Path whitelisting** — Restrict file operations to project directories
- **Dangerous command interception** — Block `rm -rf`, `chmod 777`, `curl|bash`, etc.
- **Code injection prevention** — Detect `eval()`, `exec()`, SQL injection, path traversal
- **Binary file creation block** — Prevent `.exe`, `.dll`, `.bat`, `.ps1`, `.sh`
- **Command whitelisting** — Default deny, allow only safe commands

### ⚡ Stability Constraints
- **Session round limit** — Prevent infinite loops (default 15 rounds)
- **Auto-snapshot** — Create snapshots before file modifications
- **Noise filtering** — Filter duplicate errors and debug logs
- **Reasoning termination detection** — Prevent infinite self-reflection
- **Session state tracking** — Record operation history

### 📦 Delivery Constraints
- **Change granularity control** — Maximum 5 files per change
- **Forced delivery** — Prompt completion after 3+ polish rounds
- **Delivery progress tracking** — Visual status display
- **Requirement anchoring** — Prevent requirement drift

### 🧠 Memory Extensions
- **Long-term memory** — Persist knowledge across sessions
- **Auto-observation** — Silently record important operations
- **Cross-session search** — Search historical sessions
- **Recovery mechanism** — Restore deleted memories

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/quick123-666/agent-hardening-kit.git
cd agent-hardening-kit

# Install dependencies
npm install
```

### Basic Usage

```typescript
import {
  createSecurityExtension,
  createStabilityExtension,
  createMemoryExtension,
} from 'agent-hardening-kit';

// Create security constraint
const security = createSecurityExtension({
  allowedPaths: ['/path/to/project'],
});

// Create stability constraint
const stability = createStabilityExtension({
  maxRounds: 15,
  snapshotEnabled: true,
});

// Create memory extension
const memory = createMemoryExtension({
  memoryDir: './memory',
  silentMode: true,
});

// Initialize
await Promise.all([security.init(), stability.init(), memory.init()]);
```

### Integration with Pi Coding Agent

```bash
# Load all constraints
pi \
  -e ./examples/pi/pi-security-constraints.ts \
  -e ./examples/pi/pi-stability-constraints.ts \
  -e ./examples/pi/pi-memory.ts
```

---

## 📚 Documentation

- 📖 [Getting Started](./docs/getting-started.md) — Quick start guide
- 🔧 [API Reference](./docs/api-reference.md) — Detailed API documentation
- 💡 [Best Practices](./docs/best-practices.md) — Recommended patterns
- 🎓 [Pi Coding Agent Case Study](./examples/pi/README.md) — Complete example

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│              Agent Hardening Kit                    │
├─────────────────────────────────────────────────────┤
│  🔒 Security      ⚡ Stability   📦 Delivery       │
│     Layer             Layer          Layer          │
│                                                     │
│              ┌──────────────────┐                   │
│              │  Runtime Engine  │                   │
│              │  (Zero-Trust)    │                   │
│              └──────────────────┘                   │
│                       │                             │
│              ┌────────▼─────────┐                   │
│              │   Constraint     │                   │
│              │   Check Pipeline │                   │
│              └────────┬─────────┘                   │
│                       │                             │
│         ┌─────────────┼─────────────┐               │
│         │             │             │               │
│    ┌────▼───┐   ┌────▼───┐   ┌────▼───┐            │
│    │  Bash  │   │  File  │   │ Memory │            │
│    │  Ops   │   │  Ops   │   │  Ops   │            │
│    └────────┘   └────────┘   └────────┘            │
└─────────────────────────────────────────────────────┘
```

### Design Principles

1. **Zero-Trust Security** — Every operation must pass runtime validation
2. **Defense in Depth** — Multiple constraint layers work together
3. **Principle of Least Privilege** — Default deny, explicit allow
4. **Fail-Safe Defaults** — When in doubt, block the operation
5. **Observable Behavior** — All decisions are logged

---

## 📂 Project Structure

```
agent-hardening-kit/
├── core/                    # Core framework
│   ├── types.ts             # Type definitions
│   ├── base-extension.ts    # Extension base class
│   └── index.ts             # Entry point
├── constraints/             # Constraint implementations
├── extensions/              # Extension modules
├── examples/
│   └── pi/                  # Pi Coding Agent case study
│       ├── README.md
│       ├── PHASE-2-PLAN.md
│       ├── pi-security-constraints.ts
│       ├── pi-stability-constraints.ts
│       └── pi-memory.ts
├── config/
│   └── default.json         # Default configuration
├── docs/                    # Documentation
│   ├── getting-started.md
│   ├── api-reference.md
│   └── best-practices.md
├── LICENSE
├── package.json
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](./CONTRIBUTING.md) first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📊 Statistics

- **Lines of Code**: ~3,000+
- **Constraint Modules**: 10+
- **Supported AI Agents**: Pi Coding Agent (more coming)
- **Bug Patterns Detected**: 15+
- **Languages**: TypeScript

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by the need for safer AI coding tools
- Built on top of the excellent [Pi Coding Agent](https://github.com/earendil-works/pi-coding-agent)
- Thanks to all [contributors](https://github.com/quick123-666/agent-hardening-kit/graphs/contributors)

---

## 📬 Contact

- GitHub: [@quick123-666](https://github.com/quick123-666)
- Issues: [GitHub Issues](https://github.com/quick123-666/agent-hardening-kit/issues)

---

<div align="center">

**⭐ Star this repo if you find it useful!**

Made with ❤️ for safer AI coding

</div>

---

<a name="简体中文"></a>

# 🛡️ Agent Hardening Kit（中文）

<div align="center">

[![许可证: MIT](https://img.shields.io/badge/许可证-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-16+-green.svg)](https://nodejs.org/)

**让 AI 编程代理更安全、更稳定、更可靠。**

[English](#english) · [简体中文](#简体中文) · [日本語](#日本語) · [Español](#español) · [Français](#français)

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
│       ├── README.md
│       ├── PHASE-2-PLAN.md
│       ├── pi-security-constraints.ts
│       ├── pi-stability-constraints.ts
│       └── pi-memory.ts
├── config/
│   └── default.json         # 默认配置
├── docs/                    # 文档
│   ├── getting-started.md
│   ├── api-reference.md
│   └── best-practices.md
├── LICENSE
├── package.json
└── README.md
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

---

<a name="日本語"></a>

# 🛡️ Agent Hardening Kit（日本語）

<div align="center">

[![ライセンス: MIT](https://img.shields.io/badge/ライセンス-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-16+-green.svg)](https://nodejs.org/)

**AIコーディングエージェントをより安全に、より安定して、より信頼性の高いものに。**

[English](#english) · [简体中文](#简体中文) · [日本語](#日本語) · [Español](#español) · [Français](#français)

</div>

---

## ✨ なぜ Agent Hardening Kit が必要なのか？

現代のAIコーディングエージェントは強力ですが壊れやすいです。適切なガードレールがなければ：
- ❌ 重要なシステムファイルを削除する可能性がある
- ❌ `rm -rf /` などの危険なコマンドを実行する
- ❌ 長いセッションでコンテキストを失う
- ❌ 元の要件から逸脱する
- ❌ セッション間でユーザーの好みを忘れる

**Agent Hardening Kit** は、AIコーディングエージェントの**ガードレール**として機能する包括的な制約と拡張機能のセットを提供し、安全で安定した予測可能な動作を保証します。

---

## 🎯 コア機能

### 🔒 セキュリティ制約
- **パスのホワイトリスト** — ファイル操作をプロジェクトディレクトリに制限
- **危険なコマンドのインターセプト** — `rm -rf`、`chmod 777`、`curl|bash` などをブロック
- **コードインジェクション防止** — `eval()`、`exec()`、SQLインジェクション、パストラバーサルを検出
- **バイナリファイル作成のブロック** — `.exe`、`.dll`、`.bat`、`.ps1`、`.sh`を防止
- **コマンドホワイトリスト** — デフォルトで拒否、安全なコマンドのみ許可

### ⚡ 安定性制約
- **セッションラウンド制限** — 無限ループを防ぐ（デフォルト15ラウンド）
- **自動スナップショット** — ファイル変更前にスナップショットを作成
- **ノイズフィルタリング** — 重複エラーとデバッグログをフィルタリング
- **推論終了検出** — 無限の自己反省を防ぐ
- **セッション状態追跡** — 操作履歴を記録

### 📦 配信制約
- **変更粒度の制御** — 変更ごとに最大5ファイル
- **強制配信** — 3回以上の研磨ラウンド後に完了を促す
- **配信進捗追跡** — 視覚的なステータス表示
- **要件の固定** — 要件のドリフトを防ぐ

### 🧠 メモリ拡張
- **長期記憶** — セッション間で知識を永続化
- **自動観察** — 重要な操作を静かに記録
- **セッション横断検索** — 履歴セッションを検索
- **リカバリ mechanism** — 削除されたメモリを復元

---

## 🚀 クイックスタート

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/quick123-666/agent-hardening-kit.git
cd agent-hardening-kit

# 依存関係をインストール
npm install
```

### 基本的な使用方法

```typescript
import {
  createSecurityExtension,
  createStabilityExtension,
  createMemoryExtension,
} from 'agent-hardening-kit';

// セキュリティ制約を作成
const security = createSecurityExtension({
  allowedPaths: ['/path/to/project'],
});

// 安定性制約を作成
const stability = createStabilityExtension({
  maxRounds: 15,
  snapshotEnabled: true,
});

// メモリ拡張を作成
const memory = createMemoryExtension({
  memoryDir: './memory',
  silentMode: true,
});

// 初期化
await Promise.all([security.init(), stability.init(), memory.init()]);
```

### Pi Coding Agent との統合

```bash
# すべての制約を読み込む
pi \
  -e ./examples/pi/pi-security-constraints.ts \
  -e ./examples/pi/pi-stability-constraints.ts \
  -e ./examples/pi/pi-memory.ts
```

---

## 📚 ドキュメント

- 📖 [はじめに](./docs/getting-started.md) — クイックスタートガイド
- 🔧 [API リファレンス](./docs/api-reference.md) — 詳細なAPIドキュメント
- 💡 [ベストプラクティス](./docs/best-practices.md) — 推奨パターン
- 🎓 [Pi Coding Agent ケーススタディ](./examples/pi/README.md) — 完全な例

---

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下でライセンスされています — 詳細は [LICENSE](./LICENSE) ファイルを参照してください。

---

<div align="center">

**⭐ 便利だと思ったら、Star をお願いします！**

より安全なAIコーディングのために ❤️ を込めて作成

</div>

---

<a name="español"></a>

# 🛡️ Agent Hardening Kit（Español）

<div align="center">

**Haga que los Agentes de Codificación de IA sean más seguros, estables y confiables.**

[English](#english) · [简体中文](#简体中文) · [日本語](#日本語) · [Español](#español) · [Français](#français)

</div>

---

## ✨ ¿Por qué Agent Hardening Kit?

Los agentes de codificación de IA modernos son poderosos pero frágiles. Sin las barandas adecuadas, pueden:
- ❌ Eliminar archivos críticos del sistema
- ❌ Ejecutar comandos peligrosos como `rm -rf /`
- ❌ Perder contexto en sesiones largas
- ❌ Desviarse de los requisitos originales
- ❌ Olvidar las preferencias del usuario entre sesiones

**Agent Hardening Kit** proporciona un conjunto completo de restricciones y extensiones que actúan como **barandas** para los agentes de codificación de IA, garantizando un comportamiento seguro, estable y predecible.

---

## 🎯 Características Principales

### 🔒 Restricciones de Seguridad
- **Lista blanca de rutas** — Restringir operaciones de archivos a directorios del proyecto
- **Intercepción de comandos peligrosos** — Bloquear `rm -rf`, `chmod 777`, `curl|bash`, etc.
- **Prevención de inyección de código** — Detectar `eval()`, `exec()`, inyección SQL, traversal de rutas
- **Bloqueo de creación de archivos binarios** — Prevenir `.exe`, `.dll`, `.bat`, `.ps1`, `.sh`
- **Lista blanca de comandos** — Denegación por defecto, solo permitir comandos seguros

### ⚡ Restricciones de Estabilidad
- **Límite de rondas de sesión** — Prevenir bucles infinitos (15 rondas por defecto)
- **Instantánea automática** — Crear instantáneas antes de modificaciones de archivos
- **Filtrado de ruido** — Filtrar errores duplicados y registros de depuración
- **Detección de terminación de razonamiento** — Prevenir autorreflexión infinita
- **Seguimiento del estado de la sesión** — Registrar historial de operaciones

### 📦 Restricciones de Entrega
- **Control de granularidad de cambios** — Máximo 5 archivos por cambio
- **Entrega forzada** — Indicar finalización después de 3+ rondas de pulido
- **Seguimiento del progreso de entrega** — Visualización del estado
- **Anclaje de requisitos** — Prevenir la deriva de requisitos

### 🧠 Extensiones de Memoria
- **Memoria a largo plazo** — Persistir conocimiento entre sesiones
- **Observación automática** — Registrar silenciosamente operaciones importantes
- **Búsqueda entre sesiones** — Buscar en sesiones históricas
- **Mecanismo de recuperación** — Restaurar memorias eliminadas

---

## 🚀 Inicio Rápido

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/quick123-666/agent-hardening-kit.git
cd agent-hardening-kit

# Instalar dependencias
npm install
```

### Uso Básico

```typescript
import {
  createSecurityExtension,
  createStabilityExtension,
  createMemoryExtension,
} from 'agent-hardening-kit';

// Crear restricción de seguridad
const security = createSecurityExtension({
  allowedPaths: ['/path/to/project'],
});

// Crear restricción de estabilidad
const stability = createStabilityExtension({
  maxRounds: 15,
  snapshotEnabled: true,
});

// Crear extensión de memoria
const memory = createMemoryExtension({
  memoryDir: './memory',
  silentMode: true,
});

// Inicializar
await Promise.all([security.init(), stability.init(), memory.init()]);
```

---

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT — consulte el archivo [LICENSE](./LICENSE) para más detalles.

---

<div align="center">

**⭐ ¡Dale una Estrella si te resulta útil!**

Hecho con ❤️ para una codificación de IA más segura

</div>

---

<a name="français"></a>

# 🛡️ Agent Hardening Kit（Français）

<div align="center">

**Rendez les Agents de Codage IA plus sûrs, plus stables et plus fiables.**

[English](#english) · [简体中文](#简体中文) · [日本語](#日本語) · [Español](#español) · [Français](#français)

</div>

---

## ✨ Pourquoi Agent Hardening Kit ?

Les agents de codage IA modernes sont puissants mais fragiles. Sans garde-fous appropriés, ils peuvent :
- ❌ Supprimer des fichiers système critiques
- ❌ Exécuter des commandes dangereuses comme `rm -rf /`
- ❌ Perdre le contexte dans les longues sessions
- ❌ S'écarter des exigences initiales
- ❌ Oublier les préférences de l'utilisateur entre les sessions

**Agent Hardening Kit** fournit un ensemble complet de contraintes et d'extensions qui agissent comme **garde-fous** pour les agents de codage IA, garantissant un comportement sûr, stable et prévisible.

---

## 🎯 Fonctionnalités Principales

### 🔒 Contraintes de Sécurité
- **Liste blanche de chemins** — Restreindre les opérations de fichiers aux répertoires du projet
- **Interception des commandes dangereuses** — Bloquer `rm -rf`, `chmod 777`, `curl|bash`, etc.
- **Prévention d'injection de code** — Détecter `eval()`, `exec()`, injection SQL, traversée de chemin
- **Blocage de création de fichiers binaires** — Empêcher `.exe`, `.dll`, `.bat`, `.ps1`, `.sh`
- **Liste blanche de commandes** — Refus par défaut, autoriser uniquement les commandes sûres

### ⚡ Contraintes de Stabilité
- **Limite de tours de session** — Prévenir les boucles infinies (15 tours par défaut)
- **Instantané automatique** — Créer des instantanés avant les modifications de fichiers
- **Filtrage du bruit** — Filtrer les erreurs en double et les journaux de débogage
- **Détection de terminaison de raisonnement** — Prévenir l'auto-réflexion infinie
- **Suivi de l'état de session** — Enregistrer l'historique des opérations

### 📦 Contraintes de Livraison
- **Contrôle de granularité des changements** — Maximum 5 fichiers par changement
- **Livraison forcée** — Inviter à compléter après 3+ tours de polissage
- **Suivi de progression de livraison** — Affichage visuel de l'état
- **Ancrage des exigences** — Prévenir la dérive des exigences

### 🧠 Extensions de Mémoire
- **Mémoire à long terme** — Persistance des connaissances entre les sessions
- **Observation automatique** — Enregistrement silencieux des opérations importantes
- **Recherche inter-sessions** — Rechercher dans les sessions historiques
- **Mécanisme de récupération** — Restaurer les mémoires supprimées

---

## 🚀 Démarrage Rapide

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/quick123-666/agent-hardening-kit.git
cd agent-hardening-kit

# Installer les dépendances
npm install
```

### Utilisation de Base

```typescript
import {
  createSecurityExtension,
  createStabilityExtension,
  createMemoryExtension,
} from 'agent-hardening-kit';

// Créer une contrainte de sécurité
const security = createSecurityExtension({
  allowedPaths: ['/path/to/project'],
});

// Créer une contrainte de stabilité
const stability = createStabilityExtension({
  maxRounds: 15,
  snapshotEnabled: true,
});

// Créer une extension de mémoire
const memory = createMemoryExtension({
  memoryDir: './memory',
  silentMode: true,
});

// Initialiser
await Promise.all([security.init(), stability.init(), memory.init()]);
```

---

## 📄 Licence

Ce projet est sous licence MIT — voir le fichier [LICENSE](./LICENSE) pour plus de détails.

---

<div align="center">

**⭐ Mettez une étoile si vous le trouvez utile !**

Fait avec ❤️ pour un codage IA plus sûr

</div>

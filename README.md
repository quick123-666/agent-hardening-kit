# 🛡️ Agent Hardening Kit

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-16+-green.svg)](https://nodejs.org/)
[![GitHub stars](https://img.shields.io/github/stars/quick123-666/agent-hardening-kit.svg)](https://github.com/quick123-666/agent-hardening-kit/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/quick123-666/agent-hardening-kit.svg)](https://github.com/quick123-666/agent-hardening-kit/network)

**Make AI Coding Agents Safer, More Stable, and More Reliable.**

[English](./README.md) · [简体中文](./README.zh.md) · [日本語](./README.ja.md) · [Español](./README.es.md) · [Français](./README.fr.md)

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

#### Core Principle: Direct Tool Registry Manipulation

Unlike "writing 'don't use bash' in the prompt", we directly manipulate Pi's tool registry:

```typescript
// Remove bash from LLM's tool list entirely
const active = pi.getActiveTools();
const safeTools = active.filter(tool => tool !== "bash");
pi.setActiveTools(safeTools);  // LLM cannot see bash
```

This is **3 layers of protection**:
1. `setActiveTools()` — bash not in LLM's tool list
2. `session_start` hook — auto-disable on every session
3. `tool_call` interceptor — backup protection

#### Load Configurations

```bash
# ===== Maximum Security (disable all commands) =====
pi -e ~/.pi/agent/extensions/pi-disable-bash.ts

# ===== Database Protection =====
pi -e ~/.pi/agent/extensions/pi-disable-bash.ts \
   -e ~/.pi/agent/extensions/pi-no-delete-db.ts

# ===== Complete Security + Mechanism Verify =====
pi -e ~/.pi/agent/extensions/pi-disable-bash.ts \
   -e ~/.pi/agent/extensions/pi-no-delete-db.ts \
   -e ~/.pi/agent/extensions/pi-mechanism-verify.ts
```

#### Extension Examples

See [examples/extensions/README.md](./examples/extensions/README.md) for complete documentation:

| Extension | File | Function |
|-----------|------|----------|
| Disable Bash | `pi-disable-bash.ts` | Remove bash from tool list |
| No Delete DB | `pi-no-delete-db.ts` | Block database deletion |
| Mechanism Verify | `pi-mechanism-verify.ts` | Spike-First reminders |

#### Available Commands

```bash
# Bash control
/bash-status      # View bash tool status
/allow-bash       # Temporarily enable bash
/disable-bash     # Disable bash
/list-tools       # List all available tools

# Database protection
/no-delete-db status
/no-delete-db list
/no-delete-db allow <pattern>
/no-delete-db block <pattern>

# Mechanism verify
/spike <topic>           # Generate spike verification script
/verify <topic> [risk]  # Mark mechanism as verified
/mechanism-status        # View verified mechanisms
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
├── examples/
│   ├── pi/                  # Pi Coding Agent case study
│   │   ├── README.md
│   │   ├── PHASE-2-PLAN.md
│   │   ├── pi-security-constraints.ts
│   │   ├── pi-stability-constraints.ts
│   │   └── pi-memory.ts
│   └── extensions/          # Ready-to-use extensions
│       ├── README.md
│       ├── pi-disable-bash.ts      # 🔴 Disable bash tool
│       ├── pi-no-delete-db.ts      # Database deletion protection
│       └── pi-mechanism-verify.ts  # Spike-First reminders
├── config/
│   └── default.json         # Default configuration
├── docs/                    # Documentation
│   ├── getting-started.md
│   ├── api-reference.md
│   └── best-practices.md
├── scripts/                 # Load scripts
│   └── load-extensions.sh   # Profile-based extension loader
├── README.md                # English
├── README.zh.md             # 简体中文
├── README.ja.md             # 日本語
├── README.es.md             # Español
├── README.fr.md             # Français
├── LICENSE
└── package.json
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

- **Lines of Code**: ~5,000+
- **Extensions**: 3 production-ready + 2 planned
- **Supported AI Agents**: Pi Coding Agent (more coming)
- **Bug Patterns Detected**: 15+
- **Languages**: TypeScript
- **Protection Layers**: 3 (setActiveTools, session_start hook, tool_call interceptor)

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

# 多语言 README 模板使用指南

## 概述

这是 Agent Hardening Kit 使用的**标准多语言 README 模板**，符合 GitHub 的最佳实践。

## 文件命名规范

| 文件名 | 用途 | 示例 |
|--------|------|------|
| `README.md` | **默认显示**（通常是英文） | 必需 |
| `README.zh.md` | 简体中文 | `zh` = Chinese |
| `README.ja.md` | 日文 | `ja` = Japanese |
| `README.es.md` | 西班牙文 | `es` = Spanish |
| `README.fr.md` | 法文 | `fr` = French |
| `README.de.md` | 德文 | `de` = German |
| `README.ko.md` | 韩文 | `ko` = Korean |
| `README.ru.md` | 俄文 | `ru` = Russian |

## 模板结构

### 1. 主 README.md 结构

```markdown
# 🛡️ 项目名称

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-16+-green.svg)](https://nodejs.org/)

**项目一句话定位（英文）**

[English](./README.md) · [简体中文](./README.zh.md) · [日本語](./README.ja.md)

</div>

---

## ✨ Why 项目名称?

问题描述（3-5 个 bullet points）

**核心价值主张**

---

## 🎯 Core Features

### 🔒 模块 A
- 特性 1
- 特性 2

### ⚡ 模块 B
- 特性 1
- 特性 2

---

## 🚀 Quick Start

### Installation

\`\`\`bash
# 克隆仓库
git clone https://github.com/username/repo.git
\`\`\`

### Basic Usage

\`\`\`typescript
// 代码示例
\`\`\`

---

## 📚 Documentation

- 📖 [Getting Started](./docs/getting-started.md)
- 🔧 [API Reference](./docs/api-reference.md)

---

## 🏗️ Architecture

\`\`\`
ASCII 架构图
\`\`\`

### Design Principles

1. 原则 1
2. 原则 2

---

## 📂 Project Structure

\`\`\`
项目目录结构
\`\`\`

---

## 🤝 Contributing

贡献指南

---

## 📊 Statistics

统计数据

---

## 📄 License

许可证信息

---

## 🙏 Acknowledgments

致谢

---

<div align="center">

**⭐ Star this repo if you find it useful!**

</div>
```

### 2. 其他语言 README.{lang}.md 结构

只需翻译 `README.md` 的内容，**但保留**：
- ✅ 文件链接结构
- ✅ 代码示例（按需翻译注释）
- ✅ 项目结构图
- ✅ 设计原则（按需翻译）
- ✅ 语言切换链接（更新为对应语言）

## 完整模板示例

### README.md (English)

```markdown
# 🛡️ Project Name

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-16+-green.svg)](https://nodejs.org/)
[![GitHub stars](https://img.shields.io/github/stars/USERNAME/REPO.svg)](https://github.com/USERNAME/REPO/stargazers)

**One-line project description.**

[English](./README.md) · [简体中文](./README.zh.md) · [日本語](./README.ja.md) · [Español](./README.es.md) · [Français](./README.fr.md)

</div>

---

## ✨ Why Project Name?

Brief problem statement:
- ❌ Pain point 1
- ❌ Pain point 2
- ❌ Pain point 3

**Solution description**

---

## 🎯 Core Features

### 🔒 Feature Group 1
- **Feature 1** — Description
- **Feature 2** — Description

### ⚡ Feature Group 2
- **Feature 1** — Description
- **Feature 2** — Description

---

## 🚀 Quick Start

### Installation

\`\`\`bash
git clone https://github.com/USERNAME/REPO.git
cd REPO
npm install
\`\`\`

### Basic Usage

\`\`\`typescript
import { ... } from 'project-name';
\`\`\`

---

## 📚 Documentation

- 📖 [Getting Started](./docs/getting-started.md)
- 🔧 [API Reference](./docs/api-reference.md)
- 💡 [Best Practices](./docs/best-practices.md)

---

## 🏗️ Architecture

\`\`\`
ASCII architecture diagram
\`\`\`

---

## 📂 Project Structure

\`\`\`
project-name/
├── src/
├── docs/
└── README.md
\`\`\`

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📊 Statistics

- **Lines of Code**: ~X,XXX+
- **Modules**: XX+

---

## 📄 License

MIT License - see [LICENSE](./LICENSE)

---

<div align="center">

**⭐ Star this repo if you find it useful!**

</div>
```

## 使用步骤

### 1. 创建主 README
基于上面的模板，填充项目内容，保存为 `README.md`

### 2. 复制并翻译
复制 `README.md` 的内容，逐个翻译为其他语言：
- `README.zh.md` (简体中文)
- `README.ja.md` (日本語)
- ...

### 3. 更新语言切换链接
在每个文件中，确保语言切换链接指向正确的文件：

\`\`\`markdown
[English](./README.md) · [简体中文](./README.zh.md) · ...
\`\`\`

### 4. 校验
- ✅ 所有文件路径正确
- ✅ 内部链接工作
- ✅ 代码示例语法高亮
- ✅ 徽章链接正确

## 注意事项

1. **保持一致性**：所有语言版本的章节结构应保持一致
2. **代码示例**：代码本身不需要翻译，但注释可以翻译
3. **保留链接**：所有文件链接（`./docs/...`）应保持相对路径
4. **翻译质量**：建议由母语者审校
5. **更新同步**：所有语言版本应同步更新

## GitHub 行为

- **默认显示**：`README.md`
- **自动检测**：GitHub 不会自动切换语言，但会显示所有 `README.{lang}.md` 文件
- **浏览器扩展**：一些扩展（如 "GitHub Language Selector"）可以自动切换
- **第三方工具**：可以使用 [Polyglot](https://github.com/untitaker/polyglot) 等工具自动管理

## 适用场景

✅ **推荐使用**：
- 开源项目
- 国际化项目
- 面向全球用户的产品

❌ **不推荐使用**：
- 内部项目
- 仅本地用户使用
- 个人小项目（会增加维护成本）

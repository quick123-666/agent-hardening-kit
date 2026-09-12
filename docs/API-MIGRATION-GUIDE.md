# API 迁移踩坑记录

> 记录 Pi Coding Agent 扩展 API 变更导致的兼容性问题及解决方案

---

## 📅 时间线

| 日期 | 事件 |
|------|------|
| 2026-09-12 | 发现 agent-hardening-kit 仓库中多个扩展使用旧 API，无法正常工作 |

---

## 🪤 踩坑 1：registerCommand API 不兼容

### 问题描述

Pi Coding Agent 框架更新了扩展 API，导致 `agent-hardening-kit` 仓库中的扩展无法正常注册命令。

### 受影响文件

| 文件 | 行数 | 问题 |
|------|------|------|
| `pi-path-whitelist.ts` | 767 行 | 旧 API |
| `pi-multihop-memory.ts` | 256 行 | 旧 API |
| `pi-multihop-reasoning.ts` | 355 行 | 旧 API |
| `pi-multihop-subagent.ts` | 520 行 | 旧 API |

### 旧 API（不兼容）

```typescript
// ❌ 旧写法 - Pi 框架已不支持
pi.registerCommand({
  name: "bash-status",
  description: "查看 bash 工具状态",
  async execute(ctx) {
    // ctx.args 获取参数
    return { 
      content: [{ 
        type: "text", 
        text: "状态信息" 
      }] 
    };
  },
});
```

### 新 API（当前版本）

```typescript
// ✅ 新写法 - 当前 Pi 框架要求
pi.registerCommand("bash-status", {
  description: "查看 bash 工具状态",
  handler: async (_args, ctx) => {
    // args 直接从参数获取
    ctx.ui.notify("状态信息", "info");
  },
});
```

### 关键差异

| 方面 | 旧 API | 新 API |
|------|--------|--------|
| **注册方式** | `registerCommand({name: "...", ...})` | `registerCommand("name", {...})` |
| **方法名** | `execute(ctx)` | `handler(_args, ctx)` |
| **参数获取** | `ctx.args` | `args` (第一个参数) |
| **返回值** | `return { content: [...] }` | `ctx.ui.notify(message, type)` |
| **提示类型** | 无 | `info` / `warning` / `error` |

---

## 🪤 踩坑 2：import 语句不一致

### 问题描述

不同版本的扩展使用了不同的 import 风格。

### 旧写法

```typescript
// ❌ 混用 require 和 ES module
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as os from "node:os";

function log(config, action, detail) {
  const { appendFileSync } = require("node:fs");  // ❌ 混用
  appendFileSync(config.logFile, line, "utf-8");
}
```

### 新写法

```typescript
// ✅ 统一使用 ES module
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as os from "node:os";
import { appendFileSync } from "node:fs";  // ✅ 统一

function log(config, action, detail) {
  appendFileSync(config.logFile, line, "utf-8");
}
```

---

## 🪤 踩坑 3：ctx.sessionId 可能不存在

### 问题描述

部分扩展直接使用 `ctx.sessionId` 而未做空值检查。

### 问题代码

```typescript
// ❌ 可能报错
const sessionId = ctx.sessionId;
chains.set(sessionId, chain);
```

### 修复代码

```typescript
// ✅ 添加默认值
const sessionId = ctx.sessionId || "default";
chains.set(sessionId, chain);
```

---

## 🪤 踩坑 4：循环引用导致 ctx 未定义

### 问题描述

`pi-multihop-reasoning.ts` 中使用了外部变量 `ctx`，导致可能未定义。

### 问题代码

```typescript
let config: MultiHopConfig;
let ctx: any;  // ❌ 外部变量，可能未初始化

function addStep(sessionId: string, step: ReasoningStep) {
  ctx?.ui?.notify(...);  // 可能报错
}
```

### 修复代码

```typescript
let config: MultiHopConfig;

function addStep(sessionId: string, step: ReasoningStep, ctx: any) {
  ctx?.ui?.notify(...);  // ✅ 通过参数传入
}
```

---

## ✅ 修复清单

### 2026-09-12 修复

| 文件 | 修复内容 | 代码精简 |
|------|---------|---------|
| `pi-path-whitelist.ts` | 迁移到新 API | -563 行 |
| `pi-multihop-memory.ts` | 迁移到新 API | -128 行 |
| `pi-multihop-reasoning.ts` | 迁移到新 API + 修复 ctx | -177 行 |
| `pi-multihop-subagent.ts` | 迁移到新 API | -278 行 |

**总计**：减少约 1100 行冗余代码

### 修复后提交

```
cf8fc60 chore: update all extensions to new Pi API
```

---

## 📋 新旧 API 对照表

### registerCommand

```typescript
// 旧 API (已废弃)
pi.registerCommand({
  name: "command-name",
  description: "描述",
  async execute(ctx) {
    const args = ctx.args || [];
    return { content: [{ type: "text", text: "消息" }] };
  },
});

// 新 API
pi.registerCommand("command-name", {
  description: "描述",
  handler: async (args, ctx) => {
    ctx.ui.notify("消息", "info");
  },
});
```

### registerTool

```typescript
// 旧 API (已废弃)
pi.registerTool({
  name: "tool-name",
  description: "描述",
  parameters: { ... },
  async execute(args, ctx) {
    return { content: [...] };
  },
});

// 新 API
pi.registerTool({
  name: "tool-name",
  description: "描述",
  parameters: { ... },
  handler: async (args, ctx) => {
    return { content: [...] };
  },
});
```

### 事件监听

```typescript
// 事件监听器 API 未变，但注意 ctx 类型
pi.on("tool_call", async (event, ctx) => {
  // event: 事件详情
  // ctx: 上下文对象
});
```

---

## 🛠️ 迁移检查清单

如果你的扩展无法正常工作，检查以下事项：

- [ ] `registerCommand` 使用新 API 格式
- [ ] `handler` 而非 `execute`
- [ ] 使用 `ctx.ui.notify()` 而非返回对象
- [ ] 统一使用 ES module import
- [ ] `ctx.sessionId` 添加默认值
- [ ] 避免外部变量引用 ctx

---

## 📚 相关文档

- [Pi 扩展文档](https://github.com/earendil-works/pi-coding-agent/blob/main/docs/extensions.md)
- [Pi 官方示例](https://github.com/earendil-works/pi-coding-agent/tree/main/examples/extensions)

---

## 🤝 贡献者

- 2026-09-12: 修复所有扩展 API 兼容性 (commit cf8fc60)

---

> 如果你发现新的 API 兼容性问题，请提交 PR 或 Issue！

# 快速开始

本指南将帮助你快速上手 Agent Hardening Kit。

## 前置要求

- Node.js >= 16
- TypeScript >= 4.0（可选，用于自定义扩展）

## 安装

```bash
git clone https://github.com/yourname/agent-hardening-kit.git
cd agent-hardening-kit
npm install
```

## 基础使用

### 1. 创建约束实例

```typescript
import { 
  createSecurityExtension, 
  createStabilityExtension,
  createMemoryExtension 
} from 'agent-hardening-kit';

// 创建安全约束
const security = createSecurityExtension({
  allowedPaths: ['/path/to/project'],
  maxRounds: 20,
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
```

### 2. 执行检查

```typescript
// 初始化
await security.init();
await stability.init();
await memory.init();

// 检查 bash 命令
const result = security.check({
  type: 'bash',
  content: 'rm -rf /',
  round: 1,
  timestamp: Date.now(),
});

if (!result.allowed) {
  console.log('操作被阻止:', result.message);
}
```

### 3. 创建快照

```typescript
// 在重要操作前创建快照
const snapshot = stability.createSnapshot('重要变更', ['file1.ts', 'file2.ts']);
console.log('快照ID:', snapshot.id);
```

## 在 Pi Coding Agent 中使用

Pi Coding Agent 支持通过 `-e` 参数加载扩展：

```bash
pi -e ./agent-hardening-kit/examples/pi/pi-security-constraints.ts
```

完整配置：

```bash
pi \
  -e ./agent-hardening-kit/examples/pi/pi-security-constraints.ts \
  -e ./agent-hardening-kit/examples/pi/pi-stability-constraints.ts \
  -e ./agent-hardening-kit/examples/pi/pi-memory.ts
```

## 常见配置

### 最小配置（仅安全）

```typescript
const security = createSecurityExtension({
  allowedPaths: ['/path/to/project'],
});
```

### 完整配置

```typescript
const security = createSecurityExtension({
  allowedPaths: ['/path/to/project'],
  commandWhitelist: ['ls', 'cat', 'git', 'npm'],
  dangerousExtensions: ['.exe', '.dll', '.bat'],
});

const stability = createStabilityExtension({
  maxRounds: 20,
  snapshotEnabled: true,
  snapshotDir: './snapshots',
});

const memory = createMemoryExtension({
  memoryDir: '~/.pi/agent/memory',
  silentMode: true,
});
```

## 下一步

- [API 参考](./api-reference.md) - 详细的 API 文档
- [最佳实践](./best-practices.md) - 约束使用建议
- [Pi 案例研究](../examples/pi/README.md) - 完整案例

# 最佳实践

本指南提供 Agent Hardening Kit 的最佳实践建议。

## 安全约束

### 路径白名单

**推荐：** 明确设置允许的工作目录

```typescript
const security = createSecurityExtension({
  allowedPaths: [
    '/c/Users/Administrator/Projects/my-app',
    '/c/Users/Administrator/Projects/shared-libs',
  ],
});
```

**避免：** 不设置或设置过于宽泛

```typescript
// ❌ 不好 - 根目录太宽泛
allowedPaths: ['/c/']

// ✅ 好 - 明确项目目录
allowedPaths: ['/c/Users/Administrator/Projects/my-app']
```

### 命令白名单

**推荐：** 只允许必要的命令

```typescript
const security = createSecurityExtension({
  commandWhitelist: [
    'ls', 'cat', 'cd', 'pwd',          // 文件操作
    'git', 'npm', 'node',              // 开发工具
    'find', 'grep', 'head', 'tail',    // 搜索工具
  ],
});
```

### 危险文件类型

**推荐：** 根据项目需求配置

```typescript
// Web 项目
const security = createSecurityExtension({
  dangerousExtensions: ['.exe', '.dll', '.bat'],
});

// 更严格
const security = createSecurityExtension({
  dangerousExtensions: ['.exe', '.dll', '.bat', '.ps1', '.sh', '.cmd'],
});
```

## 稳定性约束

### 轮次配置

**推荐：** 根据会话复杂度调整

```typescript
// 简单任务
const stability = createStabilityExtension({
  maxRounds: 10,
  warningAtRounds: 8,
});

// 复杂任务
const stability = createStabilityExtension({
  maxRounds: 20,
  warningAtRounds: 15,
});
```

### 快照策略

**推荐：** 在关键节点创建快照

```typescript
// 重要操作前
await stability.createSnapshot('添加新功能', ['feature.ts']);

// 模块完成后
await stability.createSnapshot('模块 A 完成', ['module-a/*.ts']);

// 交付前
await stability.createSnapshot('V1.0 交付', allModifiedFiles);
```

## 记忆管理

### 标签使用

**推荐：** 使用有意义的标签

```typescript
await memory.writeLongTerm(
  '用户偏好使用 TypeScript 而不是 JavaScript',
  ['#preference', '#language', '#typescript']
);
```

**避免：** 标签过于通用或重复

```typescript
// ❌ 不好 - 标签太通用
['#note', '#info', '#test']

// ✅ 好 - 具体标签
['#preference', '#api-key-format', '#bug-fix']
```

### 记忆组织

**推荐：** 定期整理记忆

```typescript
// 删除过时记忆
const recoveryId = await memory.forget('旧的配置信息');

// 搜索相关记忆
const results = await memory.search('认证配置');

// 保持记忆精简
const longTerm = await memory.readLongTerm();
if (longTerm.length > 10000) {
  // 归档旧条目
  await memory.archive();
}
```

## 扩展组合

### 推荐配置

**日常开发（推荐）：**

```typescript
const extensions = new CompositeExtension();
extensions.add(createSecurityExtension({ /* 基础配置 */ }));
extensions.add(createMemoryExtension({ silentMode: true }));
extensions.add(createAutoMemoryExtension({ threshold: 0.8 }));
```

**生产环境：**

```typescript
const extensions = new CompositeExtension();
extensions.add(createSecurityExtension({ 
  strict: true,
  commandWhitelist: ['ls', 'cat', 'git', 'npm'],
}));
extensions.add(createStabilityExtension({ 
  maxRounds: 15,
  snapshotEnabled: true,
}));
extensions.add(createReviewGateExtension({ /* 高风险审核 */ }));
```

**最高安全：**

```typescript
const extensions = new CompositeExtension();
extensions.add(createSecurityExtension({ strict: true }));
extensions.add(createDisableBashExtension()); // 完全禁用命令执行
```

## 错误处理

### 检查结果处理

```typescript
const result = extension.check(context);

if (!result.allowed) {
  // 阻止操作
  console.log('操作被阻止:', result.message);
  return;
}

if (result.level === 'warn') {
  // 警告但允许
  console.warn('警告:', result.message);
}
```

### 异常处理

```typescript
try {
  await extension.init();
} catch (error) {
  console.error('扩展初始化失败:', error);
  // 回退到基础模式
  extension = createBasicExtension();
}
```

## 性能优化

### 延迟初始化

```typescript
// 懒加载扩展
const extensions = new CompositeExtension();

async function ensureExtensions() {
  if (extensions.extensions.length === 0) {
    extensions.add(await loadSecurityExtension());
    extensions.add(await loadStabilityExtension());
  }
}

// 按需检查
async function safeCheck(context) {
  await ensureExtensions();
  return extensions.check(context);
}
```

### 缓存配置

```typescript
// 缓存检查结果（对于相同内容）
const cache = new Map();

function cachedCheck(context) {
  const key = `${context.type}:${context.content}`;
  if (cache.has(key)) {
    return cache.get(key);
  }
  const result = extension.check(context);
  cache.set(key, result);
  return result;
}
```

## 调试技巧

### 启用调试日志

```typescript
const security = createSecurityExtension({
  debug: true,  // 启用调试模式
});
```

### 检查扩展状态

```typescript
// 获取扩展状态
const status = {
  security: security.isEnabled(),
  stability: stability.getSessionStatus(),
  memory: await memory.getStatus(),
};

console.log('当前状态:', JSON.stringify(status, null, 2));
```

## 常见问题

### Q: 如何处理误报？

```typescript
const security = createSecurityExtension({
  // 添加白名单规则
  customRules: [
    { pattern: /特定模式/, allow: true },
  ],
});
```

### Q: 如何临时禁用约束？

```typescript
// 临时禁用（不推荐用于生产）
const security = createSecurityExtension({
  enabled: false,  // 完全禁用
});

// 或只禁用特定检查
const security = createSecurityExtension({
  dangerousCommands: [],  // 空数组 = 不检查
});
```

### Q: 如何自定义危险模式？

```typescript
const security = createSecurityExtension({
  dangerousCommands: [
    'rm -rf /',
    'format',
    // 添加自定义
    'dangerous-custom-command',
  ],
  dangerousExtensions: [
    '.exe',
    '.dll',
    // 添加自定义
    '.custom-ext',
  ],
});
```

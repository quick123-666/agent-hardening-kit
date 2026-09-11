# API 参考

## 核心类型

### ConstraintResult

约束检查的返回结果。

```typescript
interface ConstraintResult {
  /** 是否通过检查 */
  allowed: boolean;
  /** 消息 */
  message?: string;
  /** 警告级别 */
  level: 'info' | 'warn' | 'error' | 'block';
}
```

### OperationContext

操作上下文信息。

```typescript
interface OperationContext {
  /** 操作类型 */
  type: 'bash' | 'read' | 'write' | 'edit' | 'delete';
  /** 操作内容 */
  content: string;
  /** 目标路径（如有） */
  targetPath?: string;
  /** 原始命令（如有） */
  rawCommand?: string;
  /** 会话轮次 */
  round: number;
  /** 时间戳 */
  timestamp: number;
}
```

### Extension

扩展接口。

```typescript
interface Extension {
  /** 扩展名称 */
  name: string;
  /** 扩展版本 */
  version: string;
  /** 初始化 */
  init(): Promise<void>;
  /** 约束检查 */
  check(context: OperationContext): ConstraintResult;
  /** 清理 */
  cleanup?(): void;
}
```

## 安全约束

### SecurityConfig

```typescript
interface SecurityConfig extends ConstraintConfig {
  /** 路径白名单 */
  allowedPaths?: string[];
  /** 禁止路径 */
  forbiddenPaths?: string[];
  /** 危险命令列表 */
  dangerousCommands?: string[];
  /** 危险文件扩展名 */
  dangerousExtensions?: string[];
  /** 命令白名单（若设置，则只允许白名单内的命令） */
  commandWhitelist?: string[];
  /** 需要确认的操作 */
  confirmRequired?: string[];
}
```

### createSecurityExtension

创建安全约束扩展实例。

```typescript
function createSecurityExtension(
  config?: Partial<SecurityConfig>
): Extension;
```

**示例：**

```typescript
const security = createSecurityExtension({
  allowedPaths: ['/c/Users/Administrator/Projects'],
  dangerousCommands: ['rm -rf /', 'format'],
  dangerousExtensions: ['.exe', '.dll'],
});
```

## 稳定性约束

### StabilityConfig

```typescript
interface StabilityConfig extends ConstraintConfig {
  /** 最大会话轮次 */
  maxRounds?: number;
  /** 轮次警告阈值 */
  warningAtRounds?: number;
  /** 自动快照 */
  snapshotEnabled?: boolean;
  /** 快照目录 */
  snapshotDir?: string;
  /** 噪声过滤 */
  noiseFilterEnabled?: boolean;
}
```

### createStabilityExtension

创建稳定性约束扩展实例。

```typescript
function createStabilityExtension(
  config?: Partial<StabilityConfig>
): Extension & {
  createSnapshot(description?: string, files?: string[]): Snapshot;
  getSessionStatus(): object;
  reset(): void;
};
```

**示例：**

```typescript
const stability = createStabilityExtension({
  maxRounds: 15,
  warningAtRounds: 12,
  snapshotEnabled: true,
  snapshotDir: './snapshots',
});

// 创建快照
const snapshot = stability.createSnapshot('功能完成', ['file1.ts']);

// 获取状态
const status = stability.getSessionStatus();
```

## 记忆扩展

### MemoryConfig

```typescript
interface MemoryConfig extends ConstraintConfig {
  /** 记忆目录 */
  memoryDir?: string;
  /** 自动观察阈值 */
  autoObserveThreshold?: number;
  /** 静默模式 */
  silentMode?: boolean;
}
```

### createMemoryExtension

创建记忆扩展实例。

```typescript
function createMemoryExtension(
  config?: Partial<MemoryConfig>
): Extension & {
  writeLongTerm(content: string, tags?: string[]): Promise<void>;
  appendDaily(content: string, date?: string): Promise<void>;
  writeScratchpad(items: string[]): Promise<void>;
  readLongTerm(): Promise<string>;
  readDaily(date?: string): Promise<string>;
  readScratchpad(): Promise<string>;
  forget(match: string): Promise<string>;
  restore(recoveryId: string): Promise<void>;
  search(query: string): Promise<{ file: string; matches: string[] }[]>;
  getStatus(): Promise<object>;
};
```

**示例：**

```typescript
const memory = createMemoryExtension({
  memoryDir: './memory',
  silentMode: true,
});

// 写入记忆
await memory.writeLongTerm('用户偏好 TypeScript', ['#preference']);

// 读取记忆
const longTerm = await memory.readLongTerm();

// 搜索
const results = await memory.search('TypeScript');

// 删除（带恢复）
const recoveryId = await memory.forget('过时的信息');
await memory.restore(recoveryId);
```

## BaseExtension

扩展基类，可继承以创建自定义扩展。

```typescript
class BaseExtension implements Extension {
  abstract name: string;
  version: string = '1.0.0';
  
  async init(): Promise<void> {}
  
  check(context: OperationContext): ConstraintResult {
    return { allowed: true, level: 'info' };
  }
  
  cleanup?(): void {}
  
  // 辅助方法
  protected block(message: string): ConstraintResult;
  protected warn(message: string): ConstraintResult;
  protected info(message: string): ConstraintResult;
}
```

### 创建自定义扩展

```typescript
import { BaseExtension, OperationContext, ConstraintResult } from 'agent-hardening-kit';

class MyCustomExtension extends BaseExtension {
  name = 'my-custom-extension';
  
  check(context: OperationContext): ConstraintResult {
    if (context.content.includes('特定关键词')) {
      return this.block('包含不允许的关键词');
    }
    return { allowed: true, level: 'info' };
  }
}
```

## 组合扩展

### CompositeExtension

将多个扩展组合使用。

```typescript
import { CompositeExtension } from 'agent-hardening-kit';

const composite = new CompositeExtension();
composite.add(security);
composite.add(stability);
composite.add(memory);

// 批量添加
composite.addAll(ext1, ext2, ext3);

// 一次性检查所有扩展
const result = composite.check(context);
```

## 工具函数

### 加载配置

```typescript
import { loadConfig } from 'agent-hardening-kit';

const config = loadConfig('./config/default.json');
```

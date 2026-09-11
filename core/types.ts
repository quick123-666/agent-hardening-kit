/**
 * Agent Hardening Kit - 核心类型定义
 */

/**
 * 约束检查结果
 */
export interface ConstraintResult {
  /** 是否通过检查 */
  allowed: boolean;
  /** 消息 */
  message?: string;
  /** 警告级别 */
  level: 'info' | 'warn' | 'error' | 'block';
}

/**
 * 约束配置
 */
export interface ConstraintConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 严格模式 */
  strict?: boolean;
}

/**
 * 安全约束配置
 */
export interface SecurityConfig extends ConstraintConfig {
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

/**
 * 稳定性约束配置
 */
export interface StabilityConfig extends ConstraintConfig {
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

/**
 * 交付约束配置
 */
export interface DeliveryConfig extends ConstraintConfig {
  /** 单次最大变更文件数 */
  maxChangeFiles?: number;
  /** 打磨轮次上限 */
  maxPolishRounds?: number;
  /** 强制交付 */
  forceDelivery?: boolean;
}

/**
 * 记忆配置
 */
export interface MemoryConfig extends ConstraintConfig {
  /** 记忆目录 */
  memoryDir?: string;
  /** 自动观察阈值 */
  autoObserveThreshold?: number;
  /** 静默模式 */
  silentMode?: boolean;
}

/**
 * 操作类型
 */
export type OperationType = 
  | 'bash' 
  | 'read' 
  | 'write' 
  | 'edit' 
  | 'delete';

/**
 * 操作上下文
 */
export interface OperationContext {
  /** 操作类型 */
  type: OperationType;
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

/**
 * 扩展基类接口
 */
export interface Extension {
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

/**
 * 快照信息
 */
export interface Snapshot {
  /** 快照 ID */
  id: string;
  /** 创建时间 */
  createdAt: number;
  /** 描述 */
  description?: string;
  /** 包含的文件 */
  files: string[];
}

/**
 * 交付清单项
 */
export interface DeliveryItem {
  /** 描述 */
  description: string;
  /** 状态 */
  status: 'pending' | 'in-progress' | 'done';
  /** 创建时间 */
  createdAt: number;
  /** 完成时间 */
  completedAt?: number;
}

/**
 * 不做清单项
 */
export interface DonotItem {
  /** 描述 */
  description: string;
  /** 创建时间 */
  createdAt: number;
}

/**
 * 交付清单
 */
export interface DeliveryList {
  /** 待做项 */
  todos: DeliveryItem[];
  /** 不做项 */
  donots: DonotItem[];
  /** 创建时间 */
  createdAt: number;
  /** 最后更新时间 */
  updatedAt: number;
}

/**
 * 记忆条目
 */
export interface MemoryEntry {
  /** 内容 */
  content: string;
  /** 标签 */
  tags?: string[];
  /** 创建时间 */
  createdAt: number;
  /** 来源 */
  source?: string;
}

/**
 * 配置管理器
 */
export interface ConfigManager {
  /** 加载配置 */
  load(): Promise<void>;
  /** 保存配置 */
  save(): Promise<void>;
  /** 获取配置 */
  get<T>(key: string): T | undefined;
  /** 设置配置 */
  set<T>(key: string, value: T): void;
}

/**
 * Agent Hardening Kit - 入口文件
 * 
 * 导出所有核心类型和工厂函数
 */

export * from './types';
export * from './base-extension';

// Re-export example extensions
export {
  createSecurityExtension,
  SecurityConstraintsExtension,
  SecurityConfig,
} from '../examples/pi/pi-security-constraints';

export {
  createStabilityExtension,
  StabilityConstraintsExtension,
  StabilityConfig,
  Snapshot,
} from '../examples/pi/pi-stability-constraints';

export {
  createMemoryExtension,
  MemoryExtension,
  MemoryConfig,
  MemoryEntry,
} from '../examples/pi/pi-memory';

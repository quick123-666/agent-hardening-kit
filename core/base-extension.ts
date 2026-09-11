/**
 * Agent Hardening Kit - 扩展基类
 * 
 * 所有约束扩展都应该继承此类
 */

import { Extension, OperationContext, ConstraintResult, ConstraintConfig } from './types';

export { Extension, OperationContext, ConstraintResult, ConstraintConfig };

/**
 * 基础扩展类
 */
export abstract class BaseExtension implements Extension {
  /** 扩展名称 */
  abstract name: string;
  
  /** 扩展版本 */
  version: string = '1.0.0';
  
  /** 配置文件 */
  protected config: ConstraintConfig = { enabled: true };
  
  /** 初始化 */
  async init(): Promise<void> {
    // 子类可覆盖
  }
  
  /**
   * 约束检查（默认实现）
   */
  check(context: OperationContext): ConstraintResult {
    return {
      allowed: true,
      level: 'info'
    };
  }
  
  /**
   * 清理
   */
  cleanup?(): void {
    // 子类可覆盖
  }
  
  /**
   * 辅助方法：创建阻止结果
   */
  protected block(message: string): ConstraintResult {
    return {
      allowed: false,
      message,
      level: 'block'
    };
  }
  
  /**
   * 辅助方法：创建警告结果
   */
  protected warn(message: string): ConstraintResult {
    return {
      allowed: true,
      message,
      level: 'warn'
    };
  }
  
  /**
   * 辅助方法：创建信息结果
   */
  protected info(message: string): ConstraintResult {
    return {
      allowed: true,
      message,
      level: 'info'
    };
  }
}

/**
 * 组合扩展（将多个扩展组合）
 */
export class CompositeExtension extends BaseExtension {
  name = 'composite';
  private extensions: Extension[] = [];
  
  /**
   * 添加扩展
   */
  add(ext: Extension): void {
    this.extensions.push(ext);
  }
  
  /**
   * 批量添加扩展
   */
  addAll(...exts: Extension[]): void {
    this.extensions.push(...exts);
  }
  
  /**
   * 检查所有扩展
   */
  check(context: OperationContext): ConstraintResult {
    for (const ext of this.extensions) {
      const result = ext.check(context);
      if (!result.allowed) {
        return result;
      }
    }
    return { allowed: true, level: 'info' };
  }
  
  /**
   * 初始化所有扩展
   */
  async init(): Promise<void> {
    await Promise.all(this.extensions.map(ext => ext.init()));
  }
}

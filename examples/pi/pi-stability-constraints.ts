/**
 * Pi Coding Agent - 稳定性保障扩展
 * 
 * 核心功能：
 * - 会话轮次封顶
 * - 自动快照
 * - 噪声过滤
 * - 推理终止检测
 * - 会话状态跟踪
 */

import { Extension, OperationContext, ConstraintResult, StabilityConfig, Snapshot } from '../core/types';
import * as fs from 'fs';
import * as path from 'path';

// ============ 配置 ============

const DEFAULT_CONFIG: StabilityConfig = {
  enabled: true,
  maxRounds: 15,
  warningAtRounds: 12,
  snapshotEnabled: true,
  snapshotDir: './snapshots',
  noiseFilterEnabled: true,
};

// ============ 噪声模式定义 ============

const NOISE_PATTERNS = [
  // 调试日志
  /console\.log\s*\(\s*['"]debug/i,
  /logger\.debug/i,
  /console\.debug/i,
  
  // TODO/FIXME
  /^\s*\/\/\s*(TODO|FIXME|XXX|HACK)/gm,
  /^\s*#\s*(TODO|FIXME|XXX|HACK)/gm,
  
  // 空函数
  /function\s+\w+\s*\(\s*\)\s*{\s*}/g,
  /const\s+\w+\s*=\s*\(\s*\)\s*=>\s*{\s*}/g,
  
  // 重复错误（简化检测）
  /^Error:/mi,
  /^TypeError:/mi,
  /^ReferenceError:/mi,
];

// ============ 推理终止关键词 ============

const REASONING_TERMINATION_KEYWORDS = [
  '无限循环',
  '陷入沉思',
  '不断反思',
  '反复思考同一个问题',
  '无法得出结论',
  '让我再想想',
];

// ============ 稳定性约束扩展 ============

export class StabilityConstraintsExtension implements Extension {
  name = 'pi-stability-constraints';
  version = '1.0.0';
  private config: StabilityConfig;
  private currentRound = 0;
  private snapshots: Snapshot[] = [];
  private operationHistory: string[] = [];
  private errorCounts: Map<string, number> = new Map();

  constructor(config: Partial<StabilityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async init(): Promise<void> {
    console.log('[StabilityConstraints] 稳定性保障已启用');
    console.log(`  最大轮次: ${this.config.maxRounds}`);
    console.log(`  警告阈值: ${this.config.warningAtRounds}`);
    console.log(`  自动快照: ${this.config.snapshotEnabled ? '启用' : '禁用'}`);
    
    // 确保快照目录存在
    if (this.config.snapshotEnabled && this.config.snapshotDir) {
      const dir = path.resolve(this.config.snapshotDir);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * 主检查入口
   */
  check(context: OperationContext): ConstraintResult {
    if (!this.config.enabled) {
      return { allowed: true, level: 'info' };
    }

    this.currentRound = context.round;
    this.recordOperation(context);

    // 1. 轮次检查
    const roundCheck = this.checkRoundLimit();
    if (!roundCheck.allowed) {
      return roundCheck;
    }

    // 2. 轮次警告
    const warningCheck = this.checkRoundWarning();
    if (warningCheck.level === 'warn') {
      return warningCheck;
    }

    // 3. 噪声过滤
    if (this.config.noiseFilterEnabled) {
      const noiseCheck = this.checkNoise(context);
      if (!noiseCheck.allowed) {
        return noiseCheck;
      }
    }

    // 4. 推理终止检测
    const reasoningCheck = this.checkReasoningTermination(context);
    if (!reasoningCheck.allowed) {
      return reasoningCheck;
    }

    return { allowed: true, level: 'info' };
  }

  /**
   * 检查轮次限制
   */
  private checkRoundLimit(): ConstraintResult {
    const maxRounds = this.config.maxRounds || 15;
    
    if (this.currentRound >= maxRounds) {
      return {
        allowed: false,
        message: `⛔ 会话轮次已达上限 (${maxRounds})，请创建新会话或提交当前更改`,
        level: 'block'
      };
    }
    
    return { allowed: true, level: 'info' };
  }

  /**
   * 检查轮次警告
   */
  private checkRoundWarning(): ConstraintResult {
    const warningAt = this.config.warningAtRounds || 12;
    const maxRounds = this.config.maxRounds || 15;
    
    if (this.currentRound >= warningAt && this.currentRound < maxRounds) {
      const remaining = maxRounds - this.currentRound;
      return {
        allowed: true,
        message: `⚠️ 会话轮次较高 (${this.currentRound}/${maxRounds})，剩余 ${remaining} 轮。建议：提交当前更改或创建新会话`,
        level: 'warn'
      };
    }
    
    return { allowed: true, level: 'info' };
  }

  /**
   * 检查噪声
   */
  private checkNoise(context: OperationContext): ConstraintResult {
    const content = context.content;
    
    for (const pattern of NOISE_PATTERNS) {
      if (pattern.test(content)) {
        return {
          allowed: true,
          message: `⚠️ 检测到噪声内容，建议清理`,
          level: 'warn'
        };
      }
    }
    
    return { allowed: true, level: 'info' };
  }

  /**
   * 检查推理终止
   */
  private checkReasoningTermination(context: OperationContext): ConstraintResult {
    const content = context.content;
    
    for (const keyword of REASONING_TERMINATION_KEYWORDS) {
      if (content.includes(keyword)) {
        return {
          allowed: false,
          message: `⛔ 检测到无限推理模式，请停止并提交当前结果`,
          level: 'block'
        };
      }
    }
    
    return { allowed: true, level: 'info' };
  }

  /**
   * 记录操作
   */
  private recordOperation(context: OperationContext): void {
    const op = `[${context.type}] ${context.targetPath || context.content.substring(0, 50)}`;
    this.operationHistory.push(op);
    
    // 记录错误
    if (context.content.includes('Error')) {
      const count = this.errorCounts.get(op) || 0;
      this.errorCounts.set(op, count + 1);
    }
    
    // 限制历史长度
    if (this.operationHistory.length > 100) {
      this.operationHistory.shift();
    }
  }

  /**
   * 创建快照
   */
  createSnapshot(description?: string, files?: string[]): Snapshot {
    const snapshot: Snapshot = {
      id: `snap-${Date.now()}`,
      createdAt: Date.now(),
      description,
      files: files || [],
    };
    
    this.snapshots.push(snapshot);
    
    // 保存到文件
    if (this.config.snapshotEnabled && this.config.snapshotDir) {
      const filePath = path.join(
        this.config.snapshotDir,
        `${snapshot.id}.json`
      );
      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
    }
    
    return snapshot;
  }

  /**
   * 获取会话状态
   */
  getSessionStatus(): object {
    return {
      currentRound: this.currentRound,
      maxRounds: this.config.maxRounds,
      operationCount: this.operationHistory.length,
      snapshotCount: this.snapshots.length,
      recentOperations: this.operationHistory.slice(-10),
      repeatedErrors: Array.from(this.errorCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([op, count]) => ({ op, count })),
    };
  }

  /**
   * 重置会话状态
   */
  reset(): void {
    this.currentRound = 0;
    this.operationHistory = [];
    this.errorCounts.clear();
  }
}

// ============ 导出 ============

export function createStabilityExtension(
  config?: Partial<StabilityConfig>
): Extension {
  return new StabilityConstraintsExtension(config);
}

export { StabilityConfig, Snapshot };

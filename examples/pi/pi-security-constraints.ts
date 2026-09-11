/**
 * Pi Coding Agent - 安全约束扩展
 * 
 * 核心功能：
 * - 路径白名单校验
 * - 危险命令拦截
 * - 危险文件创建拦截
 * - 危险代码模式检测
 * - 命令白名单机制
 * - 交互式确认
 * 
 * 设计原则：零信任安全 + Runtime 硬拦截
 */

import { Extension, OperationContext, ConstraintResult, SecurityConfig } from '../core/types';

// ============ 配置 ============

const DEFAULT_CONFIG: SecurityConfig = {
  enabled: true,
  strict: true,
  allowedPaths: [
    '/c/Users/Administrator/Desktop',
    '/c/Users/Administrator/Desktop/pi',
  ],
  forbiddenPaths: [
    '/c/Windows/System32',
    '/c/Windows/System',
    '/etc',
    '/bin',
    '/sbin',
    '/usr/bin',
    '/usr/sbin',
  ],
  dangerousCommands: [
    'rm -rf /',
    'rm -rf /*',
    'format',
    'chmod 777',
    'curl | bash',
    'wget | bash',
    ':(){:|:&};:',  // Fork bomb
  ],
  dangerousExtensions: [
    '.exe',
    '.dll',
    '.bat',
    '.ps1',
    '.sh',
    '.cmd',
    '.vbs',
    '.scr',
  ],
  commandWhitelist: [
    'ls', 'cat', 'cd', 'pwd', 'mkdir', 'rmdir',
    'npm', 'node', 'git', 'find', 'grep',
    'echo', 'head', 'tail', 'wc', 'sort', 'uniq',
  ],
  confirmRequired: [
    'del', 'rm -rf', 'format', 'shutdown',
  ],
};

// ============ 危险模式定义 ============

const DANGEROUS_CODE_PATTERNS = [
  // 代码注入
  { pattern: /eval\s*\(/gi, name: 'eval() 调用', level: 'high' },
  { pattern: /exec\s*\(/gi, name: 'exec() 调用', level: 'high' },
  { pattern: /subprocess\.\w+\(.*shell\s*=\s*true/gi, name: 'shell=True 注入', level: 'high' },
  
  // SQL 注入
  { pattern: /SELECT.*\+.*FROM/gi, name: 'SQL 拼接', level: 'high' },
  { pattern: /INSERT.*\+.*VALUES/gi, name: 'SQL 拼接', level: 'high' },
  { pattern: /f"SELECT.*{/gi, name: 'f-string SQL', level: 'high' },
  
  // 路径遍历
  { pattern: /\.\.\/|\.\.\\/gi, name: '路径遍历', level: 'medium' },
  { pattern: /\.\.%2f|\.\.%5c/gi, name: '编码路径遍历', level: 'medium' },
  
  // 敏感信息
  { pattern: /password\s*=\s*['"][^'"]+['"]/gi, name: '硬编码密码', level: 'medium' },
  { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/gi, name: '硬编码 API Key', level: 'medium' },
  { pattern: /sk-[a-zA-Z0-9]{20,}/gi, name: 'OpenAI API Key', level: 'high' },
  
  // 命令注入
  { pattern: /os\.system\s*\(/gi, name: 'os.system 调用', level: 'medium' },
  { pattern: /os\.popen\s*\(/gi, name: 'os.popen 调用', level: 'medium' },
];

// ============ 安全约束扩展 ============

export class SecurityConstraintsExtension implements Extension {
  name = 'pi-security-constraints';
  version = '1.0.0';
  private config: SecurityConfig;
  private currentRound = 0;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async init(): Promise<void> {
    console.log('[SecurityConstraints] 安全约束已启用');
  }

  /**
   * 主检查入口
   */
  check(context: OperationContext): ConstraintResult {
    if (!this.config.enabled) {
      return { allowed: true, level: 'info' };
    }

    this.currentRound = context.round;

    switch (context.type) {
      case 'bash':
        return this.checkBash(context);
      case 'write':
      case 'edit':
        return this.checkFileOperation(context);
      case 'read':
        return this.checkReadOperation(context);
      default:
        return { allowed: true, level: 'info' };
    }
  }

  /**
   * 检查 Bash 命令
   */
  private checkBash(context: OperationContext): ConstraintResult {
    const command = context.rawCommand || context.content;

    // 1. 检查危险命令
    for (const dangerous of this.config.dangerousCommands || []) {
      if (command.includes(dangerous)) {
        return {
          allowed: false,
          message: `⛔ 危险命令被拦截: ${dangerous}`,
          level: 'block'
        };
      }
    }

    // 2. 检查命令白名单（如果配置了）
    if (this.config.commandWhitelist && this.config.commandWhitelist.length > 0) {
      const firstWord = command.trim().split(/\s+/)[0];
      const isWhitelisted = this.config.commandWhitelist.some(
        cmd => firstWord === cmd || command.startsWith(cmd + ' ')
      );
      if (!isWhitelisted) {
        return {
          allowed: false,
          message: `⛔ 命令不在白名单中: ${firstWord}`,
          level: 'block'
        };
      }
    }

    // 3. 检查需要确认的操作
    for (const confirm of this.config.confirmRequired || []) {
      if (command.includes(confirm)) {
        return {
          allowed: true,
          message: `⚠️ 此操作需要确认: ${confirm}`,
          level: 'warn'
        };
      }
    }

    return { allowed: true, level: 'info' };
  }

  /**
   * 检查文件操作
   */
  private checkFileOperation(context: OperationContext): ConstraintResult {
    const targetPath = context.targetPath || '';

    // 1. 检查危险文件扩展名
    const ext = this.getFileExtension(targetPath);
    if (ext && (this.config.dangerousExtensions || []).includes(ext)) {
      return {
        allowed: false,
        message: `⛔ 禁止创建危险文件类型: ${ext}`,
        level: 'block'
      };
    }

    // 2. 检查路径白名单
    if (this.config.allowedPaths && this.config.allowedPaths.length > 0) {
      const isAllowed = this.config.allowedPaths.some(path => 
        targetPath.startsWith(path)
      );
      if (!isAllowed) {
        return {
          allowed: false,
          message: `⛔ 路径不在白名单内: ${targetPath}`,
          level: 'block'
        };
      }
    }

    // 3. 检查禁止路径
    for (const forbidden of this.config.forbiddenPaths || []) {
      if (targetPath.startsWith(forbidden)) {
        return {
          allowed: false,
          message: `⛔ 禁止访问系统路径: ${forbidden}`,
          level: 'block'
        };
      }
    }

    // 4. 检查内容中的危险代码模式
    const contentCheck = this.checkDangerousCodePatterns(context.content);
    if (!contentCheck.allowed) {
      return contentCheck;
    }

    return { allowed: true, level: 'info' };
  }

  /**
   * 检查读取操作
   */
  private checkReadOperation(context: OperationContext): ConstraintResult {
    const targetPath = context.targetPath || '';

    // 1. 检查禁止路径
    for (const forbidden of this.config.forbiddenPaths || []) {
      if (targetPath.startsWith(forbidden)) {
        return {
          allowed: false,
          message: `⛔ 禁止读取系统路径: ${forbidden}`,
          level: 'block'
        };
      }
    }

    // 2. 检查系统敏感文件
    const sensitivePatterns = ['/etc/passwd', '/etc/shadow', '/etc/sudoers'];
    for (const pattern of sensitivePatterns) {
      if (targetPath.includes(pattern)) {
        return {
          allowed: false,
          message: `⛔ 禁止读取敏感系统文件`,
          level: 'block'
        };
      }
    }

    return { allowed: true, level: 'info' };
  }

  /**
   * 检查危险代码模式
   */
  private checkDangerousCodePatterns(content: string): ConstraintResult {
    for (const { pattern, name, level } of DANGEROUS_CODE_PATTERNS) {
      pattern.lastIndex = 0; // 重置正则
      if (pattern.test(content)) {
        if (level === 'high') {
          return {
            allowed: false,
            message: `⛔ 检测到危险代码模式: ${name}`,
            level: 'block'
          };
        } else {
          return {
            allowed: true,
            message: `⚠️ 检测到风险代码: ${name}`,
            level: 'warn'
          };
        }
      }
    }
    return { allowed: true, level: 'info' };
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(path: string): string {
    const match = path.match(/\.[^.]+$/);
    return match ? match[0].toLowerCase() : '';
  }
}

// ============ 导出扩展工厂 ============

export function createSecurityExtension(
  config?: Partial<SecurityConfig>
): Extension {
  return new SecurityConstraintsExtension(config);
}

// ============ 使用示例 ============

/*
// 在 Pi 中加载此扩展：
pi -e ./pi-security-constraints.ts

// 自定义配置：
const extension = createSecurityExtension({
  allowedPaths: ['/c/Users/Administrator/Projects'],
  commandWhitelist: ['ls', 'cat', 'git'],
  dangerousExtensions: ['.exe', '.dll'],
});

extension.check({
  type: 'bash',
  content: 'rm -rf /',
  round: 1,
  timestamp: Date.now(),
});
*/

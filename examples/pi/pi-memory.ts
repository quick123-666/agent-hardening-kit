/**
 * Pi Coding Agent - 长期记忆扩展
 * 
 * 核心功能：
 * - 长期记忆读写
 * - 每日日志
 * - 待办事项管理
 * - 跨文件搜索
 * - 恢复机制
 */

import { Extension, OperationContext, ConstraintResult, MemoryConfig, MemoryEntry } from '../core/types';
import * as fs from 'fs';
import * as path from 'path';

// ============ 配置 ============

const DEFAULT_CONFIG: MemoryConfig = {
  enabled: true,
  memoryDir: './memory',
  autoObserveThreshold: 0.7,
  silentMode: false,
};

// ============ 记忆文件定义 ============

interface MemoryFile {
  path: string;
  type: 'long_term' | 'scratchpad' | 'daily' | 'recovery';
}

// ============ 记忆扩展 ============

export class MemoryExtension implements Extension {
  name = 'pi-memory';
  version = '1.0.0';
  private config: MemoryConfig;
  private memoryDir: string;

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.memoryDir = path.resolve(this.config.memoryDir || './memory');
  }

  async init(): Promise<void> {
    console.log('[Memory] 长期记忆已启用');
    console.log(`  存储位置: ${this.memoryDir}`);
    console.log(`  静默模式: ${this.config.silentMode ? '启用' : '禁用'}`);
    
    // 确保目录存在
    this.ensureDirectories();
  }

  /**
   * 确保必要目录存在
   */
  private ensureDirectories(): void {
    const dirs = [
      this.memoryDir,
      path.join(this.memoryDir, 'daily'),
      path.join(this.memoryDir, 'recovery'),
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * 检查入口（记忆扩展主要被动监听，不需要主动拦截）
   */
  check(context: OperationContext): ConstraintResult {
    return { allowed: true, level: 'info' };
  }

  // ============ 记忆写入 ============

  /**
   * 写入长期记忆
   */
  async writeLongTerm(content: string, tags?: string[]): Promise<void> {
    const file = path.join(this.memoryDir, 'MEMORY.md');
    const entry = this.formatEntry(content, tags);
    
    const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '';
    const newContent = existing + '\n' + entry;
    
    fs.writeFileSync(file, newContent);
  }

  /**
   * 追加每日日志
   */
  async appendDaily(content: string, date?: string): Promise<void> {
    const dateStr = date || new Date().toISOString().split('T')[0];
    const file = path.join(this.memoryDir, 'daily', `${dateStr}.md`);
    
    const entry = `<!-- ${new Date().toISOString()} -->\n${content}\n`;
    
    const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '';
    fs.writeFileSync(file, existing + entry);
  }

  /**
   * 写入待办事项
   */
  async writeScratchpad(items: string[]): Promise<void> {
    const file = path.join(this.memoryDir, 'SCRATCHPAD.md');
    const content = items.map(item => `- [ ] ${item}`).join('\n');
    fs.writeFileSync(file, content);
  }

  // ============ 记忆读取 ============

  /**
   * 读取长期记忆
   */
  async readLongTerm(): Promise<string> {
    const file = path.join(this.memoryDir, 'MEMORY.md');
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '';
  }

  /**
   * 读取每日日志
   */
  async readDaily(date?: string): Promise<string> {
    const dateStr = date || new Date().toISOString().split('T')[0];
    const file = path.join(this.memoryDir, 'daily', `${dateStr}.md`);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '';
  }

  /**
   * 读取待办事项
   */
  async readScratchpad(): Promise<string> {
    const file = path.join(this.memoryDir, 'SCRATCHPAD.md');
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '';
  }

  // ============ 记忆删除与恢复 ============

  /**
   * 删除记忆（带恢复记录）
   */
  async forget(match: string): Promise<string> {
    const recoveryId = `rec-${Date.now()}`;
    const recoveryDir = path.join(this.memoryDir, 'recovery');
    
    // 读取并处理 MEMORY.md
    const file = path.join(this.memoryDir, 'MEMORY.md');
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      const removed: string[] = [];
      const kept: string[] = [];
      
      for (const line of lines) {
        if (line.toLowerCase().includes(match.toLowerCase())) {
          removed.push(line);
        } else {
          kept.push(line);
        }
      }
      
      if (removed.length > 0) {
        // 保存恢复记录
        const recoveryFile = path.join(recoveryDir, `${recoveryId}.txt`);
        fs.writeFileSync(recoveryFile, removed.join('\n'));
        
        // 更新原文件
        fs.writeFileSync(file, kept.join('\n'));
      }
    }
    
    return recoveryId;
  }

  /**
   * 恢复已删除的记忆
   */
  async restore(recoveryId: string): Promise<void> {
    const recoveryFile = path.join(this.memoryDir, 'recovery', `${recoveryId}.txt`);
    
    if (fs.existsSync(recoveryFile)) {
      const recovered = fs.readFileSync(recoveryFile, 'utf-8');
      const targetFile = path.join(this.memoryDir, 'MEMORY.md');
      
      const existing = fs.existsSync(targetFile) ? fs.readFileSync(targetFile, 'utf-8') : '';
      fs.writeFileSync(targetFile, existing + '\n' + recovered);
      
      // 删除恢复文件
      fs.unlinkSync(recoveryFile);
    }
  }

  // ============ 搜索 ============

  /**
   * 搜索记忆
   */
  async search(query: string): Promise<{ file: string; matches: string[] }[]> {
    const results: { file: string; matches: string[] }[] = [];
    
    // 搜索所有 md 文件
    const files = this.findMarkdownFiles(this.memoryDir);
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      const matches = lines.filter(line => 
        line.toLowerCase().includes(query.toLowerCase())
      );
      
      if (matches.length > 0) {
        results.push({
          file: path.relative(this.memoryDir, file),
          matches,
        });
      }
    }
    
    return results;
  }

  /**
   * 递归查找 markdown 文件
   */
  private findMarkdownFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        files.push(...this.findMarkdownFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  // ============ 工具方法 ============

  /**
   * 格式化记忆条目
   */
  private formatEntry(content: string, tags?: string[]): string {
    const tagStr = tags && tags.length > 0 
      ? tags.map(t => `#${t}`).join(' ') + '\n' 
      : '';
    return `\n<!-- ${new Date().toISOString()} -->\n${tagStr}${content}`;
  }

  /**
   * 获取记忆系统状态
   */
  async getStatus(): Promise<object> {
    const files = this.findMarkdownFiles(this.memoryDir);
    const longTerm = await this.readLongTerm();
    const scratchpad = await this.readScratchpad();
    
    return {
      memoryDir: this.memoryDir,
      totalFiles: files.length,
      longTermEntries: longTerm.split('<!--').length - 1,
      scratchpadItems: scratchpad.split('- [ ]').length - 1,
      recoveryCount: fs.existsSync(path.join(this.memoryDir, 'recovery'))
        ? fs.readdirSync(path.join(this.memoryDir, 'recovery')).length
        : 0,
    };
  }
}

// ============ 导出 ============

export function createMemoryExtension(config?: Partial<MemoryConfig>): Extension {
  return new MemoryExtension(config);
}

export { MemoryConfig, MemoryEntry };

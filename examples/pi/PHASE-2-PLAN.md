# Pi Coding Agent 约束改造 - Phase 2 增强计划

> **计划日期**：2025-01-XX  
> **目标**：实现 AI Bug 筛查、Git 快照升级、指令防漂移

---

## 一、目标概述

### 1.1 三个改进项

| 改进项 | 优先级 | 难度 | 预期效果 |
|--------|--------|------|---------|
| **AI Bug 筛查** | 🟡 中 | ⭐⭐ | 检测空异常、硬编码、TODO等 |
| **Git 快照升级** | 🟡 中 | ⭐⭐ | 真正的 git commit |
| **指令防漂移** | 🟡 中 | ⭐⭐ | 锚定原始需求 |

### 1.2 核心价值

```
┌─────────────────────────────────────────────────────────────┐
│  AI Bug 筛查                                              │
│  ├── 自动检测 AI 常见缺陷                                  │
│  ├── 提升代码质量                                          │
│  └── 减少人工 review 负担                                  │
├─────────────────────────────────────────────────────────────┤
│  Git 快照升级                                             │
│  ├── 真正的版本控制                                        │
│  ├── 改崩可回滚到任意版本                                   │
│  └── 与现有 Git 工作流集成                                  │
├─────────────────────────────────────────────────────────────┤
│  指令防漂移                                               │
│  ├── 锚定原始需求权重                                      │
│  ├── 防止任务逐步偏移                                      │
│  └── 保持多轮迭代一致性                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、详细设计

### 2.1 AI Bug 筛查

#### 2.1.1 问题背景

AI 生成的代码存在固定缺陷模式：

| 缺陷类型 | 示例 | 风险 |
|---------|------|------|
| 空异常 | `catch(e) {}` | 高 |
| 硬编码密码 | `password="xxx"` | 高 |
| API Key 泄露 | `apiKey="sk-xxx"` | 高 |
| console.log 残留 | `console.log()` | 中 |
| TODO/FIXME | `// TODO: xxx` | 中 |
| 空函数 | `function() {}` | 中 |
| 死代码 | `if(false) {}` | 低 |
| Magic Number | `if(status === 1)` | 低 |

#### 2.1.2 设计方案

```typescript
// ai-bug-patterns.ts
export const AI_BUG_PATTERNS = [
  // 高风险
  {
    name: "空异常捕获",
    pattern: /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/g,
    severity: "high",
    message: "检测到空异常捕获，建议添加错误处理逻辑"
  },
  {
    name: "硬编码密码",
    pattern: /(password|passwd|pwd)\s*=\s*['"][^'"]+['"]/gi,
    severity: "high",
    message: "检测到硬编码密码，请使用环境变量"
  },
  {
    name: "API Key 泄露",
    pattern: /(apiKey|api_key|secret|token)\s*=\s*['"][^'"]+['"]/gi,
    severity: "high",
    message: "检测到 API Key 或 Secret，请使用环境变量"
  },
  {
    name: "console.log 残留",
    pattern: /console\.(log|debug|info|warn|error)\s*\(/g,
    severity: "medium",
    message: "检测到 console 输出，建议移除或使用日志框架"
  },
  {
    name: "TODO/FIXME 残留",
    pattern: /\/\/\s*(TODO|FIXME|HACK|XXX):?\s*/gi,
    severity: "medium",
    message: "检测到 TODO/FIXME 注释，请完成或记录到 Issue"
  },
  {
    name: "空函数",
    pattern: /(function\s+\w+\s*\([^)]*\)\s*\{\s*\}|const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{\s*\})/g,
    severity: "medium",
    message: "检测到空函数实现"
  },
  {
    name: "死代码",
    pattern: /if\s*\(\s*false\s*\)/g,
    severity: "low",
    message: "检测到不可达代码"
  },
  {
    name: "Magic Number",
    pattern: /(if|while|switch)\s*\([^)]*===\s*\d+\s*\)/g,
    severity: "low",
    message: "检测到 Magic Number，请使用有意义的常量"
  },
];

// 检测结果
interface BugDetection {
  file: string;
  line: number;
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
  code: string;
}
```

#### 2.1.3 实现流程

```
文件写入/编辑
    ↓
读取文件内容
    ↓
逐行扫描 Bug 模式
    ↓
发现 Bug?
    ├── 是 → 记录并通知用户
    └── 否 → 完成
    ↓
是否阻止写入?
    └── 高风险可配置阻止
```

#### 2.1.4 交互设计

```typescript
// 检测到 Bug 时的通知
ctx.ui.notify(
  `🤖 AI Bug 筛查报告\n\n` +
  `文件: ${filePath}\n` +
  `发现问题: ${bugs.length} 个\n\n` +
  `${bugs.map(b => `⚠️ [${b.severity.toUpperCase()}] ${b.type}\n  第${b.line}行: ${b.code}`).join('\n\n')}`,
  bugs.some(b => b.severity === "high") ? "warning" : "info"
);
```

---

### 2.2 Git 快照升级

#### 2.2.1 问题背景

当前快照功能只是记录元数据，无法：
- 追踪实际代码变化
- 利用 Git 的版本控制能力
- 在任意版本间回滚

#### 2.2.2 设计方案

```typescript
// git-snapshot.ts

interface GitSnapshotConfig {
  /** 是否启用 Git 快照 */
  enabled: boolean;
  /** 快照消息前缀 */
  prefix: string;
  /** 是否自动 commit */
  autoCommit: boolean;
  /** 最大快照数量（超过后 squash） */
  maxSnapshots: number;
  /** 忽略的文件模式 */
  ignorePatterns: string[];
}

const DEFAULT_CONFIG: GitSnapshotConfig = {
  enabled: true,
  prefix: "[Pi-Auto] ",
  autoCommit: true,
  maxSnapshots: 20,
  ignorePatterns: [
    "node_modules/**",
    ".git/**",
    "dist/**",
    "build/**",
    "*.log",
  ],
};

class GitSnapshotManager {
  private cwd: string;
  private config: GitSnapshotConfig;

  constructor(cwd: string, config: Partial<GitSnapshotConfig> = {}) {
    this.cwd = cwd;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // 检查是否是 Git 仓库
  async isGitRepo(): Promise<boolean> {
    const result = await exec("git", ["rev-parse", "--is-inside-work-tree"], this.cwd);
    return result.stdout.trim() === "true";
  }

  // 创建快照
  async createSnapshot(message: string): Promise<string | null> {
    if (!this.config.enabled) return null;
    if (!await this.isGitRepo()) return null;

    try {
      // git add .
      await exec("git", ["add", "-A"], this.cwd);

      // 检查是否有变更
      const status = await exec("git", ["status", "--porcelain"], this.cwd);
      if (!status.stdout.trim()) {
        console.log("[Git] No changes to snapshot");
        return null;
      }

      // git commit
      const fullMessage = `${this.config.prefix}${message}`;
      const result = await exec(
        "git",
        ["commit", "-m", fullMessage],
        this.cwd
      );

      // 获取 commit hash
      const hash = await exec(
        "git",
        ["rev-parse", "--short", "HEAD"],
        this.cwd
      );

      console.log(`[Git] Created snapshot: ${hash.stdout.trim()}`);
      return hash.stdout.trim();
    } catch (err) {
      console.log(`[Git] Snapshot failed: ${err}`);
      return null;
    }
  }

  // 列出快照
  async listSnapshots(count: number = 10): Promise<Array<{
    hash: string;
    message: string;
    date: string;
  }>> {
    if (!await this.isGitRepo()) return [];

    const result = await exec(
      "git",
      ["log", `--pretty=format:%h|%s|%ad`, `--date=short`, `-n`, count.toString()],
      this.cwd
    );

    return result.stdout.trim().split('\n')
      .filter(line => line.includes("[Pi-Auto]"))
      .map(line => {
        const [hash, message, date] = line.split('|');
        return { hash, message, date };
      });
  }

  // 回滚到指定快照
  async rollbackTo(hash: string): Promise<boolean> {
    try {
      await exec("git", ["revert", "--no-commit", hash], this.cwd);
      await exec("git", ["add", "-A"], this.cwd);
      await exec("git", ["commit", "-m", `[Pi] Reverted to ${hash}`], this.cwd);
      return true;
    } catch (err) {
      console.log(`[Git] Rollback failed: ${err}`);
      return false;
    }
  }

  // 清理旧快照（squash）
  async cleanupSnapshots(): Promise<void> {
    const snapshots = await this.listSnapshots(this.config.maxSnapshots + 10);
    if (snapshots.length <= this.config.maxSnapshots) return;

    // 保留最新的 N 个
    const toKeep = snapshots.slice(0, this.config.maxSnapshots);
    const toSquash = snapshots.slice(this.config.maxSnapshots);

    if (toSquash.length > 0) {
      console.log(`[Git] Would squash ${toSquash.length} old snapshots`);
      // 实现 squash 逻辑
    }
  }
}
```

#### 2.2.3 使用流程

```
用户请求修改文件
    ↓
GitSnapshotManager.createSnapshot("Before modify: src/index.ts")
    ↓
执行文件写入
    ↓
GitSnapshotManager.createSnapshot("After modify: src/index.ts")
    ↓
通知用户
```

#### 2.2.4 命令设计

| 命令 | 说明 |
|------|------|
| `/git-snapshots` | 列出最近快照 |
| `/git-snapshot` | 创建手动快照 |
| `/git-rollback <hash>` | 回滚到指定版本 |
| `/git-diff <hash>` | 查看快照差异 |

---

### 2.3 指令防漂移

#### 2.3.1 问题背景

多轮迭代中会出现：
- 原始需求权重衰减
- 微调指令覆盖主任务
- 任务逐步偏移

#### 2.3.2 设计方案

```typescript
// drift-prevention.ts

interface Requirement {
  text: string;
  timestamp: number;
  turn: number;
  priority: number;
}

interface DriftPreventionConfig {
  /** 启用指令防漂移 */
  enabled: boolean;
  /** 锚定刷新频率（每 N 轮） */
  refreshInterval: number;
  /** 是否在系统提示中显示锚定 */
  showInSystemPrompt: boolean;
  /** 锚定保留的最大轮次 */
  maxAnchorAge: number;
}

const DEFAULT_CONFIG: DriftPreventionConfig = {
  enabled: true,
  refreshInterval: 5,    // 每 5 轮刷新锚定
  showInSystemPrompt: true,
  maxAnchorAge: 20,      // 超过 20 轮建议新建会话
};

class DriftPreventionManager {
  private requirements: Requirement[] = [];
  private config: DriftPreventionConfig;

  constructor(config: Partial<DriftPreventionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // 设置原始需求
  setOriginalRequirement(text: string): void {
    this.requirements = [{
      text,
      timestamp: Date.now(),
      turn: 0,
      priority: 1.0,  // 最高权重
    }];
    console.log(`[Drift] Original requirement set: ${text.substring(0, 50)}...`);
  }

  // 添加需求变更
  addRequirement(text: string, turn: number): void {
    // 新需求权重低于原始需求
    const priority = this.requirements.length === 0 ? 1.0 : 0.7;
    
    this.requirements.push({
      text,
      timestamp: Date.now(),
      turn,
      priority,
    });
  }

  // 获取锚定内容（用于注入上下文）
  getAnchorPrompt(): string {
    if (this.requirements.length === 0) return "";

    const original = this.requirements[0];
    const recent = this.requirements.slice(-3);

    let prompt = `【任务锚定】

原始需求（最高优先级）：
${original.text}

`;

    if (recent.length > 1) {
      prompt += `最近变更：
${recent.slice(1).map(r => `- ${r.text}`).join('\n')}
`;
    }

    prompt += `
⚠️ 注意：
- 所有修改必须围绕原始需求展开
- 避免偏离核心任务
- 单次只做一个变更
`;
    return prompt;
  }

  // 检查是否偏移
  checkDrift(newMessage: string): {
    hasDrift: boolean;
    driftScore: number;
    warnings: string[];
  } {
    if (this.requirements.length === 0) {
      return { hasDrift: false, driftScore: 0, warnings: [] };
    }

    const original = this.requirements[0].text;
    const warnings: string[] = [];
    let driftScore = 0;

    // 检测关键词偏移
    const originalKeywords = this.extractKeywords(original);
    const newKeywords = this.extractKeywords(newMessage);
    const overlap = originalKeywords.filter(k => newKeywords.includes(k)).length;
    const drift = 1 - (overlap / Math.max(originalKeywords.length, 1));

    if (drift > 0.7) {
      driftScore = drift;
      warnings.push(`检测到明显的任务偏移 (${Math.round(drift * 100)}%)`);
    }

    // 检测否定词（可能是撤销操作）
    const negationPatterns = [
      /不做了/i, /取消/i, /改为/i, /改成/i, /不用/i, /放弃/i
    ];
    const hasNegation = negationPatterns.some(p => p.test(newMessage));
    if (hasNegation) {
      warnings.push("检测到需求变更，请确认是否需要更新锚定");
    }

    return {
      hasDrift: warnings.length > 0,
      driftScore,
      warnings,
    };
  }

  // 提取关键词
  private extractKeywords(text: string): string[] {
    // 简化实现：提取英文单词和中文短语
    const words = text.toLowerCase()
      .match(/[a-z]{4,}/g) || [];
    return [...new Set(words)];
  }
}
```

#### 2.3.3 使用流程

```
会话开始
    ↓
DriftPreventionManager.setOriginalRequirement(用户第一条消息)
    ↓
每次用户输入
    ↓
检查是否需要刷新锚定（每 N 轮）
    ↓
在 context 事件中注入锚定内容
    ↓
检测到偏移？ → 通知用户
```

#### 2.3.4 事件钩子集成

```typescript
// 集成到现有扩展
pi.on("session_start", async (event, ctx) => {
  driftManager = new DriftPreventionManager();
});

pi.on("context", async (event, ctx) => {
  if (!driftManager.isEnabled()) return;

  // 每 N 轮刷新锚定
  const currentTurn = getSessionState().turnCount;
  if (currentTurn % driftManager.getRefreshInterval() === 0) {
    const anchorPrompt = driftManager.getAnchorPrompt();
    // 注入到上下文末尾
    event.messages.push({
      role: "system",
      content: anchorPrompt,
    });
  }
});

pi.on("message_end", async (event, ctx) => {
  if (event.message.role !== "user") return;

  // 检查偏移
  const drift = driftManager.checkDrift(event.message.content);
  if (drift.hasDrift) {
    ctx.ui.notify(
      `⚠️ 任务偏移警告\n\n${drift.warnings.join('\n')}\n\n建议使用 /drift-reset 重置锚定`,
      "warning"
    );
  }
});
```

#### 2.3.5 命令设计

| 命令 | 说明 |
|------|------|
| `/drift-status` | 查看当前锚定状态 |
| `/drift-reset` | 重置锚定为当前上下文 |
| `/drift-refresh` | 手动刷新锚定 |

---

## 三、实现计划

### 3.1 任务分解

| 任务 | 工作量 | 依赖 |
|------|--------|------|
| 3.1 AI Bug 筛查核心逻辑 | 3h | 无 |
| 3.2 AI Bug 筛查 UI 集成 | 2h | 3.1 |
| 3.3 Git 快照核心逻辑 | 3h | 无 |
| 3.4 Git 快照命令注册 | 1h | 3.3 |
| 3.5 指令防漂移核心逻辑 | 3h | 无 |
| 3.6 指令防漂移事件集成 | 2h | 3.5 |
| 3.7 集成测试 | 3h | 全部 |
| **总计** | **17h** | |

### 3.2 时间安排

```
Day 1:
├── 上午: AI Bug 筛查核心逻辑
├── 下午: AI Bug 筛查 UI 集成
│
Day 2:
├── 上午: Git 快照核心逻辑
├── 下午: Git 快照命令注册
│
Day 3:
├── 上午: 指令防漂移核心逻辑
├── 下午: 指令防漂移事件集成
│
Day 4:
└── 全天: 集成测试
```

---

## 四、文件结构

```
pi-extension/
├── existing files...
│
└── phase2/                    # Phase 2 新增
    ├── ai-bug-scanner.ts      # AI Bug 筛查
    ├── git-snapshot.ts         # Git 快照升级
    └── drift-prevention.ts     # 指令防漂移
```

---

## 五、测试计划

### 5.1 AI Bug 筛查测试

| 测试用例 | 输入 | 预期结果 |
|---------|------|---------|
| 空异常检测 | `try {} catch(e) {}` | 检测到 |
| 硬编码检测 | `password="123456"` | 检测到 |
| API Key 检测 | `apiKey="sk-xxx"` | 检测到 |
| console.log 检测 | `console.log("test")` | 检测到 |
| 正常代码 | `function foo() { return 1; }` | 不检测 |

### 5.2 Git 快照测试

| 测试用例 | 操作 | 预期结果 |
|---------|------|---------|
| 非 Git 目录 | 创建快照 | 跳过 |
| 无变更 | 创建快照 | 跳过 |
| 有变更 | 创建快照 | commit 成功 |
| 列出快照 | `/git-snapshots` | 显示列表 |
| 回滚 | `/git-rollback <hash>` | 回滚成功 |

### 5.3 指令防漂移测试

| 测试用例 | 输入 | 预期结果 |
|---------|------|---------|
| 正常任务 | "实现登录功能" | 锚定成功 |
| 偏移检测 | "帮我写一个游戏" | 检测到偏移 |
| 刷新锚定 | `/drift-refresh` | 刷新成功 |

---

## 六、风险与应对

| 风险 | 可能性 | 影响 | 应对 |
|------|--------|------|------|
| AI Bug 误报 | 🟡 中 | 🟢 低 | 可配置严重级别 |
| Git 操作失败 | 🟢 低 | 🟡 中 | 降级到简单快照 |
| 锚定注入过多 | 🟡 中 | 🟢 低 | 限制注入频率 |

---

## 七、验收标准

### 7.1 AI Bug 筛查

- [ ] 能检测至少 8 种常见 Bug 模式
- [ ] 检测结果准确率 > 80%
- [ ] 支持高/中/低 三级严重性
- [ ] 可配置是否阻止高风险写入

### 7.2 Git 快照

- [ ] 在 Git 仓库中正常工作
- [ ] 支持 create/commit/diff/rollback
- [ ] 与现有 Git 工作流兼容
- [ ] 失败时优雅降级

### 7.3 指令防漂移

- [ ] 能锚定原始需求
- [ ] 能检测任务偏移
- [ ] 每 N 轮自动刷新
- [ ] 支持手动刷新

---

## 八、后续规划

```
Phase 2 完成后 → Phase 3 增强
├── 温度值控制
├── 核心文件保护
└── 静默截断检测
```

---

> **计划版本**：v1.0  
> **创建时间**：2025-01-XX

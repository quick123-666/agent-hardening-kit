# Pi Coding Agent 约束改造案例

本目录展示了如何将 Agent Hardening Kit 应用于 [Pi Coding Agent](https://github.com/earendil-works/pi-coding-agent)。

## 原始问题

Pi Coding Agent 在使用过程中存在以下问题：

### 🔒 安全风险
- 用户尝试执行 `rm -rf /` 等危险命令
- 用户尝试创建 `.exe`、`.bat`、`.ps1` 等危险文件
- 用户尝试读取 `/etc/passwd` 等系统文件
- 恶意代码注入风险

### ⚡ 稳定性问题
- 会话轮次过多导致上下文膨胀
- 重复错误不断出现
- AI 陷入无限反思

### 📦 交付失控
- 需求漂移：AI 偏离原始需求
- 变更粒度过大：一次修改几十个文件
- 交付边界不清：不知道什么时候该结束

### 🧠 缺乏记忆
- 每次都要重新解释项目背景
- 重复的错误不断出现
- 不知道用户的偏好

## 改造方案

### 1. 安全约束扩展

```bash
pi -e ./pi-extension/pi-security-constraints.ts
```

功能：
- ✅ 路径白名单校验
- ✅ 危险命令拦截（rm -rf、chmod 777 等）
- ✅ 危险文件创建拦截（.exe、.bat、.ps1 等）
- ✅ 危险代码模式检测（eval、exec、SQL 注入等）
- ✅ 命令白名单机制
- ✅ 交互式确认

### 2. 稳定性保障扩展

```bash
pi -e ./pi-extension/pi-stability-constraints.ts
```

功能：
- ✅ 会话轮次封顶（默认 15 轮）
- ✅ 轮次警告（12 轮时提醒）
- ✅ 自动快照
- ✅ 噪声过滤
- ✅ 推理终止检测

### 3. 交付收敛扩展

```bash
pi -e ./pi-extension/pi-delivery-constraints.ts
```

功能：
- ✅ V1.0 清单（明确做什么、不做什么）
- ✅ 变更粒度控制（单次最多 5 个文件）
- ✅ 强制交付（打磨超过 3 轮强制产出）
- ✅ 交付进度跟踪

### 4. 长期记忆扩展

```bash
pi -e ./pi-extension/pi-memory.ts \
   -e ./pi-extension/pi-auto-memory.ts \
   -e ./pi-extension/pi-long-session.ts
```

功能：
- ✅ 长期记忆（跨会话持久化）
- ✅ 自动观察（静默记录重要操作）
- ✅ 跨会话检索（搜索历史会话）

## 扩展列表

| 扩展 | 功能 | 推荐场景 |
|------|------|----------|
| `pi-security-constraints.ts` | 安全约束 | 生产环境 |
| `pi-stability-constraints.ts` | 稳定性保障 | 长时间会话 |
| `pi-delivery-constraints.ts` | 交付收敛 | 正式项目 |
| `pi-ai-bug-scanner.ts` | AI Bug 扫描 | 代码审查 |
| `pi-git-snapshot.ts` | Git 快照 | 版本控制 |
| `pi-drift-prevention.ts` | 防漂移 | 复杂需求 |
| `pi-temperature-control.ts` | 温度控制 | 编程场景 |
| `pi-core-file-protection.ts` | 核心文件保护 | 高危操作 |
| `pi-context-monitor.ts` | 上下文监控 | 资源受限 |
| `pi-review-gate.ts` | 人工终审 | 高风险变更 |
| `pi-memory.ts` | 长期记忆 | 日常使用 |
| `pi-auto-memory.ts` | 自动观察 | 懒人模式 |
| `pi-long-session.ts` | 跨会话检索 | 项目开发 |

## 完整加载

```bash
pi \
  -e ~/.pi/agent/extensions/pi-security-constraints.ts \
  -e ~/.pi/agent/extensions/pi-stability-constraints.ts \
  -e ~/.pi/agent/extensions/pi-delivery-constraints.ts \
  -e ~/.pi/agent/extensions/pi-ai-bug-scanner.ts \
  -e ~/.pi/agent/extensions/pi-git-snapshot.ts \
  -e ~/.pi/agent/extensions/pi-drift-prevention.ts \
  -e ~/.pi/agent/extensions/pi-temperature-control.ts \
  -e ~/.pi/agent/extensions/pi-core-file-protection.ts \
  -e ~/.pi/agent/extensions/pi-context-monitor.ts \
  -e ~/.pi/agent/extensions/pi-review-gate.ts \
  -e ~/.pi/agent/extensions/pi-memory.ts \
  -e ~/.pi/agent/extensions/pi-auto-memory.ts \
  -e ~/.pi/agent/extensions/pi-long-session.ts
```

## 效果对比

### 改造前

| 场景 | 表现 |
|------|------|
| 执行 `rm -rf /` | ❌ 直接执行，系统崩溃 |
| 创建 `.exe` 文件 | ❌ 直接创建，可能携带病毒 |
| 读取系统文件 | ❌ 直接读取，信息泄露 |
| 会话过长 | ❌ 上下文无限膨胀 |
| 忘记用户偏好 | ❌ 每次都要重新说 |
| 需求漂移 | ❌ 做着做着就跑偏了 |

### 改造后

| 场景 | 表现 |
|------|------|
| 执行 `rm -rf /` | ✅ 被拦截，提示危险 |
| 创建 `.exe` 文件 | ✅ 被拦截，需要确认 |
| 读取系统文件 | ✅ 被拦截，权限不足 |
| 会话过长 | ✅ 15 轮封顶，自动快照 |
| 忘记用户偏好 | ✅ 永久记忆，自动加载 |
| 需求漂移 | ✅ 每 5 轮重新锚定需求 |

## 技术实现

详见各扩展源代码：
- [pi-security-constraints.ts](./pi-security-constraints.ts)
- [pi-stability-constraints.ts](./pi-stability-constraints.ts)
- [pi-delivery-constraints.ts](./pi-delivery-constraints.ts)

## 经验总结

1. **零信任安全**：LLM 只负责生成指令，所有执行由 Runtime 强制校验
2. **渐进式改造**：从安全约束开始，逐步增加其他约束
3. **可配置性**：不同场景使用不同配置
4. **案例驱动**：每个约束都来自真实问题

## 扩展到其他 Agent

本案例可扩展到其他 AI 编程 Agent：

- **Claude Code**：类似的安全约束和记忆功能
- **Cursor**：IDE 级别的约束集成
- **GitHub Copilot**：更轻量的约束方案

具体适配方案见主项目 [examples/](../../) 目录。

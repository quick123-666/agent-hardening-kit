/**
 * Pi No-Delete-Database Extension (禁止删除数据库硬约束)
 *
 * 基于 Pi 安全约束经验，专门保护数据库不被误删除
 *
 * 保护对象：
 * - Milvus / MySQL / PostgreSQL / MongoDB / Redis / SQLite
 * - DROP DATABASE / DROP TABLE / DROP COLLECTION
 * - DELETE FROM / TRUNCATE
 * - rm -rf 数据库文件
 * - DROP INDEX / DROP SCHEMA
 *
 * 使用方法：
 *   pi -e ~/.pi/agent/extensions/pi-no-delete-db.ts
 *
 * 命令：
 *   /no-delete-db status  - 查看保护状态
 *   /no-delete-db list    - 列出禁用操作
 *   /no-delete-db allow <pattern> - 临时允许特定操作
 *   /no-delete-db block  <pattern> - 永久禁止特定操作
 *   /no-delete-db config  - 查看配置
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@earendil-works/pi-ai";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ============================================================
// 配置
// ============================================================

interface NoDeleteDbConfig {
  enabled: boolean;
  /** 严格模式（默认拒绝所有删除） */
  strict: boolean;
  /** 危险命令模式 */
  patterns: RegExp[];
  /** 受保护的文件路径 */
  protectedPaths: string[];
  /** 白名单（始终允许） */
  whitelist: RegExp[];
  /** 临时允许会话 */
  tempAllowed: Set<string>;
  /** 日志文件 */
  logFile: string;
  /** 是否需要确认（false = 直接阻止） */
  requireConfirm: boolean;
}

const DEFAULT_CONFIG: NoDeleteDbConfig = {
  enabled: true,
  strict: true,
  patterns: [],
  protectedPaths: [],
  whitelist: [],
  tempAllowed: new Set(),
  logFile: path.join(os.homedir(), ".pi", "agent", "logs", "no-delete-db.log"),
  requireConfirm: true,
};

// ============================================================
// 危险操作模式定义
// ============================================================

const DANGEROUS_PATTERNS = [
  // SQL DROP
  {
    name: "DROP DATABASE",
    pattern: /DROP\s+DATABASE\s+/gi,
    severity: "critical",
    description: "删除整个数据库",
  },
  {
    name: "DROP SCHEMA",
    pattern: /DROP\s+SCHEMA\s+/gi,
    severity: "critical",
    description: "删除数据库 Schema",
  },
  {
    name: "DROP TABLE",
    pattern: /DROP\s+TABLE\s+/gi,
    severity: "high",
    description: "删除表",
  },
  {
    name: "DROP INDEX",
    pattern: /DROP\s+INDEX\s+/gi,
    severity: "medium",
    description: "删除索引",
  },

  // SQL DELETE / TRUNCATE
  {
    name: "DELETE FROM",
    pattern: /DELETE\s+FROM\s+/gi,
    severity: "high",
    description: "删除数据（可能清空表）",
  },
  {
    name: "TRUNCATE TABLE",
    pattern: /TRUNCATE\s+(TABLE\s+)?/gi,
    severity: "critical",
    description: "清空表",
  },

  // Milvus
  {
    name: "Milvus DROP COLLECTION",
    pattern: /drop_collection\s*\(/gi,
    severity: "critical",
    description: "删除 Milvus collection",
  },
  {
    name: "Milvus DROP DATABASE",
    pattern: /drop_database\s*\(/gi,
    severity: "critical",
    description: "删除 Milvus 数据库",
  },

  // MongoDB
  {
    name: "MongoDB dropDatabase",
    pattern: /db\.dropDatabase\s*\(/gi,
    severity: "critical",
    description: "删除 MongoDB 数据库",
  },
  {
    name: "MongoDB drop",
    pattern: /\.drop\s*\(/gi,
    severity: "high",
    description: "删除 MongoDB collection",
  },

  // Redis
  {
    name: "Redis FLUSHALL",
    pattern: /FLUSHALL/gi,
    severity: "critical",
    description: "清空 Redis 所有数据库",
  },
  {
    name: "Redis FLUSHDB",
    pattern: /FLUSHDB/gi,
    severity: "critical",
    description: "清空 Redis 数据库",
  },

  // 文件系统
  {
    name: "rm -rf 数据库目录",
    pattern: /rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\s+.*(\.db|\/data\/|\/var\/lib\/(mysql|mongodb|postgres|redis|milvus))/gi,
    severity: "critical",
    description: "递归删除数据库文件",
  },
  {
    name: "rm 数据库文件",
    pattern: /rm\s+.*\.(db|sqlite|sqlite3|sqlitedb)/gi,
    severity: "high",
    description: "删除数据库文件",
  },

  // mysqldump / pg_dump 输出到 /dev/null（绕过备份的删除）
  {
    name: "删除日志和备份",
    pattern: /(rm|truncate)\s+.*\.(log|sql|dump|backup)/gi,
    severity: "medium",
    description: "删除日志或备份文件",
  },
];

// ============================================================
// 白名单（始终允许的操作）
// ============================================================

const DEFAULT_WHITELIST = [
  // 临时表操作
  /^DROP\s+TEMPORARY\s+TABLE/gi,
  // DROP IF EXISTS 测试环境（可选）
  /^DROP\s+TABLE\s+IF\s+EXISTS\s+`test_/gi,
  // SQL 注释行
  /^--.*DROP/,
  // SHOW DROP
  /^SHOW\s+DROP/gi,
];

// ============================================================
// 受保护的路径
// ============================================================

const DEFAULT_PROTECTED_PATHS = [
  // SSH 密钥和认证文件
  "C:/Users/Administrator/.ssh",
  "/home/.ssh",
  "/root/.ssh",
  // 系统配置
  "C:/Users/Administrator/.aws",
  "C:/Users/Administrator/.kube",
  "C:/Windows/System32",
  "/etc/ssh",
  "/etc/nginx",
  // 数据库默认位置
  "/var/lib/mysql",
  "/var/lib/postgresql",
  "/var/lib/mongodb",
  "/var/lib/redis",
  "/var/lib/milvus",
  // Milvus
  "C:/Users/Administrator/Desktop/milvus-cluster-deployment",
  // 用户桌面项目目录
  "D:/001",
];

// ============================================================
// 匹配检查
// ============================================================

interface MatchResult {
  matched: boolean;
  pattern?: typeof DANGEROUS_PATTERNS[0];
  blocked?: boolean;
  reason?: string;
}

function checkCommand(command: string, config: NoDeleteDbConfig): MatchResult {
  if (!config.enabled) {
    return { matched: false };
  }

  // 检查白名单
  for (const wl of config.whitelist) {
    if (wl.test(command)) {
      return { matched: false };
    }
  }

  // 检查危险模式
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.pattern.test(command)) {
      // 检查是否在白名单中
      for (const wl of config.whitelist) {
        if (wl.test(command)) {
          return { matched: false };
        }
      }

      // 检查临时允许
      if (config.tempAllowed.has(pattern.name)) {
        return { matched: true, pattern };
      }

      return {
        matched: true,
        pattern,
        blocked: true,
        reason: `检测到危险操作: ${pattern.name} - ${pattern.description}`,
      };
    }
  }

  // 检查受保护路径
  for (const protectedPath of config.protectedPaths) {
    if (command.includes(protectedPath)) {
      // 检查是否是删除操作
      if (/(rm|del|delete|drop|truncate|erase|wipe)/i.test(command)) {
        return {
          matched: true,
          blocked: true,
          reason: `操作涉及受保护路径: ${protectedPath}`,
        };
      }
    }
  }

  return { matched: false };
}

// ============================================================
// 日志
// ============================================================

function logAction(config: NoDeleteDbConfig, action: string, command: string, blocked: boolean) {
  try {
    fs.mkdirSync(path.dirname(config.logFile), { recursive: true });
    const timestamp = new Date().toISOString();
    const status = blocked ? "BLOCKED" : "ALLOWED";
    const line = `[${timestamp}] [${status}] ${action}: ${command}\n`;
    fs.appendFileSync(config.logFile, line, "utf-8");
  } catch (err) {
    // 忽略日志错误
  }
}

// ============================================================
// 扩展主逻辑
// ============================================================

export default function (pi: ExtensionAPI) {
  const config: NoDeleteDbConfig = {
    ...DEFAULT_CONFIG,
    patterns: [],
    protectedPaths: [...DEFAULT_PROTECTED_PATHS],
    whitelist: [...DEFAULT_WHITELIST],
  };

  console.log("[NoDeleteDB] 数据库保护扩展已加载");
  console.log(`[NoDeleteDB] 保护模式: ${config.strict ? "严格" : "宽松"}`);
  console.log(`[NoDeleteDB] 危险模式数: ${DANGEROUS_PATTERNS.length}`);
  console.log(`[NoDeleteDB] 受保护路径: ${config.protectedPaths.length}`);
  console.log(`[NoDeleteDB] 日志文件: ${config.logFile}`);

  // ============================================================
  // 拦截 Bash 命令
  // ============================================================
  pi.on("bash_execute", async (event, ctx) => {
    const command = event.command || "";
    const result = checkCommand(command, config);

    if (result.matched && result.blocked) {
      logAction(config, "BASH", command, true);

      // 取消执行
      event.preventDefault?.();

      let message = "";
      if (result.pattern) {
        message = `\n[BLOCKED] ${result.reason}\n\n`;
        message += `命令: ${command}\n\n`;
        message += `此操作已被阻止，原因：\n`;
        message += `  - 操作类型: ${result.pattern.name}\n`;
        message += `  - 危险等级: ${result.pattern.severity}\n`;
        message += `  - 说明: ${result.pattern.description}\n\n`;
        message += `如需临时允许此操作，使用：\n`;
        message += `  /no-delete-db allow ${result.pattern.name}\n`;
      } else {
        message = `\n[BLOCKED] ${result.reason}\n`;
      }

      ctx.ui.notify(message, "error");
      console.log(`[NoDeleteDB] BLOCKED: ${command}`);
      return { allowed: false, message: result.reason };
    }

    if (result.matched) {
      logAction(config, "BASH", command, false);
    }

    return { allowed: true };
  });

  // ============================================================
  // 拦截文件写入（保护 .db 文件）
  // ============================================================
  pi.on("file_write", async (event, ctx) => {
    const filePath = event.path || "";

    // 检查是否写入数据库文件
    if (/\.(db|sqlite|sqlite3|sqlitedb)$/i.test(filePath)) {
      // 检查是否是覆盖
      if (fs.existsSync(filePath)) {
        logAction(config, "FILE_OVERWRITE", filePath, true);
        ctx.ui.notify(
          `\n[BLOCKED] 禁止覆盖数据库文件: ${filePath}\n\n` +
          `数据库文件应通过专用工具管理（如 pymilvus、psql 等）`,
          "error"
        );
        event.preventDefault?.();
        return { allowed: false };
      }
    }

    return { allowed: true };
  });

  // ============================================================
  // 拦截文件删除
  // ============================================================
  pi.on("file_delete", async (event, ctx) => {
    const filePath = event.path || "";

    // 检查是否是数据库文件
    if (/\.(db|sqlite|sqlite3|sqlitedb)$/i.test(filePath)) {
      logAction(config, "FILE_DELETE", filePath, true);
      ctx.ui.notify(
        `\n[BLOCKED] 禁止删除数据库文件: ${filePath}\n\n` +
        `如确需删除，请手动操作并承担风险。`,
        "error"
      );
      event.preventDefault?.();
      return { allowed: false };
    }

    // 检查受保护路径
    for (const protectedPath of config.protectedPaths) {
      if (filePath.includes(protectedPath)) {
        logAction(config, "FILE_DELETE_PROTECTED", filePath, true);
        ctx.ui.notify(
          `\n[BLOCKED] 禁止删除受保护路径下的文件: ${filePath}`,
          "error"
        );
        event.preventDefault?.();
        return { allowed: false };
      }
    }

    return { allowed: true };
  });

  // ============================================================
  // 命令：/no-delete-db status
  // ============================================================
  pi.registerCommand("no-delete-db", {
    description: "数据库保护管理（status / list / allow / block / config）",
    handler: async (args, ctx) => {
      const parts = (args || "").trim().split(/\s+/);
      const subCmd = parts[0] || "status";
      const subArg = parts[1];

      switch (subCmd) {
        case "status": {
          let msg = "[数据库保护状态]\n\n";
          msg += `保护启用: ${config.enabled ? "[OK]" : "[OFF]"}\n`;
          msg += `严格模式: ${config.strict ? "是" : "否"}\n`;
          msg += `危险模式数: ${DANGEROUS_PATTERNS.length}\n`;
          msg += `受保护路径数: ${config.protectedPaths.length}\n`;
          msg += `临时允许: ${config.tempAllowed.size}\n`;
          msg += `日志文件: ${config.logFile}\n`;
          ctx.ui.notify(msg, "info");
          break;
        }

        case "list": {
          let msg = "[禁止的操作]\n\n";
          DANGEROUS_PATTERNS.forEach((p, i) => {
            const blocked = config.tempAllowed.has(p.name);
            msg += `${i + 1}. ${p.name} [${p.severity.toUpperCase()}]\n`;
            msg += `   ${p.description}\n`;
            if (blocked) msg += `   [TEMP ALLOWED]\n`;
            msg += `\n`;
          });
          ctx.ui.notify(msg, "info");
          break;
        }

        case "allow": {
          if (!subArg) {
            ctx.ui.notify("用法: /no-delete-db allow <pattern-name>", "warning");
            return;
          }
          const found = DANGEROUS_PATTERNS.find(p => p.name === subArg);
          if (found) {
            config.tempAllowed.add(subArg);
            ctx.ui.notify(`[OK] 临时允许: ${subArg}`, "info");
            logAction(config, "ALLOW", subArg, false);
          } else {
            ctx.ui.notify(`未找到模式: ${subArg}`, "warning");
          }
          break;
        }

        case "block": {
          if (!subArg) {
            ctx.ui.notify("用法: /no-delete-db block <pattern-name>", "warning");
            return;
          }
          if (config.tempAllowed.delete(subArg)) {
            ctx.ui.notify(`[OK] 重新禁止: ${subArg}`, "info");
          } else {
            ctx.ui.notify(`${subArg} 不在临时允许列表中`, "info");
          }
          break;
        }

        case "config": {
          let msg = "[配置详情]\n\n";
          msg += `严格模式: ${config.strict}\n`;
          msg += `日志文件: ${config.logFile}\n\n`;
          msg += `受保护路径:\n`;
          config.protectedPaths.forEach(p => {
            msg += `  - ${p}\n`;
          });
          msg += `\n白名单:\n`;
          config.whitelist.forEach(w => {
            msg += `  - ${w.source}\n`;
          });
          ctx.ui.notify(msg, "info");
          break;
        }

        default:
          ctx.ui.notify(
            "用法:\n" +
            "  /no-delete-db status\n" +
            "  /no-delete-db list\n" +
            "  /no-delete-db allow <pattern>\n" +
            "  /no-delete-db block <pattern>\n" +
            "  /no-delete-db config",
            "info"
          );
      }
    },
  });

  // ============================================================
  // 工具：check_database_command
  // ============================================================
  pi.registerTool({
    name: "check_database_command",
    description: "检查命令是否会删除数据库或数据。用于在执行前验证命令的安全性。",
    parameters: Type.Object({
      command: Type.String({ description: "要检查的命令" }),
    }),
    handler: async (args: { command: string }) => {
      const result = checkCommand(args.command, config);

      if (result.matched) {
        return {
          safe: false,
          matched: true,
          pattern: result.pattern?.name,
          severity: result.pattern?.severity,
          reason: result.reason,
          description: result.pattern?.description,
        };
      }

      return {
        safe: true,
        matched: false,
        message: "命令安全，未检测到删除操作",
      };
    },
  });

  console.log("[NoDeleteDB] 扩展加载完成！可用命令：");
  console.log("  /no-delete-db status   - 查看状态");
  console.log("  /no-delete-db list     - 列出禁用操作");
  console.log("  /no-delete-db allow X  - 临时允许");
  console.log("  /no-delete-db block X  - 重新禁止");
  console.log("  /no-delete-db config   - 查看配置");
}
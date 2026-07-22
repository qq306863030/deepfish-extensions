#!/usr/bin/env node
// ========== 先加载内置模块，用于自动检查依赖 ==========
const os = require('os');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

// 自动检查依赖：没有 node_modules 就自动 install（必须在 npm require 之前执行）
const SCRIPT_DIR = path.resolve(__dirname);
const nmPath = path.join(SCRIPT_DIR, '..', 'node_modules');
if (!require('fs').existsSync(nmPath)) {
  process.stdout.write('⚠️  检测到依赖未安装，正在自动执行 npm install...\n');
  execSync('npm install', { cwd: path.resolve(SCRIPT_DIR, '..'), stdio: 'inherit' });
  process.stdout.write('✅ 依赖安装完成\n');
}

// ========== 现在安全加载 npm 依赖 ==========
const fs = require('fs-extra');
const inquirer = require('inquirer');
const { Client } = require('ssh2');
const SftpClient = require('ssh2-sftp-client');
const SALT = 'ROMAN-123';
const CryptoJS = require('crypto-js');

function encrypt(text) {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, SALT).toString();
}

function decrypt(ciphertext) {
  if (!ciphertext) return '';
  const bytes = CryptoJS.AES.decrypt(ciphertext, SALT);
  return bytes.toString(CryptoJS.enc.Utf8);
}

const CONFIG_FILE = path.join(os.homedir(), '.ssh-remote-control-skill', 'ssh_config.json');

function emptyConfig() {
  return { curSSH: '', list: [] };
}

function ensureConfigFile() {
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.ensureDirSync(path.dirname(CONFIG_FILE));
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(emptyConfig(), null, 2), 'utf8');
  }
}

function readConfig() {
  ensureConfigFile();
  const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
  const config = raw.trim() ? JSON.parse(raw) : emptyConfig();
  if (!config || typeof config !== 'object' || !Array.isArray(config.list)) {
    throw new Error('配置文件格式错误：顶层必须是对象并包含 list 数组');
  }
  if (typeof config.curSSH !== 'string') config.curSSH = '';
  // 迁移：将未加密的明文密码加密存储
  let migrated = false;
  for (const conn of config.list) {
    if (conn.password && !conn._encrypted) {
      conn.password = encrypt(conn.password);
      conn._encrypted = true;
      migrated = true;
    }
  }
  if (migrated) {
    writeConfig(config);
  }
  return config;
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

function safeConnection(conn) {
  return { name: conn.name || '', host: conn.host || '' };
}

// 去掉路径首尾可能带的引号/空白（用户在终端粘贴路径时常见）
function stripQuotes(value) {
  let str = String(value == null ? '' : value).trim();
  if (str.length >= 2) {
    const first = str[0];
    const last = str[str.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      str = str.slice(1, -1).trim();
    }
  }
  return str;
}

function normalizePort(port) {
  const value = port === undefined || port === null || port === '' ? 22 : Number(port);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error('SSH 端口必须是 1-65535 之间的整数');
  }
  return value;
}

function validateConnection(conn, list, originalName) {
  if (!conn || typeof conn !== 'object') throw new Error('连接配置必须是对象');
  const normalized = {
    name: String(conn.name || '').trim(),
    host: String(conn.host || '').trim(),
    port: normalizePort(conn.port),
    username: String(conn.username || '').trim(),
    password: conn.password ? encrypt(String(conn.password)) : '',
    _encrypted: true,
    privateKey: conn.privateKey ? stripQuotes(conn.privateKey) : '',
    passphrase: conn.passphrase ? String(conn.passphrase) : '',
  };

  if (!normalized.name) throw new Error('连接别名 name 不能为空');
  if (!normalized.host) throw new Error('主机地址 host 不能为空');
  if (!normalized.username) throw new Error('登录账号 username 不能为空');
  if (!normalized.password && !normalized.privateKey) throw new Error('必须提供密码或私钥路径中的一种认证方式');

  const duplicatedName = list.some((item) => item.name === normalized.name && item.name !== originalName);
  if (duplicatedName) throw new Error('连接别名 name 不可重复');
  const duplicatedHost = list.some((item) => item.host === normalized.host && item.name !== originalName);
  if (duplicatedHost) throw new Error('主机地址 host 不可重复');
  return normalized;
}

function getCurrentConnection(config) {
  if (!config.list.length) throw new Error('连接列表为空，请先新增远程连接配置');
  const current = config.list.find((item) => item.name === config.curSSH);
  if (!current) throw new Error('当前 curSSH 不存在于连接列表中，请先设置当前连接');
  return current;
}

function buildSshConfig(conn) {
  const sshConfig = {
    host: conn.host,
    port: normalizePort(conn.port),
    username: conn.username,
    readyTimeout: 20000,
    // 允许尝试更多算法，兼容老服务器
    algorithms: {
      serverHostKey: ['ssh-rsa', 'ssh-ed25519', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521', 'rsa-sha2-256', 'rsa-sha2-512'],
    },
  };
  if (conn.privateKey) {
    if (!fs.existsSync(conn.privateKey)) {
      throw new Error(`私钥文件不存在：${conn.privateKey}`);
    }
    sshConfig.privateKey = fs.readFileSync(conn.privateKey);
    if (conn.passphrase) sshConfig.passphrase = conn.passphrase;
  } else {
    sshConfig.password = decrypt(conn.password);
  }
  return sshConfig;
}

// 友好化常见 SSH 连接错误
function describeSshError(err, conn) {
  const raw = err && err.message ? err.message : String(err);
  const target = conn ? `${conn.username}@${conn.host}:${conn.port || 22}` : '';
  if (/All configured authentication methods failed/i.test(raw)) {
    const tips = [
      `SSH 认证失败 (${target})。已使用：${conn && conn.privateKey ? `私钥 ${conn.privateKey}` : '密码'}`,
      '可能原因与排查：',
      '1) 用户名不对：请确认服务器是否允许该用户名登录（如 root/ubuntu/ec2-user 等）。',
      '2) 公钥未授权：服务器 ~/.ssh/authorized_keys 中没有该私钥对应的公钥；',
      `   请在本地执行  ssh-keygen -y -f "${conn && conn.privateKey ? conn.privateKey : '<私钥路径>'}"  得到公钥后，追加到服务器对应用户的 authorized_keys。`,
      '3) 私钥需要口令但未填写 passphrase。',
      '4) 服务器 sshd_config 禁用了 PubkeyAuthentication 或 PermitRootLogin。',
      '5) 选错了私钥（同名不同 key）。',
    ];
    return tips.join('\n');
  }
  if (/ENOTFOUND|getaddrinfo/i.test(raw)) {
    return `无法解析主机：${conn && conn.host}。请检查 host 是否正确。`;
  }
  if (/ECONNREFUSED/i.test(raw)) {
    return `连接被拒绝：${target}。请检查端口是否正确、sshd 是否在监听、安全组/防火墙是否放行。`;
  }
  if (/ETIMEDOUT|Timed out while waiting for handshake/i.test(raw)) {
    return `连接超时：${target}。请检查网络可达性、安全组/防火墙端口是否放行。`;
  }
  if (/Cannot parse privateKey|bad passphrase|integrity check failed|Encrypted private OpenSSH key/i.test(raw)) {
    return `私钥读取失败：${raw}。若私钥已加密，请确保填写了正确的 passphrase；若为新版 OpenSSH 加密格式，请改用未加密的私钥。`;
  }
  return raw;
}

// 测试连接：只建立 SSH 会话再立即关闭
function testConnection(conn) {
  return new Promise((resolve, reject) => {
    const client = new Client();
    let settled = false;
    client
      .on('ready', () => {
        settled = true;
        client.end();
        resolve(true);
      })
      .on('error', (err) => {
        if (settled) return;
        settled = true;
        reject(err);
      })
      .connect(buildSshConfig(conn));
  });
}

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, (answer) => resolve(answer)));
}

async function askConnection(list) {
  const requiredText = (label) => (input) => {
    const value = String(input || '').trim();
    return value ? true : `${label} 不能为空`;
  };
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '请输入连接别名 name：',
      validate: (input) => {
        const value = String(input || '').trim();
        if (!value) return '连接别名 name 不能为空';
        if (list.some((item) => item.name === value)) return '连接别名已存在，请更换';
        return true;
      },
      filter: (input) => String(input || '').trim(),
    },
    {
      type: 'input',
      name: 'host',
      message: '请输入主机地址 host：',
      validate: (input) => {
        const value = String(input || '').trim();
        if (!value) return '主机地址 host 不能为空';
        if (list.some((item) => item.host === value)) return '主机地址已存在，请更换';
        return true;
      },
      filter: (input) => String(input || '').trim(),
    },
    {
      type: 'input',
      name: 'port',
      message: '请输入 SSH 端口 port：',
      default: 22,
      validate: (input) => {
        const value = Number(input);
        if (!Number.isInteger(value) || value < 1 || value > 65535) {
          return 'SSH 端口必须是 1-65535 之间的整数';
        }
        return true;
      },
      filter: (input) => Number(input),
    },
    {
      type: 'input',
      name: 'username',
      message: '请输入登录账号 username：',
      validate: requiredText('登录账号 username'),
      filter: (input) => String(input || '').trim(),
    },
    {
      type: 'list',
      name: 'authType',
      message: '请选择认证方式：',
      default: 'password',
      choices: [
        { name: '密码 password', value: 'password' },
        { name: '私钥 privateKey', value: 'privateKey' },
      ],
    },
    {
      type: 'password',
      name: 'password',
      message: '请输入登录密码：',
      mask: '*',
      when: (ans) => ans.authType === 'password',
      validate: (input) => (input ? true : '登录密码不能为空'),
    },
    {
      type: 'input',
      name: 'privateKey',
      message: '请输入本地私钥文件完整路径：',
      when: (ans) => ans.authType === 'privateKey',
      validate: (input) => {
        const value = stripQuotes(input);
        if (!value) return '私钥路径不能为空';
        if (!fs.existsSync(value)) return '私钥文件不存在，请检查路径';
        return true;
      },
      filter: (input) => stripQuotes(input),
    },
    {
      type: 'password',
      name: 'passphrase',
      message: '如私钥有口令请输入，若没有直接回车：',
      mask: '*',
      when: (ans) => ans.authType === 'privateKey',
    },
  ]);

  return validateConnection(
    {
      name: answers.name,
      host: answers.host,
      port: answers.port,
      username: answers.username,
      password: answers.password || '',
      privateKey: answers.privateKey || '',
      passphrase: answers.passphrase || '',
    },
    list
  );
}

async function addConnectionInteractively() {
  const config = readConfig();
  const conn = await askConnection(config.list);
  config.list.push(conn);
  config.curSSH = conn.name;
  writeConfig(config);
  return safeConnection(conn);
}

async function setCurrentInteractively() {
  const config = readConfig();
  if (!config.list.length) throw new Error('连接列表为空，请先新增远程连接配置');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    while (true) {
      const name = await ask(rl, '请输入要设为当前连接的 name：');
      const trimmed = String(name).trim();
      if (!trimmed) {
        process.stdout.write('输入不能为空，请重新输入。\n');
        continue;
      }
      const target = config.list.find((item) => item.name === trimmed);
      if (!target) {
        process.stdout.write(`错误：连接 "${trimmed}" 不存在，请重新输入。\n`);
        continue;
      }
      config.curSSH = target.name;
      writeConfig(config);
      return safeConnection(target);
    }
  } finally {
    rl.close();
  }
}

async function ensureInitialized() {
  const config = readConfig();
  const validCurrent = config.curSSH && config.list.some((item) => item.name === config.curSSH);
  if (config.list.length && validCurrent) return config;
  const conn = await askConnection(config.list);
  config.list.push(conn);
  config.curSSH = conn.name;
  writeConfig(config);
  return config;
}

async function runCommand(conn, command, cwd, timeoutMs) {
  return new Promise((resolve, reject) => {
    const client = new Client();
    let stdout = '';
    let stderr = '';
    let timeoutHandle = null;
    let settled = false;

    const finalize = (result) => {
      if (settled) return;
      settled = true;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      client.end();
      resolve(result);
    };

    const abort = (err) => {
      if (settled) return;
      settled = true;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      client.end();
      reject(err);
    };

    // 命令执行超时
    if (timeoutMs && timeoutMs > 0) {
      timeoutHandle = setTimeout(() => {
        abort(new Error(`命令执行超时（${timeoutMs} ms）`));
      }, timeoutMs);
    }

    const finalCommand = cwd ? `cd ${shellQuote(cwd)} && ${command}` : command;
    process.stdout.write(`\x1b[32m[执行] ${finalCommand}\x1b[0m`);
    if (timeoutMs) {
      process.stdout.write(` \x1b[33m[超时: ${timeoutMs} ms]\x1b[0m`);
    }
    process.stdout.write('\n');

    client
      .on('ready', () => {
        client.exec(finalCommand, (err, stream) => {
          if (err) {
            abort(err);
            return;
          }
          stream
            .on('close', (code, signal) => {
              finalize({ stdout, stderr, code, signal });
            })
            .on('data', (data) => {
              stdout += data.toString();
            });
          stream.stderr.on('data', (data) => {
            stderr += data.toString();
          });
        });
      })
      .on('error', abort)
      .connect(buildSshConfig(conn));
  });
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function formatBytes(bytes) {
  const num = Number(bytes) || 0;
  if (num < 1024) return `${num} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = num / 1024;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${size.toFixed(2)} ${units[i]}`;
}

function createFileProgress(label) {
  const isTTY = Boolean(process.stdout.isTTY);
  let lastRender = 0;
  let finished = false;
  const startTs = Date.now();

  const render = (transferred, total, force = false) => {
    if (finished) return;
    const now = Date.now();
    if (!force && now - lastRender < 100) return;
    lastRender = now;
    const safeTotal = Number(total) || 0;
    const ratio = safeTotal > 0 ? Math.min(transferred / safeTotal, 1) : 0;
    const percent = (ratio * 100).toFixed(1).padStart(5, ' ');
    const barLen = 24;
    const filled = Math.round(barLen * ratio);
    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
    const elapsed = (now - startTs) / 1000 || 0.001;
    const speed = elapsed > 0 ? transferred / elapsed : 0;
    const line = `${label} [${bar}] ${percent}%  ${formatBytes(transferred)}/${formatBytes(safeTotal)}  ${formatBytes(speed)}/s`;
    if (isTTY) {
      process.stdout.write(`\r${line.padEnd(80, ' ')}`);
    } else {
      process.stdout.write(`${line}\n`);
    }
  };

  return {
    step: (totalTransferred, _chunk, total) => {
      render(totalTransferred, total);
    },
    done: (total) => {
      render(total, total, true);
      finished = true;
      process.stdout.write('\n');
    },
  };
}

async function uploadPath(conn, localPath, remotePath) {
  const sftp = new SftpClient();
  try {
    await sftp.connect(buildSshConfig(conn));
    const stat = fs.statSync(localPath);
    if (stat.isDirectory()) {
      let count = 0;
      const onUpload = (info) => {
        count += 1;
        process.stdout.write(`[上传] (${count}) ${info.source} -> ${info.destination}\n`);
      };
      sftp.on('upload', onUpload);
      try {
        await sftp.uploadDir(localPath, remotePath);
      } finally {
        sftp.removeListener('upload', onUpload);
      }
      process.stdout.write(`[上传完成] 共上传 ${count} 个文件\n`);
      return { localPath, remotePath, files: count };
    }
    const progress = createFileProgress(`[上传] ${path.basename(localPath)}`);
    await sftp.fastPut(localPath, remotePath, { step: progress.step });
    progress.done(stat.size);
    return { localPath, remotePath, size: stat.size };
  } finally {
    await sftp.end().catch(() => undefined);
  }
}

async function downloadPath(conn, remotePath, localPath) {
  const sftp = new SftpClient();
  try {
    await sftp.connect(buildSshConfig(conn));
    const remoteStat = await sftp.stat(remotePath);
    const isDirectory = Boolean(remoteStat.isDirectory || remoteStat.type === 'd');
    if (isDirectory) {
      let count = 0;
      const onDownload = (info) => {
        count += 1;
        process.stdout.write(`[下载] (${count}) ${info.source} -> ${info.destination}\n`);
      };
      sftp.on('download', onDownload);
      try {
        await sftp.downloadDir(remotePath, localPath);
      } finally {
        sftp.removeListener('download', onDownload);
      }
      process.stdout.write(`[下载完成] 共下载 ${count} 个文件\n`);
      return { remotePath, localPath, files: count };
    }
    const progress = createFileProgress(`[下载] ${path.basename(remotePath)}`);
    const totalSize = Number(remoteStat.size) || 0;
    await sftp.fastGet(remotePath, localPath, { step: progress.step });
    progress.done(totalSize);
    return { remotePath, localPath, size: totalSize };
  } finally {
    await sftp.end().catch(() => undefined);
  }
}

function parseCliArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0) return null;

  const action = args[0];
  const params = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    // --key=value 或 --key value
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx > 0) {
        const key = arg.slice(2, eqIdx);
        params[key] = arg.slice(eqIdx + 1);
      } else {
        const key = arg.slice(2);
        if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
          i++;
          params[key] = args[i];
        } else {
          params[key] = true;
        }
      }
    }
    // key=value
    else if (arg.includes('=')) {
      const eqIdx = arg.indexOf('=');
      const key = arg.slice(0, eqIdx);
      params[key] = arg.slice(eqIdx + 1);
    }
  }

  // 尝试将数字字符串转为数字
  for (const key of Object.keys(params)) {
    if (typeof params[key] === 'string') {
      const num = Number(params[key]);
      if (!Number.isNaN(num) && String(num) === params[key]) {
        params[key] = num;
      }
    }
  }

  return { action, options: params };
}

function printUsageAndExit() {
  console.error('用法: node scripts/index.js <action> [--key=value ...]');
  console.error('');
  console.error('可用 actions:');
  console.error('');
  console.error('  连接管理:');
  console.error('    add_connection             交互式添加 SSH 连接');
  console.error('    list_connections           列出所有连接');
  console.error('    switch_connection --name   切换到指定连接');
  console.error('    delete_connection --name   删除指定连接');
  console.error('    set_current_interactive    交互式切换当前连接');
  console.error('    get_config_path            查看配置文件路径');
  console.error('');
  console.error('  远程操作（需要先设置当前连接）:');
  console.error('    test_connection            测试当前连接 SSH 认证');
  console.error('    exec_command --command     远程执行命令');
  console.error('      [--cwd]                    远程工作目录（可选）');
  console.error('      [--timeout]                超时毫秒数（可选）');
  console.error('    upload_path --localPath     上传文件/目录到远程');
  console.error('      --remotePath               远程目标路径');
  console.error('    download_path --remotePath  从远程下载文件/目录');
  console.error('      --localPath                本地目标路径');
  console.error('');
  console.error('示例:');
  console.error('  node scripts/index.js add_connection');
  console.error('  node scripts/index.js list_connections');
  console.error('  node scripts/index.js switch_connection --name my-server');
  console.error('  node scripts/index.js exec_command --command "ls -la" --cwd /root --timeout 600000');
  console.error('  node scripts/index.js upload_path --localPath C:/file.txt --remotePath /root/file.txt');
  console.error('  node scripts/index.js download_path --remotePath /root/file.txt --localPath C:/file.txt');
  process.exit(1);
}

async function main() {
  // 解析参数
  const cliArgs = parseCliArgs(process.argv);
  if (!cliArgs) {
    printUsageAndExit();
  }

  const { action, options: params } = cliArgs;

  // 3. 分发执行
  try {
    // ---- 不需要当前连接的操作 ----
    if (action === 'add_connection') {
      const added = await addConnectionInteractively();
      console.log(JSON.stringify({ success: true, data: { added, message: '连接已添加成功并保存到配置文件。' } }, null, 2));
      return;
    }

    if (action === 'set_current_interactive') {
      const current = await setCurrentInteractively();
      console.log(JSON.stringify({ success: true, data: { current } }, null, 2));
      return;
    }

    if (action === 'list_connections') {
      const config = readConfig();
      const result = { success: true, data: { curSSH: config.curSSH, list: config.list.map(safeConnection) } };
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (action === 'get_config_path') {
      ensureConfigFile();
      const result = { success: true, data: { configPath: CONFIG_FILE } };
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (action === 'delete_connection') {
      const name = String(params.name || '').trim();
      if (!name) throw new Error('删除连接需要提供 --name');
      const config = readConfig();
      const before = config.list.length;
      config.list = config.list.filter((item) => item.name !== name);
      if (config.list.length === before) throw new Error('指定连接不存在');
      if (config.curSSH === name) config.curSSH = config.list[0] ? config.list[0].name : '';
      writeConfig(config);
      const result = { success: true, data: { deleted: name, curSSH: config.curSSH } };
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (action === 'switch_connection') {
      const name = String(params.name || '').trim();
      if (!name) throw new Error('切换连接需要提供 --name');
      const config = readConfig();
      const target = config.list.find((item) => item.name === name);
      if (!target) throw new Error('指定连接不存在');
      config.curSSH = target.name;
      writeConfig(config);
      const result = { success: true, data: { current: safeConnection(target) } };
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    // ---- 需要当前连接的操作 ----
    const config = await ensureInitialized();
    const current = getCurrentConnection(config);

    if (action === 'test_connection') {
      await testConnection(current);
      const result = { success: true, data: { current: safeConnection(current), message: 'SSH 认证成功，连接可用' } };
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (action === 'exec_command') {
      const command = String(params.command || '').trim();
      if (!command) throw new Error('执行远程命令需要提供 --command');
      const timeoutMs = params.timeout !== undefined ? Number(params.timeout) : 0;
      const result = await runCommand(current, command, params.cwd, timeoutMs);
      console.log(JSON.stringify({ success: true, data: result }, null, 2));
      return;
    }

    if (action === 'upload_path') {
      const localPath = stripQuotes(params.localPath);
      const remotePath = stripQuotes(params.remotePath);
      if (!localPath || !remotePath) throw new Error('上传需要提供 --localPath 和 --remotePath');
      const result = await uploadPath(current, localPath, remotePath);
      console.log(JSON.stringify({ success: true, data: result }, null, 2));
      return;
    }

    if (action === 'download_path') {
      const remotePath = stripQuotes(params.remotePath);
      const localPath = stripQuotes(params.localPath);
      if (!remotePath || !localPath) throw new Error('下载需要提供 --remotePath 和 --localPath');
      const result = await downloadPath(current, remotePath, localPath);
      console.log(JSON.stringify({ success: true, data: result }, null, 2));
      return;
    }

    // 未知 action
    throw new Error(`未知 action: "${action}"。可用值: add_connection, list_connections, switch_connection, delete_connection, set_current_interactive, get_config_path, test_connection, exec_command, upload_path, download_path`);

  } catch (err) {
    // 拿到当前连接信息以便给出更精准的诊断
    let conn = null;
    try {
      const cfg = readConfig();
      conn = cfg.list.find((item) => item.name === cfg.curSSH) || null;
    } catch (_) {
      conn = null;
    }
    const result = { success: false, error: describeSshError(err, conn) };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }
}

main();

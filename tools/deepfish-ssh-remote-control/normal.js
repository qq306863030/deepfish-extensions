const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const readline = require('readline');
const inquirer = require('inquirer');
const { Client } = require('ssh2');
const SftpClient = require('ssh2-sftp-client');
const CryptoJS = require('crypto-js');

// ==================== 加解密 ====================

const SALT = 'ROMAN-123';

function encrypt(text) {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, SALT).toString();
}

function decrypt(ciphertext) {
  if (!ciphertext) return '';
  const bytes = CryptoJS.AES.decrypt(ciphertext, SALT);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// ==================== 字符串/数值工具 ====================

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

function tryParseJSON(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return value;
  try { return JSON.parse(trimmed); } catch (_) { return value; }
}

function resolveInvocation(action, options) {
  let resolvedAction = tryParseJSON(action);
  let resolvedOptions = tryParseJSON(options);
  if (resolvedAction && typeof resolvedAction === 'object' && !Array.isArray(resolvedAction)) {
    const obj = resolvedAction;
    const innerOptions = tryParseJSON(obj.options);
    if (innerOptions && typeof innerOptions === 'object') {
      resolvedOptions = innerOptions;
    } else if (!resolvedOptions || typeof resolvedOptions !== 'object') {
      const rest = { ...obj }; delete rest.action; delete rest.options; resolvedOptions = rest;
    }
    resolvedAction = obj.action;
  }
  if (!resolvedOptions || typeof resolvedOptions !== 'object' || Array.isArray(resolvedOptions)) {
    resolvedOptions = {};
  }
  return { action: String(resolvedAction || '').trim(), params: resolvedOptions };
}

function safeConnection(conn) {
  return { name: conn.name || '', host: conn.host || '' };
}

// ==================== 文件传输进度条 ====================

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
    if (isTTY) { process.stdout.write(`\r${line.padEnd(80, ' ')}`); } else { process.stdout.write(`${line}\n`); }
  };

  return {
    step: (totalTransferred, _chunk, total) => { render(totalTransferred, total); },
    done: (total) => { render(total, total, true); finished = true; process.stdout.write('\n'); },
  };
}

// ==================== 配置文件管理 ====================

const CONFIG_FILE = path.join(os.homedir(), '.deepfish-ai', 'external-tools', 'ssh_config.json');

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
  let migrated = false;
  for (const conn of config.list) {
    if (conn.password && !conn._encrypted) {
      conn.password = encrypt(conn.password); conn._encrypted = true; migrated = true;
    }
  }
  if (migrated) writeConfig(config);
  return config;
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
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
  if (list.some((item) => item.name === normalized.name && item.name !== originalName)) throw new Error('连接别名 name 不可重复');
  if (list.some((item) => item.host === normalized.host && item.port === normalized.port && item.name !== originalName)) throw new Error('主机地址和端口组合已存在');
  return normalized;
}

function getCurrentConnection(config) {
  if (!config.list.length) throw new Error('连接列表为空，请先新增远程连接配置');
  const current = config.list.find((item) => item.name === config.curSSH);
  if (!current) throw new Error('当前 curSSH 不存在于连接列表中，请先设置当前连接');
  return current;
}

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, (answer) => resolve(answer)));
}

async function askConnection(list) {
  const requiredText = (label) => (input) => { const value = String(input || '').trim(); return value ? true : `${label} 不能为空`; };
  while (true) {
    try {
      const answers = await inquirer.prompt([
        { type: 'input', name: 'name', message: '请输入连接别名 name：',
          validate: (input) => { const value = String(input || '').trim(); if (!value) return '连接别名 name 不能为空'; if (list.some((item) => item.name === value)) return '连接别名已存在，请更换'; return true; },
          filter: (input) => String(input || '').trim() },
        { type: 'input', name: 'host', message: '请输入主机地址 host：',
          validate: (input) => { const value = String(input || '').trim(); return value ? true : '主机地址 host 不能为空'; },
          filter: (input) => String(input || '').trim() },
        { type: 'input', name: 'port', message: '请输入 SSH 端口 port：', default: 22,
          validate: (input, answers) => { const value = Number(input); if (!Number.isInteger(value) || value < 1 || value > 65535) return 'SSH 端口必须是 1-65535 之间的整数'; if (list.some((item) => item.host === answers.host && item.port === value)) return '该主机地址和端口组合已存在，请更换'; return true; },
          filter: (input) => Number(input) },
        { type: 'input', name: 'username', message: '请输入登录账号 username：', validate: requiredText('登录账号 username'), filter: (input) => String(input || '').trim() },
        { type: 'list', name: 'authType', message: '请选择认证方式：', default: 'password',
          choices: [{ name: '密码 password', value: 'password' }, { name: '私钥 privateKey', value: 'privateKey' }] },
        { type: 'password', name: 'password', message: '请输入登录密码：', mask: '*', when: (ans) => ans.authType === 'password', validate: (input) => (input ? true : '登录密码不能为空') },
        { type: 'input', name: 'privateKey', message: '请输入本地私钥文件完整路径：', when: (ans) => ans.authType === 'privateKey',
          validate: (input) => { const value = stripQuotes(input); if (!value) return '私钥路径不能为空'; if (!fs.existsSync(value)) return '私钥文件不存在，请检查路径'; return true; },
          filter: (input) => stripQuotes(input) },
        { type: 'password', name: 'passphrase', message: '如私钥有口令请输入，若没有直接回车：', mask: '*', when: (ans) => ans.authType === 'privateKey' },
      ]);
      return validateConnection({ name: answers.name, host: answers.host, port: answers.port, username: answers.username, password: answers.password || '', privateKey: answers.privateKey || '', passphrase: answers.passphrase || '' }, list);
    } catch (err) {
      process.stdout.write(`\n\x1b[31m错误：${err.message}\x1b[0m\n请重新输入。\n\n`);
    }
  }
}

async function addConnectionInteractively() {
  const config = readConfig();
  const conn = await askConnection(config.list);
  config.list.push(conn); config.curSSH = conn.name; writeConfig(config);
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
      if (!trimmed) { process.stdout.write('输入不能为空，请重新输入。\n'); continue; }
      const target = config.list.find((item) => item.name === trimmed);
      if (!target) { process.stdout.write('错误：连接 "' + trimmed + '" 不存在，请重新输入。\n'); continue; }
      config.curSSH = target.name; writeConfig(config);
      return safeConnection(target);
    }
  } finally { rl.close(); }
}

async function ensureInitialized() {
  const config = readConfig();
  const validCurrent = config.curSSH && config.list.some((item) => item.name === config.curSSH);
  if (config.list.length && validCurrent) return config;
  const conn = await askConnection(config.list);
  config.list.push(conn); config.curSSH = conn.name; writeConfig(config);
  return config;
}

// ==================== SSH 连接/执行工具 ====================

function buildSshConfig(conn) {
  const sshConfig = {
    host: conn.host,
    port: normalizePort(conn.port),
    username: conn.username,
    readyTimeout: 20000,
    algorithms: { serverHostKey: ['ssh-rsa', 'ssh-ed25519', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521', 'rsa-sha2-256', 'rsa-sha2-512'] },
  };
  if (conn.privateKey) {
    if (!fs.existsSync(conn.privateKey)) throw new Error(`私钥文件不存在：${conn.privateKey}`);
    sshConfig.privateKey = fs.readFileSync(conn.privateKey);
    if (conn.passphrase) sshConfig.passphrase = conn.passphrase;
  } else {
    sshConfig.password = decrypt(conn.password);
  }
  return sshConfig;
}

function describeSshError(err, conn) {
  const raw = err && err.message ? err.message : String(err);
  const target = conn ? `${conn.username}@${conn.host}:${conn.port || 22}` : '';
  if (/All configured authentication methods failed/i.test(raw)) {
    return [
      `SSH 认证失败 (${target})。已使用：${conn && conn.privateKey ? `私钥 ${conn.privateKey}` : '密码'}`,
      '可能原因与排查：',
      '1) 用户名不对：请确认服务器是否允许该用户名登录（如 root/ubuntu/ec2-user 等）。',
      '2) 公钥未授权：服务器 ~/.ssh/authorized_keys 中没有该私钥对应的公钥；',
      `   请在本地执行  ssh-keygen -y -f "${conn && conn.privateKey ? conn.privateKey : '<私钥路径>'}"  得到公钥后，追加到服务器对应用户的 authorized_keys。`,
      '3) 私钥需要口令但未填写 passphrase。',
      '4) 服务器 sshd_config 禁用了 PubkeyAuthentication 或 PermitRootLogin。',
      '5) 选错了私钥（同名不同 key）。',
    ].join('\n');
  }
  if (/ENOTFOUND|getaddrinfo/i.test(raw)) return `无法解析主机：${conn && conn.host}。请检查 host 是否正确。`;
  if (/ECONNREFUSED/i.test(raw)) return `连接被拒绝：${target}。请检查端口是否正确、sshd 是否在监听、安全组/防火墙是否放行。`;
  if (/ETIMEDOUT|Timed out while waiting for handshake/i.test(raw)) return `连接超时：${target}。请检查网络可达性、安全组/防火墙端口是否放行。`;
  if (/Cannot parse privateKey|bad passphrase|integrity check failed|Encrypted private OpenSSH key/i.test(raw)) return `私钥读取失败：${raw}。若私钥已加密，请确保填写了正确的 passphrase；若为新版 OpenSSH 加密格式，请改用未加密的私钥。`;
  return raw;
}

async function sshExec(conn, command, cwd, timeoutMs) {
  return new Promise((resolve, reject) => {
    const client = new Client();
    let stdout = ''; let stderr = ''; let timeoutHandle = null; let settled = false;
    const finalize = (result) => { if (settled) return; settled = true; if (timeoutHandle) clearTimeout(timeoutHandle); client.end(); resolve(result); };
    const abort = (err) => { if (settled) return; settled = true; if (timeoutHandle) clearTimeout(timeoutHandle); client.end(); reject(err); };
    if (timeoutMs && timeoutMs > 0) timeoutHandle = setTimeout(() => abort(new Error(`命令执行超时（${timeoutMs} ms）`)), timeoutMs);
    const finalCommand = cwd ? `cd ${shellQuote(cwd)} && ${command}` : command;
    process.stdout.write(`\x1b[32m[执行] ${finalCommand}\x1b[0m`);
    if (timeoutMs) process.stdout.write(` \x1b[33m[超时: ${timeoutMs} ms]\x1b[0m`);
    process.stdout.write('\n');
    client
      .on('ready', () => {
        client.exec(finalCommand, (err, stream) => {
          if (err) { abort(err); return; }
          stream.on('close', (code, signal) => finalize({ stdout, stderr, code, signal }))
            .on('data', (data) => { stdout += data.toString(); });
          stream.stderr.on('data', (data) => { stderr += data.toString(); });
        });
      })
      .on('error', abort)
      .connect(buildSshConfig(conn));
  });
}

async function sftpUpload(conn, localPath, remotePath) {
  const sftp = new SftpClient();
  try {
    await sftp.connect(buildSshConfig(conn));
    const stat = fs.statSync(localPath);
    if (stat.isDirectory()) {
      let count = 0;
      const onUpload = (info) => { count += 1; process.stdout.write(`[上传] (${count}) ${info.source} -> ${info.destination}\n`); };
      sftp.on('upload', onUpload);
      try { await sftp.uploadDir(localPath, remotePath); } finally { sftp.removeListener('upload', onUpload); }
      process.stdout.write(`[上传完成] 共上传 ${count} 个文件\n`);
      return { localPath, remotePath, files: count };
    }
    const progress = createFileProgress(`[上传] ${path.basename(localPath)}`);
    await sftp.fastPut(localPath, remotePath, { step: progress.step });
    progress.done(stat.size);
    return { localPath, remotePath, size: stat.size };
  } finally { await sftp.end().catch(() => undefined); }
}

async function sftpDownload(conn, remotePath, localPath) {
  const sftp = new SftpClient();
  try {
    await sftp.connect(buildSshConfig(conn));
    const remoteStat = await sftp.stat(remotePath);
    const isDirectory = Boolean(remoteStat.isDirectory || remoteStat.type === 'd');
    if (isDirectory) {
      let count = 0;
      const onDownload = (info) => { count += 1; process.stdout.write(`[下载] (${count}) ${info.source} -> ${info.destination}\n`); };
      sftp.on('download', onDownload);
      try { await sftp.downloadDir(remotePath, localPath); } finally { sftp.removeListener('download', onDownload); }
      process.stdout.write(`[下载完成] 共下载 ${count} 个文件\n`);
      return { remotePath, localPath, files: count };
    }
    const progress = createFileProgress(`[下载] ${path.basename(remotePath)}`);
    const totalSize = Number(remoteStat.size) || 0;
    await sftp.fastGet(remotePath, localPath, { step: progress.step });
    progress.done(totalSize);
    return { remotePath, localPath, size: totalSize };
  } finally { await sftp.end().catch(() => undefined); }
}

// ==================== 通用错误处理 ====================

async function safeExecute(fn) {
  try {
    return await fn();
  } catch (err) {
    let conn = null;
    try { const cfg = readConfig(); conn = cfg.list.find((item) => item.name === cfg.curSSH) || null; } catch (_) { conn = null; }
    return { success: false, error: describeSshError(err, conn) };
  }
}

module.exports = {
  encrypt, decrypt, stripQuotes, normalizePort, shellQuote, formatBytes,
  createFileProgress, tryParseJSON, resolveInvocation, safeConnection,
  CONFIG_FILE, emptyConfig, ensureConfigFile, readConfig, writeConfig,
  validateConnection, getCurrentConnection, ask, askConnection,
  addConnectionInteractively, setCurrentInteractively, ensureInitialized,
  buildSshConfig, describeSshError, sshExec, sftpUpload, sftpDownload, safeExecute,
};

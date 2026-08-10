#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Client } from 'ssh2';
import SftpClient from 'ssh2-sftp-client';
import CryptoJS from 'crypto-js';

const SALT = 'ROMAN-123';
const CONFIG_FILE = process.env.SSH_REMOTE_CONTROL_CONFIG_PATH
  ? path.resolve(process.env.SSH_REMOTE_CONTROL_CONFIG_PATH)
  : path.join(os.homedir(), '.ssh-remote-control-mcp', 'ssh_config.json');
const LOG_PREFIX = '[ssh-remote-control-mcp]';
const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const HTTP_PORT = Number(process.env.SSH_REMOTE_CONTROL_PORT || 11889);

function log(message) {
  process.stderr.write(`${LOG_PREFIX} ${message}\n`);
}

function encrypt(text) {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, SALT).toString();
}

function decrypt(ciphertext) {
  if (!ciphertext) return '';
  const bytes = CryptoJS.AES.decrypt(ciphertext, SALT);
  return bytes.toString(CryptoJS.enc.Utf8);
}

function emptyConfig() {
  return { curSSH: '', list: [] };
}

function ensureConfigFile() {
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
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
  return config;
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

function safeConnection(conn) {
  return {
    name: conn.name || '',
    host: conn.host || '',
    port: conn.port || 22,
    username: conn.username || '',
    password: conn.password ? decrypt(conn.password) : '',
    privateKey: conn.privateKey || '',
    passphrase: conn.passphrase || '',
    content: conn.content || '',
  };
}

function safeConnectionSummary(conn) {
  return {
    name: conn.name || '',
    host: conn.host || '',
    content: conn.content || '',
  };
}

function buildStatusPayload(config) {
  const currentConnection = config.curSSH
    ? config.list.find((item) => item.name === config.curSSH) || null
    : null;

  return {
    success: true,
    connections: config.list.map((item) => safeConnection(item)),
    currentConnection: currentConnection ? safeConnection(currentConnection) : null,
    configPath: CONFIG_FILE,
  };
}

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
    content: conn.content ? String(conn.content) : '',
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

function describeSshError(err, conn) {
  const raw = err && err.message ? err.message : String(err);
  const target = conn ? `${conn.username}@${conn.host}:${conn.port || 22}` : '';
  if (/All configured authentication methods failed/i.test(raw)) {
    return `SSH 认证失败 (${target})。请检查用户名、密码或私钥授权。`;
  }
  if (/ENOTFOUND|getaddrinfo/i.test(raw)) {
    return `无法解析主机：${conn && conn.host}。请检查 host 是否正确。`;
  }
  if (/ECONNREFUSED/i.test(raw)) {
    return `连接被拒绝：${target}。请检查端口和防火墙。`;
  }
  if (/ETIMEDOUT|Timed out while waiting for handshake/i.test(raw)) {
    return `连接超时：${target}。请检查网络可达性。`;
  }
  return raw;
}

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

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
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

    if (timeoutMs && timeoutMs > 0) {
      timeoutHandle = setTimeout(() => abort(new Error(`命令执行超时（${timeoutMs} ms）`)), timeoutMs);
    }

    const finalCommand = cwd ? `cd ${shellQuote(cwd)} && ${command}` : command;
    client
      .on('ready', () => {
        client.exec(finalCommand, (err, stream) => {
          if (err) {
            abort(err);
            return;
          }
          stream
            .on('close', (code, signal) => finalize({ stdout, stderr, code, signal }))
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

async function uploadPath(conn, localPath, remotePath, options = {}) {
  const sftp = new SftpClient();
  try {
    await sftp.connect(buildSshConfig(conn));
    await sftp.put(localPath, remotePath, options);
    return { localPath, remotePath, uploaded: true };
  } finally {
    await sftp.end().catch(() => undefined);
  }
}

async function downloadPath(conn, remotePath, localPath, options = {}) {
  const sftp = new SftpClient();
  try {
    await sftp.connect(buildSshConfig(conn));
    await sftp.get(remotePath, localPath, options);
    return { remotePath, localPath, downloaded: true };
  } finally {
    await sftp.end().catch(() => undefined);
  }
}

function createHttpApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static(PUBLIC_DIR));

  app.get('/', (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'ok' });
  });

  app.get('/api/status', (_req, res) => {
    try {
      const config = readConfig();
      res.json(buildStatusPayload(config));
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/connections', (_req, res) => {
    try {
      const config = readConfig();
      res.json(buildStatusPayload(config));
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/connections', (req, res) => {
    try {
      const config = readConfig();
      const connection = validateConnection(req.body, config.list);
      config.list.push(connection);
      if (!config.curSSH || config.list.length === 1) {
        config.curSSH = connection.name;
      }
      writeConfig(config);
      res.json({ success: true, ...buildStatusPayload(config) });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.put('/api/connections/:name', (req, res) => {
    try {
      const originalName = req.params.name;
      const config = readConfig();
      const index = config.list.findIndex((item) => item.name === originalName);
      if (index === -1) {
        return res.status(404).json({ success: false, error: `连接 "${originalName}" 不存在` });
      }
      const updated = validateConnection(req.body, config.list, originalName);
      config.list[index] = updated;
      if (config.curSSH === originalName) {
        config.curSSH = updated.name;
      }
      writeConfig(config);
      res.json({ success: true, ...buildStatusPayload(config) });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/connections/:name', (req, res) => {
    try {
      const name = req.params.name;
      const config = readConfig();
      const before = config.list.length;
      config.list = config.list.filter((item) => item.name !== name);
      if (config.list.length === before) {
        return res.status(404).json({ success: false, error: `连接 "${name}" 不存在` });
      }
      if (config.curSSH === name) {
        config.curSSH = config.list[0] ? config.list[0].name : '';
      }
      writeConfig(config);
      res.json({ success: true, ...buildStatusPayload(config) });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/current/:name', (req, res) => {
    try {
      const name = req.params.name;
      const config = readConfig();
      const target = config.list.find((item) => item.name === name);
      if (!target) {
        return res.status(404).json({ success: false, error: `连接 "${name}" 不存在` });
      }
      config.curSSH = target.name;
      writeConfig(config);
      res.json({ success: true, ...buildStatusPayload(config) });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.post('/api/connections/test', async (req, res) => {
    let draft = null;
    try {
      draft = validateConnection(req.body, [], req.body.name);
      await testConnection(draft);
      res.json({ success: true, message: 'SSH 认证成功' });
    } catch (error) {
      res.json({ success: false, error: describeSshError(error, draft) });
    }
  });

  app.post('/api/connections/:name/test', async (req, res) => {
    let connection = null;
    try {
      const config = readConfig();
      connection = config.list.find((item) => item.name === req.params.name);
      if (!connection) {
        return res.status(404).json({ success: false, error: `连接 "${req.params.name}" 不存在` });
      }
      await testConnection(connection);
      res.json({ success: true, message: 'SSH 认证成功' });
    } catch (error) {
      res.json({ success: false, error: describeSshError(error, connection) });
    }
  });

  return app;
}

function startHttpServer(port = HTTP_PORT) {
  return new Promise((resolve, reject) => {
    const app = createHttpApp();
    const server = app.listen(port, () => {
      log(`HTTP management UI available at http://127.0.0.1:${port}`);
      resolve({ server, port, url: `http://127.0.0.1:${port}` });
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        log(`HTTP port ${port} is already in use; continuing with stdio transport`);
        resolve({ server: null, port, url: `http://127.0.0.1:${port}` });
        return;
      }
      reject(error);
    });
  });
}

function openBrowserUrl(url) {
  const platform = process.platform;
  let command = '';
  if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else if (platform === 'darwin') {
    command = `open "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }
  exec(command, (err) => {
    if (err) {
      log(`Unable to open browser automatically: ${err.message}`);
    }
  });
}

function buildServer() {
  const server = new McpServer({
    name: 'ssh-remote-control-mcp',
    version: '1.0.0',
  });

  server.registerTool('listConnections', {
    title: '列出所有已保存的 SSH 远程连接',
    description: '列出所有已保存的 SSH 远程连接配置，包括连接别名、主机地址、端口、登录账号、备注内容以及当前激活的连接。用于查看当前已配置了哪些远程服务器，以及当前正在使用哪一台服务器。',
    inputSchema: z.object({}).strict(),
  }, async () => {
    const config = readConfig();
    const list = config.list.map(safeConnection);
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, data: { curSSH: config.curSSH, list }, configPath: CONFIG_FILE }, null, 2) }],
      structuredContent: { success: true, data: { curSSH: config.curSSH, list, configPath: CONFIG_FILE } },
    };
  });

  server.registerTool('addConnection', {
    title: '添加或管理 SSH 远程连接（自动打开管理页面）',
    description: '添加或管理 SSH 远程连接。当用户说“帮我添加一个远程链接”“帮我添加一个远程服务”“添加远程连接”“新增服务器”“配置远程服务器”等需要新增或管理 SSH 连接时，应调用本工具。调用后会自动启动本地 Web 管理服务并打开浏览器管理页面，用户可在页面上完成连接的增删改查、编写服务器备注（支持 Markdown）以及设置当前活动连接。如果同时提供了完整的连接信息（name、host、username 以及 password 或 privateKey），也会直接保存该连接。参数说明：name 连接别名；host 主机地址；port SSH 端口（默认 22）；username 登录账号；password 登录密码；privateKey 私钥文件绝对路径；passphrase 私钥口令；content 服务器备注/说明（Markdown）；managerPort 管理页面端口（默认 11889）。',
    inputSchema: z.object({
      name: z.string().optional(),
      host: z.string().optional(),
      port: z.number().int().min(1).max(65535).optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      privateKey: z.string().optional(),
      passphrase: z.string().optional(),
      content: z.string().optional(),
      managerPort: z.number().int().min(1).max(65535).optional(),
    }),
  }, async (args) => {
    const managerPort = args.managerPort || HTTP_PORT;
    await startHttpServer(managerPort);
    openBrowserUrl(`http://127.0.0.1:${managerPort}`);

    // If full connection details are provided, save them directly as well
    if (args.name && args.host && args.username && (args.password || args.privateKey)) {
      const config = readConfig();
      const normalized = validateConnection(args, config.list, args.name);
      const existingIndex = config.list.findIndex((item) => item.name === normalized.name);
      if (existingIndex >= 0) {
        config.list[existingIndex] = normalized;
      } else {
        config.list.push(normalized);
      }
      if (!config.curSSH || config.list.length === 1) {
        config.curSSH = normalized.name;
      }
      writeConfig(config);
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, data: { connection: safeConnection(normalized), curSSH: config.curSSH, url: `http://127.0.0.1:${managerPort}`, message: '连接已保存，管理页面已打开' } }, null, 2) }],
        structuredContent: { success: true, data: { connection: safeConnection(normalized), curSSH: config.curSSH, url: `http://127.0.0.1:${managerPort}`, message: '连接已保存，管理页面已打开' } },
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, data: { url: `http://127.0.0.1:${managerPort}`, message: '请在浏览器管理页面中添加 SSH 连接' } }, null, 2) }],
      structuredContent: { success: true, data: { url: `http://127.0.0.1:${managerPort}`, message: '请在浏览器管理页面中添加 SSH 连接' } },
    };
  });

  server.registerTool('setCurrentConnection', {
    title: '切换当前活动的 SSH 连接',
    description: '将指定别名的 SSH 连接设置为当前活动连接。后续的测试连接、执行远程命令、上传下载文件等操作都会自动在切换后的连接上执行。参数 name 为要切换到的连接别名。',
    inputSchema: z.object({
      name: z.string().min(1),
    }),
  }, async (args) => {
    const config = readConfig();
    const target = config.list.find((item) => item.name === args.name);
    if (!target) {
      throw new Error(`连接 "${args.name}" 不存在`);
    }
    config.curSSH = target.name;
    writeConfig(config);
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, data: { current: safeConnection(target) } }, null, 2) }],
      structuredContent: { success: true, data: { current: safeConnection(target) } },
    };
  });

  server.registerTool('deleteConnection', {
    title: '删除已保存的 SSH 连接',
    description: '从配置中删除指定别名的 SSH 连接。如果删除的是当前活动连接，会自动切换到列表中的第一个连接（若列表为空则清空当前连接）。参数 name 为要删除的连接别名。',
    inputSchema: z.object({
      name: z.string().min(1),
    }),
  }, async (args) => {
    const config = readConfig();
    const before = config.list.length;
    config.list = config.list.filter((item) => item.name !== args.name);
    if (config.list.length === before) {
      throw new Error(`连接 "${args.name}" 不存在`);
    }
    if (config.curSSH === args.name) {
      config.curSSH = config.list[0] ? config.list[0].name : '';
    }
    writeConfig(config);
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, data: { deleted: args.name, curSSH: config.curSSH } }, null, 2) }],
      structuredContent: { success: true, data: { deleted: args.name, curSSH: config.curSSH } },
    };
  });

  server.registerTool('getConnectionContent', {
    title: '读取连接的备注 / Markdown 内容',
    description: '读取指定别名或当前活动连接的 content 备注描述信息（支持 Markdown，通常用于存放服务器功能说明、部署指南、环境变量说明等）。不传 name 时读取当前活动连接的备注；传入 name 时读取指定别名的连接备注。',
    inputSchema: z.object({
      name: z.string().optional(),
    }),
  }, async (args) => {
    const config = readConfig();
    const name = args.name?.trim();
    const target = name
      ? config.list.find((item) => item.name === name)
      : config.list.find((item) => item.name === config.curSSH);
    if (!target) {
      throw new Error(name ? `未找到别名为 "${name}" 的连接配置` : '未设置当前连接');
    }
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, data: safeConnectionSummary(target) }, null, 2) }],
      structuredContent: { success: true, data: safeConnectionSummary(target) },
    };
  });

  server.registerTool('openManager', {
    title: '打开 SSH Web 管理页面',
    description: '打开 SSH Web 管理页面。当用户说“打开管理页面”“打开远程管理页面”“打开 SSH 管理页面”“打开远程连接管理”“管理远程服务器”“查看远程连接配置”“打开配置页面”等需要打开远程连接管理界面时，应调用本工具。启动本地 Express 管理服务（默认端口 11889，若已启动则直接复用）并自动打开系统默认浏览器跳转到 SSH Web 管理页面。用户可在页面上完成 SSH 连接的增删改查、编写与预览服务器备注（Markdown）以及设置当前活动连接。参数 port 可指定管理页面端口。',
    inputSchema: z.object({
      port: z.number().int().min(1).max(65535).optional(),
    }),
  }, async (args) => {
    const port = args.port || HTTP_PORT;
    await startHttpServer(port);
    openBrowserUrl(`http://127.0.0.1:${port}`);
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, data: { url: `http://127.0.0.1:${port}` } }, null, 2) }],
      structuredContent: { success: true, data: { url: `http://127.0.0.1:${port}` } },
    };
  });

  server.registerTool('getConfigPath', {
    title: '查看 SSH 连接配置文件路径',
    description: '查看当前 SSH 连接配置文件的实际存储路径。所有连接配置（连接别名、主机、账号、加密后的密码、私钥路径、备注等）都保存在该 JSON 文件中。',
    inputSchema: z.object({}).strict(),
  }, async () => {
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, data: { configPath: CONFIG_FILE } }, null, 2) }],
      structuredContent: { success: true, data: { configPath: CONFIG_FILE } },
    };
  });

  server.registerTool('testConnection', {
    title: '测试当前 SSH 连接是否可认证',
    description: '测试当前活动连接的 SSH 认证是否可用。会尝试建立 SSH 连接并验证用户名、密码或私钥是否正确。认证失败时会自动诊断并提示可能的原因（认证失败、无法解析主机、连接被拒绝、连接超时等）。',
    inputSchema: z.object({}).strict(),
  }, async () => {
    const config = readConfig();
    const current = getCurrentConnection(config);
    await testConnection(current);
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, data: { current: safeConnection(current), message: 'SSH 认证成功' } }, null, 2) }],
      structuredContent: { success: true, data: { current: safeConnection(current), message: 'SSH 认证成功' } },
    };
  });

  server.registerTool('execCommand', {
    title: '在远程服务器上执行 shell 命令',
    description: '通过 SSH 在当前活动连接对应的远程服务器上执行 shell 命令，并返回标准输出、标准错误、退出码和退出信号。参数说明：command 要执行的命令；cwd 可选，指定远程工作目录（会先 cd 到该目录再执行）；timeout 可选，命令执行超时时间（毫秒），默认不超时。',
    inputSchema: z.object({
      command: z.string().min(1),
      cwd: z.string().optional(),
      timeout: z.number().int().optional(),
    }),
  }, async (args) => {
    const config = readConfig();
    const current = getCurrentConnection(config);
    const result = await runCommand(current, args.command, args.cwd, args.timeout);
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, data: result }, null, 2) }],
      structuredContent: { success: true, data: result },
    };
  });

  server.registerTool('uploadPath', {
    title: '上传本地文件或目录到远程服务器',
    description: '通过 SFTP 将本地文件或目录上传到当前活动连接对应的远程服务器。参数说明：localPath 本地文件或目录的绝对路径；remotePath 远程目标路径；overwrite 可选，是否覆盖已存在的文件。',
    inputSchema: z.object({
      localPath: z.string().min(1),
      remotePath: z.string().min(1),
      overwrite: z.boolean().optional(),
    }),
  }, async (args) => {
    const config = readConfig();
    const current = getCurrentConnection(config);
    const result = await uploadPath(current, args.localPath, args.remotePath, { overwrite: args.overwrite });
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, data: result }, null, 2) }],
      structuredContent: { success: true, data: result },
    };
  });

  server.registerTool('downloadPath', {
    title: '从远程服务器下载文件或目录',
    description: '通过 SFTP 将远程服务器上的文件或目录下载到本地。参数说明：remotePath 远程文件或目录的绝对路径；localPath 本地保存路径；overwrite 可选，是否覆盖已存在的本地文件。',
    inputSchema: z.object({
      remotePath: z.string().min(1),
      localPath: z.string().min(1),
      overwrite: z.boolean().optional(),
    }),
  }, async (args) => {
    const config = readConfig();
    const current = getCurrentConnection(config);
    const result = await downloadPath(current, args.remotePath, args.localPath, { overwrite: args.overwrite });
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, data: result }, null, 2) }],
      structuredContent: { success: true, data: result },
    };
  });

  return server;
}

async function main() {
  try {
    await startHttpServer();
    const server = buildServer();
    await serveStdio(() => server);
  } catch (error) {
    log(error.message);
    process.exit(1);
  }
}

main();

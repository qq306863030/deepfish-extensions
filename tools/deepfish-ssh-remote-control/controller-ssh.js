const { Client } = require('ssh2');
const {
  stripQuotes, safeConnection, buildSshConfig, sshExec, sftpUpload, sftpDownload, safeExecute,
  ensureInitialized, getCurrentConnection,
} = require('./normal');

// ==================== 导出主函数 ====================

async function testCurrentConnection() {
  return safeExecute(async () => {
    const config = await ensureInitialized();
    const current = getCurrentConnection(config);
    return new Promise((resolve, reject) => {
      const client = new Client();
      let settled = false;
      client
        .on('ready', () => { settled = true; client.end(); resolve({ success: true, data: { current: safeConnection(current), message: 'SSH 认证成功，连接可用' } }); })
        .on('error', (err) => { if (settled) return; settled = true; reject(err); })
        .connect(buildSshConfig(current));
    });
  });
}

async function execCommand(command, cwd, timeout) {
  return safeExecute(async () => {
    command = String(command || '').trim();
    if (!command) throw new Error('执行远程命令需要提供 command');
    const config = await ensureInitialized();
    const current = getCurrentConnection(config);
    const timeoutMs = timeout !== undefined ? Number(timeout) : 0;
    const result = await sshExec(current, command, cwd, timeoutMs > 0 ? timeoutMs : 0);
    return { success: true, data: result };
  });
}

async function uploadFile(localPath, remotePath) {
  return safeExecute(async () => {
    localPath = stripQuotes(localPath);
    remotePath = stripQuotes(remotePath);
    if (!localPath || !remotePath) throw new Error('上传需要提供 localPath 和 remotePath');
    const config = await ensureInitialized();
    const current = getCurrentConnection(config);
    const result = await sftpUpload(current, localPath, remotePath);
    return { success: true, data: result };
  });
}

async function downloadFile(remotePath, localPath) {
  return safeExecute(async () => {
    remotePath = stripQuotes(remotePath);
    localPath = stripQuotes(localPath);
    if (!remotePath || !localPath) throw new Error('下载需要提供 remotePath 和 localPath');
    const config = await ensureInitialized();
    const current = getCurrentConnection(config);
    const result = await sftpDownload(current, remotePath, localPath);
    return { success: true, data: result };
  });
}

// ==================== 描述 ====================

const testCurrentConnectionDescription = {
  type: 'function',
  function: {
    name: 'testCurrentConnection',
    description: '测试当前连接的 SSH 认证是否成功。仅建立 SSH 会话再立即关闭，不执行任何命令。认证失败时返回详细诊断信息。无需任何参数。',
    parameters: { type: 'object', properties: {} },
  },
};

const execCommandDescription = {
  type: 'function',
  function: {
    name: 'execCommand',
    description: '在远程服务器上执行指定命令，返回 stdout、stderr、退出码和信号。',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: '要执行的远程命令。' },
        cwd: { type: 'string', description: '远程工作目录（可选）。' },
        timeout: { type: 'number', description: '命令执行超时毫秒数（可选）。' },
      },
      required: ['command'],
    },
  },
};

const uploadFileDescription = {
  type: 'function',
  function: {
    name: 'uploadFile',
    description: '通过 SFTP 协议上传本地文件或目录到远程服务器。支持文件和目录，目录会递归上传。',
    parameters: {
      type: 'object',
      properties: {
        localPath: { type: 'string', description: '本地文件或目录的绝对路径。' },
        remotePath: { type: 'string', description: '远程目标绝对路径。' },
      },
      required: ['localPath', 'remotePath'],
    },
  },
};

const downloadFileDescription = {
  type: 'function',
  function: {
    name: 'downloadFile',
    description: '通过 SFTP 协议从远程服务器下载文件或目录到本地。支持文件和目录，目录会递归下载。',
    parameters: {
      type: 'object',
      properties: {
        remotePath: { type: 'string', description: '远程文件或目录的绝对路径。' },
        localPath: { type: 'string', description: '本地目标绝对路径。' },
      },
      required: ['remotePath', 'localPath'],
    },
  },
};

module.exports = {
  testCurrentConnection,
  execCommand,
  uploadFile,
  downloadFile,
  testCurrentConnectionDescription,
  execCommandDescription,
  uploadFileDescription,
  downloadFileDescription,
};

/**
 * 冒烟测试：以 MCP client 身份通过 stdio 与 deepseek-vision-mcp 通信
 * 验证：initialize 握手 → tools/list → tools/call（配置缺失报错 / 图片不存在报错）
 *
 * 用法：node test.mjs
 */
import { spawn } from 'node:child_process';
import readline from 'node:readline';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

// 生成一个 1x1 的红色 PNG 作为真实测试图片
const TEST_IMAGE = path.join(os.tmpdir(), 'deepseek-vision-mcp-test-1x1.png');
const TEST_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
fs.writeFileSync(TEST_IMAGE, Buffer.from(TEST_PNG_BASE64, 'base64'));

// 启动一个本地 HTTP 服务，用于测试网络路径（图片 URL 与 base64 文件 URL）
const httpServer = http.createServer((req, res) => {
  const url = req.url || '';
  if (url === '/test.png') {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(Buffer.from(TEST_PNG_BASE64, 'base64'));
  } else if (url === '/test.base64') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(TEST_PNG_BASE64);
  } else {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
const HTTP_PORT = httpServer.address().port;
const NET_IMAGE_URL = `http://127.0.0.1:${HTTP_PORT}/test.png`;
const NET_BASE64_URL = `http://127.0.0.1:${HTTP_PORT}/test.base64`;

const SERVER_CMD = process.execPath;
const SERVER_ARGS = ['index.js'];
const SERVER_ENV = {
  ...process.env,
  // 故意留空配置，先验证「配置缺失」的错误提示；再传 config 参数验证识别流程前置校验
  OPENAI_BASE_URL: '',
  OPENAI_API_KEY: '',
  OPENAI_MODEL: '',
};

let nextId = 1;
const pending = new Map();

function request(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    child.stdin.write(msg + '\n');
  });
}

function notify(method, params) {
  const msg = JSON.stringify({ jsonrpc: '2.0', method, params });
  child.stdin.write(msg + '\n');
}

const child = spawn(SERVER_CMD, SERVER_ARGS, {
  env: SERVER_ENV,
  stdio: ['pipe', 'pipe', 'pipe'],
});

// 服务端日志走 stderr，原样透出方便排查
child.stderr.on('data', (d) => process.stderr.write(`[server-stderr] ${d}`));

const rl = readline.createInterface({ input: child.stdout });
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch (e) {
    console.error('无法解析服务端消息:', trimmed);
    return;
  }
  if (msg.id !== undefined && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(`RPC 错误: ${JSON.stringify(msg.error)}`));
    else resolve(msg.result);
  }
});

function assert(cond, label) {
  if (!cond) {
    console.error(`❌ 断言失败: ${label}`);
    process.exitCode = 1;
  } else {
    console.log(`✅ ${label}`);
  }
}

try {
  // 1. initialize 握手
  const init = await request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'smoke-test-client', version: '1.0.0' },
  });
  assert(init.serverInfo && init.serverInfo.name === 'deepseek-vision-mcp', `initialize 返回 serverInfo: ${JSON.stringify(init.serverInfo)}`);
  console.log('   initialize result keys:', Object.keys(init).join(', '));

  // 2. initialized 通知
  notify('notifications/initialized', {});

  // 3. tools/list
  const toolList = await request('tools/list', {});
  const names = toolList.tools.map((t) => t.name);
  assert(names.includes('recognizeImage'), `tools/list 包含 recognizeImage，实际: ${names.join(',')}`);
  const tool = toolList.tools.find((t) => t.name === 'recognizeImage');
  assert(tool.inputSchema && tool.inputSchema.properties && tool.inputSchema.properties.imagePath, 'recognizeImage 的 inputSchema 含 imagePath 参数');

  // 4. tools/call - 配置缺失（真实图片存在，但环境变量未配置、也不传 config）→ 应返回 isError 与配置指引
  const callNoConfig = await request('tools/call', {
    name: 'recognizeImage',
    arguments: { imagePath: TEST_IMAGE, prompt: '描述这张图片' },
  });
  assert(callNoConfig.isError === true, `未配置环境变量时返回 isError=true`);
  assert(JSON.stringify(callNoConfig.content).includes('OPENAI_BASE_URL'), `错误信息包含配置指引，实际: ${JSON.stringify(callNoConfig.content)}`);

  // 5. tools/call - 图片不存在（配置齐了但文件不存在）→ 应返回 isError 且提示文件不存在
  const callNoFile = await request('tools/call', {
    name: 'recognizeImage',
    arguments: {
      imagePath: 'C:/fake/not-exist.png',
      prompt: '描述这张图片',
      config: { url: 'http://127.0.0.1:9/v1', apiKey: 'sk-test', model: 'test-model' },
    },
  });
  assert(callNoFile.isError === true, `图片不存在时返回 isError=true`);
  assert(JSON.stringify(callNoFile.content).includes('图片文件不存在'), `错误信息提示文件不存在，实际: ${JSON.stringify(callNoFile.content)}`);

  // 6. tools/call - 网络图片 URL（配置缺失，但网络路径应能成功下载并走到配置校验）
  const callNetImage = await request('tools/call', {
    name: 'recognizeImage',
    arguments: { imagePath: NET_IMAGE_URL, prompt: '描述这张图片' },
  });
  assert(callNetImage.isError === true, `网络图片 URL 未配置环境变量时返回 isError=true`);
  assert(JSON.stringify(callNetImage.content).includes('OPENAI_BASE_URL'), `网络图片 URL 成功下载并走到配置校验，实际: ${JSON.stringify(callNetImage.content)}`);

  // 7. tools/call - 网络 base64 文件 URL（配置缺失，但网络路径应能成功下载并走到配置校验）
  const callNetBase64 = await request('tools/call', {
    name: 'recognizeImage',
    arguments: { imagePath: NET_BASE64_URL, prompt: '描述这张图片' },
  });
  assert(callNetBase64.isError === true, `网络 base64 文件 URL 未配置环境变量时返回 isError=true`);
  assert(JSON.stringify(callNetBase64.content).includes('OPENAI_BASE_URL'), `网络 base64 文件 URL 成功下载并走到配置校验，实际: ${JSON.stringify(callNetBase64.content)}`);

  console.log('\n🎉 冒烟测试全部通过');
} catch (err) {
  console.error('\n❌ 测试异常:', err.message);
  process.exitCode = 1;
} finally {
  child.kill();
  httpServer.close();
  process.exit(process.exitCode || 0);
}

/**
 * 零依赖黄金标准验证：
 * 把打包产物 dist/index.js 复制到一个完全空的临时目录（无 node_modules），
 * 在那边以独立 cwd 启动 MCP server，跑完整识别链路（mock OpenAI API）。
 * 若能跑通，证明发布后"零 npm 依赖"成立。
 *
 * 用法：node verify-zero-dep.mjs
 */
import { spawn } from 'node:child_process';
import readline from 'node:readline';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_FILE = path.join(__dirname, 'dist', 'index.js');
if (!fs.existsSync(DIST_FILE)) {
  console.error('❌ 未找到 dist/index.js，请先打包: npx esbuild index.js --bundle --platform=node --format=esm --target=node20 --outfile=dist/index.js --minify');
  process.exit(1);
}

// 1. 建一个完全空的临时目录（模拟用户只拿到发布产物）
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'deepseek-vision-mcp-zero-dep-'));
const REMOTE_INDEX = path.join(TMP_DIR, 'index.js');
fs.copyFileSync(DIST_FILE, REMOTE_INDEX);
console.log(`📦 产物已复制到空目录: ${TMP_DIR}`);
console.log(`   （该目录 node_modules 存在: ${fs.existsSync(path.join(TMP_DIR, 'node_modules'))}）`);

// 2. mock OpenAI 兼容接口
let receivedAuth = null;
let receivedModel = null;
let receivedPrompt = null;
const mockServer = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const parsed = JSON.parse(body);
    receivedAuth = req.headers.authorization;
    receivedModel = parsed.model;
    receivedPrompt = parsed.messages[0].content[1].text;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: '【零依赖验证】识别成功：这是一张测试图片。' } }] }));
  });
});
await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', resolve));
const PORT = mockServer.address().port;

// 3. 在空目录里启动打包产物（cwd 设为空目录）
let nextId = 1;
const pending = new Map();
function request(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}
function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
}

const child = spawn(process.execPath, [REMOTE_INDEX], {
  cwd: TMP_DIR, // 独立 cwd，项目 node_modules 不在解析路径上
  env: {
    ...process.env,
    OPENAI_BASE_URL: `http://127.0.0.1:${PORT}/v1`,
    OPENAI_API_KEY: 'sk-zero-dep-key',
    OPENAI_MODEL: 'zero-dep-vision',
  },
  stdio: ['pipe', 'pipe', 'pipe'],
});
child.stderr.on('data', (d) => process.stderr.write(`[server-stderr] ${d}`));

const rl = readline.createInterface({ input: child.stdout });
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch (e) {
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
  await request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'zero-dep-test-client', version: '1.0.0' },
  });
  notify('notifications/initialized', {});

  const call = await request('tools/call', {
    name: 'recognizeImage',
    arguments: {
      imagePath: path.join(TMP_DIR, 'test.png'), // 占位，实际用随机字节即可通过文件存在校验
      prompt: '描述这张图片',
    },
  });
  // 文件不存在会先报"文件不存在"，用 config 提供可用的 mock 配置
  assert(call.isError === true, '占位图先报文件不存在（预期）');
} catch (err) {
  console.error('\n❌ 阶段1异常:', err.message);
}

// 4. 真正写入一张测试图片，跑完整识别
const TEST_PNG = path.join(TMP_DIR, 'test.png');
fs.writeFileSync(TEST_PNG, Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'
));

try {
  const call = await request('tools/call', {
    name: 'recognizeImage',
    arguments: { imagePath: TEST_PNG, prompt: '描述这张图片' },
  });

  assert(call.isError !== true, '零依赖产物完整识别调用未报错');
  const text = call.content.map((c) => c.text).join('');
  assert(text.includes('识别成功'), `识别结果正确返回，实际: ${text}`);
  assert(receivedAuth === 'Bearer sk-zero-dep-key', `mock API 收到正确 Authorization: ${receivedAuth}`);
  assert(receivedModel === 'zero-dep-vision', `mock API 收到正确 model: ${receivedModel}`);
  assert(receivedPrompt === '描述这张图片', `prompt 正确传递: ${receivedPrompt}`);

  console.log('\n🎉 零依赖验证通过：产物在无 node_modules 的空目录中完整跑通识别链路');
} catch (err) {
  console.error('\n❌ 零依赖验证失败:', err.message);
  process.exitCode = 1;
} finally {
  child.kill();
  mockServer.close();
  // 子进程句柄可能未及时释放，重试清理
  try {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  } catch (e) {
    setTimeout(() => { try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch (e2) {} }, 500);
  }
  process.exit(process.exitCode || 0);
}

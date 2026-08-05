/**
 * 端到端测试：MCP client → MCP server → mock OpenAI 兼容接口
 * 验证：
 *   1. 环境变量配置被正确注入（DEEPSEEK_OPENAI_* 前缀）
 *   2. 请求体结构正确（image_url data URL + text prompt）
 *   3. 识别结果从 mock API 完整返回给 MCP client
 *
 * 用法：node test-e2e.mjs
 */
import { spawn } from 'node:child_process';
import readline from 'node:readline';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TEST_IMAGE = path.join(os.tmpdir(), 'deepseek-vision-mcp-test-1x1.png');
fs.writeFileSync(TEST_IMAGE, Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
));

let reqAssertions = [];

// 1. 起一个 mock OpenAI 兼容接口
const mockServer = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const parsed = JSON.parse(body);
    reqAssertions.push({
      auth: req.headers.authorization,
      model: parsed.model,
      imageUrl: parsed.messages[0].content[0].image_url.url,
      prompt: parsed.messages[0].content[1].text,
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      choices: [{ message: { content: '【E2E】图片里有一只橘色的猫在睡觉。' } }],
    }));
  });
});
await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', resolve));
const PORT = mockServer.address().port;

// 2. 启动 MCP server，通过环境变量注入配置（模拟 MCP 客户端 env 配置）
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

const child = spawn(process.execPath, ['index.js'], {
  env: {
    ...process.env,
    DEEPSEEK_OPENAI_BASE_URL: `http://127.0.0.1:${PORT}/v1`,
    DEEPSEEK_OPENAI_API_KEY: 'sk-e2e-test-key',
    DEEPSEEK_OPENAI_MODEL: 'e2e-vision-model',
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
    clientInfo: { name: 'e2e-test-client', version: '1.0.0' },
  });
  notify('notifications/initialized', {});

  // 3. 调用 recognizeImage（配置走环境变量）
  const call = await request('tools/call', {
    name: 'recognizeImage',
    arguments: { imagePath: TEST_IMAGE, prompt: '描述这张图片' },
  });

  assert(call.isError !== true, '识别调用未返回 isError');
  const text = call.content.map((c) => c.text).join('');
  assert(text.includes('橘色的猫在睡觉'), `返回识别结果，实际: ${text}`);
  assert(call.structuredContent && call.structuredContent.success === true, '返回 structuredContent.success=true');
  assert(call.structuredContent.config.model === 'e2e-vision-model', 'structuredContent 携带生效的 model 配置');

  // 4. 校验 mock API 收到的请求
  assert(reqAssertions.length === 1, `mock API 收到 1 次请求，实际 ${reqAssertions.length} 次`);
  if (reqAssertions.length === 1) {
    const r = reqAssertions[0];
    assert(r.auth === 'Bearer sk-e2e-test-key', `Authorization 头正确，实际: ${r.auth}`);
    assert(r.model === 'e2e-vision-model', `请求携带 model，实际: ${r.model}`);
    assert(r.imageUrl.startsWith('data:image/png;base64,iVBOR'), '图片以 base64 data URL 传输');
    assert(r.prompt === '描述这张图片', `prompt 正确传递，实际: ${r.prompt}`);
  }

  console.log('\n🎉 端到端测试全部通过');
} catch (err) {
  console.error('\n❌ 测试异常:', err.message);
  process.exitCode = 1;
} finally {
  child.kill();
  mockServer.close();
  try { fs.unlinkSync(TEST_IMAGE); } catch (e) {}
  process.exit(process.exitCode || 0);
}

/**
 * MCP stdio 冒烟测试
 *
 * 启动 index.js 子进程，通过 stdio 发送 JSON-RPC：
 *   initialize → notifications/initialized → tools/list → tools/call
 *
 * 对应 TEST-PLAN.md §11。
 */

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(__dirname, 'index.js');

let id = 0;
function nextId() {
  return ++id;
}

/** 发送请求并等待对应 id 的响应 */
function request(proc, rl, method, params) {
  const rid = nextId();
  const msg = JSON.stringify({ jsonrpc: '2.0', id: rid, method, params: params || {} });
  return new Promise((resolve, reject) => {
    const onLine = (line) => {
      let parsed;
      try { parsed = JSON.parse(line); } catch (_) { return; }
      if (parsed.id === rid) {
        rl.off('line', onLine);
        resolve(parsed);
      }
    };
    rl.on('line', onLine);
    proc.stdin.write(msg + '\n');
    // 超时保护
    setTimeout(() => { rl.off('line', onLine); reject(new Error(`请求 ${method} 超时`)); }, 15000).unref();
  });
}

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log(`✅ ${name}`);
  } catch (e) {
    results.push({ name, pass: false });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

const proc = spawn(process.execPath, [SERVER], { stdio: ['pipe', 'pipe', 'pipe'] });
const rl = createInterface({ input: proc.stdout });
proc.stderr.on('data', () => {}); // 忽略 stderr 日志

let stderrData = '';
proc.stderr.on('data', (d) => { stderrData += d.toString(); });

// 收集 stdout 行（验证纯净性）
const stdoutLines = [];
rl.on('line', (line) => { stdoutLines.push(line); });

await new Promise((r) => setTimeout(r, 800)); // 等服务器就绪

await check('initialize 握手', async () => {
  const res = await request(proc, rl, 'initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'smoke-test', version: '1.0.0' },
  });
  if (!res.result || !res.result.serverInfo) throw new Error('initialize 无 serverInfo');
  if (res.result.serverInfo.name !== 'win-computer-use-mcp') throw new Error(`serverName = ${res.result.serverInfo.name}`);
});

await check('initialized 通知', async () => {
  const rid = nextId();
  proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  // 通知无响应，等 300ms 确认不崩溃
  await new Promise((r) => setTimeout(r, 300));
});

await check('tools/list 返回全部工具', async () => {
  const res = await request(proc, rl, 'tools/list', {});
  const tools = res.result?.tools || [];
  const names = tools.map((t) => t.name);
  const expected = [
    'screenshot', 'getScreenInfo',
    'mouseMove', 'mouseClick', 'mouseScroll', 'mouseDrag', 'mousePress', 'mouseRelease', 'getMousePosition',
    'keyboardType', 'keyboardKey',
    'windowList', 'windowActivate', 'windowControl', 'windowMove', 'windowResize',
    'processLaunch', 'clipboardGet', 'clipboardSet', 'wait',
  ];
  for (const n of expected) {
    if (!names.includes(n)) throw new Error(`缺少工具: ${n}`);
  }
  if (tools.length !== expected.length) throw new Error(`工具数 ${tools.length} != ${expected.length}`);
});

await check('tools/call getScreenInfo 成功', async () => {
  const res = await request(proc, rl, 'tools/call', {
    name: 'getScreenInfo',
    arguments: {},
  });
  const sc = res.result?.structuredContent;
  if (!sc || sc.success !== true) throw new Error(`getScreenInfo 失败: ${JSON.stringify(res.result)}`);
  if (!sc.screen || !sc.screen.physicalWidth) throw new Error('无屏幕信息');
  console.log(`   screen: ${sc.screen.logicalWidth}x${sc.screen.logicalHeight} -> ${sc.screen.physicalWidth}x${sc.screen.physicalHeight} scale=${sc.screen.scaleX.toFixed(3)}`);
});

await check('tools/call wait 生效', async () => {
  const t0 = Date.now();
  const res = await request(proc, rl, 'tools/call', { name: 'wait', arguments: { ms: 300 } });
  const elapsed = Date.now() - t0;
  const sc = res.result?.structuredContent;
  if (!sc || sc.success !== true) throw new Error('wait 失败');
  if (elapsed < 300) throw new Error(`wait 未生效: ${elapsed}ms`);
});

await check('tools/call 非法参数 isError=true', async () => {
  const res = await request(proc, rl, 'tools/call', {
    name: 'keyboardType',
    arguments: { text: 123 }, // 非字符串
  });
  if (!res.result?.isError) throw new Error('非法参数应 isError=true');
});

await check('tools/call 未知工具报错', async () => {
  const res = await request(proc, rl, 'tools/call', { name: 'noSuchTool', arguments: {} });
  if (!res.error) throw new Error('未知工具应返回 error');
});

// 验证 stdout 纯净（只含 JSON-RPC 行）
await check('stdout 纯净（无日志污染）', async () => {
  await request(proc, rl, 'tools/call', { name: 'getScreenInfo', arguments: {} });
  await new Promise((r) => setTimeout(r, 300));
  for (const line of stdoutLines) {
    if (!line.trim()) continue;
    try { JSON.parse(line); } catch (_) { throw new Error(`stdout 含非 JSON 内容: ${line.slice(0, 60)}`); }
  }
});

// 关闭
proc.stdin.end();
setTimeout(() => { try { proc.kill(); } catch (_) {} }, 500);

const failed = results.filter((r) => !r.pass);
console.log(`\n结果: ${results.length - failed.length}/${results.length} 通过`);
if (failed.length) process.exit(1);

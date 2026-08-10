import { spawn } from 'node:child_process';
import readline from 'node:readline';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ssh-remote-control-mcp-'));
const tempConfigPath = path.join(tempHome, 'ssh_config.json');
const serverEnv = {
  ...process.env,
  HOME: tempHome,
  USERPROFILE: tempHome,
  SSH_REMOTE_CONTROL_CONFIG_PATH: tempConfigPath,
};

let nextId = 1;
const pending = new Map();

function request(child, method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

function notify(child, method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
}

function assert(cond, label) {
  if (!cond) {
    throw new Error(label);
  }
}

const child = spawn(process.execPath, ['index.js'], { env: serverEnv, stdio: ['pipe', 'pipe', 'pipe'] });
child.stderr.on('data', (d) => process.stderr.write(`[server-stderr] ${d}`));

const rl = readline.createInterface({ input: child.stdout });
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    return;
  }
  if (msg.id !== undefined && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
});

try {
  const init = await request(child, 'initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' },
  });
  assert(init.serverInfo && init.serverInfo.name === 'ssh-remote-control-mcp', 'initialize should return the MCP server name');

  notify(child, 'notifications/initialized', {});

  const tools = await request(child, 'tools/list', {});
  const names = tools.tools.map((tool) => tool.name);
  assert(names.includes('listConnections'), 'tools/list should include listConnections');
  assert(names.includes('addConnection'), 'tools/list should include addConnection');
  assert(names.includes('deleteConnection'), 'tools/list should include deleteConnection');
  assert(names.includes('setCurrentConnection'), 'tools/list should include setCurrentConnection');
  assert(names.includes('getConnectionContent'), 'tools/list should include getConnectionContent');
  assert(names.includes('openManager'), 'tools/list should include openManager');
  assert(names.includes('getConfigPath'), 'tools/list should include getConfigPath');
  assert(names.includes('testConnection'), 'tools/list should include testConnection');
  assert(names.includes('execCommand'), 'tools/list should include execCommand');
  assert(names.includes('uploadPath'), 'tools/list should include uploadPath');
  assert(names.includes('downloadPath'), 'tools/list should include downloadPath');

  const addResult = await request(child, 'tools/call', {
    name: 'addConnection',
    arguments: {
      name: 'demo-server',
      host: 'example.com',
      port: 22,
      username: 'root',
      password: 'secret',
      content: 'demo connection',
    },
  });
  assert(addResult.isError !== true, 'addConnection should succeed');
  const structured = addResult.structuredContent;
  assert(structured && structured.success === true, 'addConnection should return structuredContent.success=true');
  assert(structured.data && structured.data.connection && structured.data.connection.name === 'demo-server', 'addConnection should persist the connection name');

  const listResult = await request(child, 'tools/call', {
    name: 'listConnections',
    arguments: {},
  });
  const listText = listResult.content[0].text;
  assert(listText.includes('demo-server'), 'listConnections should include the newly added connection');
  assert(fs.existsSync(tempConfigPath), 'the config file should be created at the environment-configured path');

  // getConnectionContent should return the saved notes for the current connection
  const contentResult = await request(child, 'tools/call', {
    name: 'getConnectionContent',
    arguments: {},
  });
  const contentText = contentResult.content[0].text;
  assert(contentText.includes('demo connection'), 'getConnectionContent should return the saved content/notes');

  // deleteConnection should remove the entry and clear the current connection
  const deleteResult = await request(child, 'tools/call', {
    name: 'deleteConnection',
    arguments: { name: 'demo-server' },
  });
  assert(deleteResult.isError !== true, 'deleteConnection should succeed');
  const listAfterDelete = await request(child, 'tools/call', {
    name: 'listConnections',
    arguments: {},
  });
  assert(!listAfterDelete.content[0].text.includes('demo-server'), 'listConnections should no longer include the deleted connection');

  console.log('✅ smoke test passed');
} finally {
  child.kill();
}

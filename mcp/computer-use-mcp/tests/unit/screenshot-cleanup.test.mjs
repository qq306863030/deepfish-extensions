/**
 * 截图清理单元测试（不碰真实设备）：
 *   - SCREENSHOT_MIX_COUNT 环境变量解析
 *   - cleanupOldScreenshots 保留最近 N 个 PNG / -1 不删除
 */

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getMaxKeepCount, cleanupOldScreenshots } from '../../src/core/screenshot.js';

const KEY = 'SCREENSHOT_MIX_COUNT';
const orig = process.env[KEY];

beforeEach(() => {
  delete process.env[KEY];
});
afterEach(() => {
  if (orig === undefined) delete process.env[KEY];
  else process.env[KEY] = orig;
});

test('SCREENSHOT_MIX_COUNT 未设置时默认 10', () => {
  assert.equal(getMaxKeepCount(), 10);
});

test('SCREENSHOT_MIX_COUNT 解析：-1 / 数字 / 非法值', () => {
  process.env[KEY] = '-1';
  assert.equal(getMaxKeepCount(), -1);
  process.env[KEY] = '10';
  assert.equal(getMaxKeepCount(), 10);
  process.env[KEY] = '0';
  assert.equal(getMaxKeepCount(), 0);
  process.env[KEY] = 'abc';
  assert.equal(getMaxKeepCount(), 10);
});

test('cleanupOldScreenshots 仅保留最近 N 个 PNG', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shot-cleanup-'));
  try {
    // 造 5 个 PNG + 1 个非 PNG，用 mtime 区分新旧
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(path.join(dir, `shot_${i}.png`), 'x');
      const t = new Date(Date.now() + i * 1000);
      fs.utimesSync(path.join(dir, `shot_${i}.png`), t, t);
    }
    fs.writeFileSync(path.join(dir, 'note.txt'), 'x');

    await cleanupOldScreenshots(dir, 2);
    const left = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
    assert.equal(left.length, 2, '只应保留最近 2 个 PNG');
    assert.ok(left.includes('shot_3.png') && left.includes('shot_4.png'), '保留最新两个');
    assert.ok(fs.existsSync(path.join(dir, 'note.txt')), '非 PNG 文件不受影响');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('cleanupOldScreenshots keep=-1 不删除', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shot-cleanup-'));
  try {
    for (let i = 0; i < 3; i++) {
      fs.writeFileSync(path.join(dir, `shot_${i}.png`), 'x');
    }
    await cleanupOldScreenshots(dir, -1);
    assert.equal(fs.readdirSync(dir).length, 3, '-1 时不应删除任何文件');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('cleanupOldScreenshots 目录不存在时静默返回', async () => {
  await assert.doesNotReject(() =>
    cleanupOldScreenshots(path.join(os.tmpdir(), 'not-exist-dir-' + Date.now()), 10),
  );
});

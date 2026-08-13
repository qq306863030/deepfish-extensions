/**
 * 功能测试 A：环境/截图/鼠标/滚动
 * 对应 TEST-PLAN.md §1-§4
 *
 * 测试目标窗口用 WinForms（helpers.createTestWindow），可独立创建/关闭。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as coord from '../../src/core/coord.js';
import * as screenshot from '../../src/core/screenshot.js';
import * as mouse from '../../src/core/mouse.js';
import * as info from '../../src/core/info.js';
import * as window from '../../src/core/window.js';
import * as wait from '../../src/core/wait.js';
import * as type from '../../src/core/type.js';
import { createTestWindow, cleanupTestWindow } from './helpers.mjs';

// ============ §1 环境实测 ============

test('1.1 获取屏幕信息：逻辑/物理/scale', async () => {
  const si = await info.screenInfo();
  assert.ok(si.logicalWidth > 0 && si.logicalHeight > 0);
  assert.ok(si.physicalWidth >= si.logicalWidth, '物理 >= 逻辑');
  assert.ok(Math.abs(si.scaleX - si.physicalWidth / si.logicalWidth) < 1e-6);
});

test('1.2 DPI 换算公式：physicalToLogical 往返', async () => {
  coord.invalidateScreenCache();
  const si = await info.screenInfo();
  const px = { x: Math.round(si.logicalWidth * si.scaleX), y: Math.round(si.logicalHeight * si.scaleY) };
  const logical = await coord.physicalToLogical(px);
  assert.ok(Math.abs(logical.x - si.logicalWidth) <= 1, `x 差 ${logical.x - si.logicalWidth}`);
  assert.ok(Math.abs(logical.y - si.logicalHeight) <= 1, `y 差 ${logical.y - si.logicalHeight}`);
});

test('1.3 鼠标移动到屏幕角点后位置正确', async () => {
  const si = await info.screenInfo();
  const target = { x: si.physicalWidth - 2, y: si.physicalHeight - 2 };
  await mouse.move(target.x, target.y, { smooth: false, clamp: true });
  const pos = await mouse.getPosition();
  assert.ok(Math.abs(pos.logical.x - (si.logicalWidth - 2)) <= 3, `x: ${pos.logical.x} vs ${si.logicalWidth - 2}`);
  assert.ok(Math.abs(pos.logical.y - (si.logicalHeight - 2)) <= 3, `y: ${pos.logical.y} vs ${si.logicalHeight - 2}`);
});

test('1.4 区域校验：非法抛错', async () => {
  await assert.rejects(() => coord.validateRegion(0, 0, -1, 100), /宽高必须大于 0/);
  await assert.rejects(() => coord.validateRegion(0, 0, 99999, 100), /超出屏幕范围/);
});

test('1.5 越界坐标钳制', async () => {
  const si = await info.screenInfo();
  const p = await coord.clampPhysicalPoint(99999, 99999);
  assert.equal(p.x, si.physicalWidth - 1);
  assert.equal(p.y, si.physicalHeight - 1);
});

// ============ §2 截图 ============

test('2.1 全屏截图：尺寸 = 物理像素', async () => {
  const r = await screenshot.captureFullscreen();
  assert.ok(r.success);
  assert.ok(fs.existsSync(r.filePath));
  const si = await info.screenInfo();
  assert.equal(r.width, si.physicalWidth);
  assert.equal(r.height, si.physicalHeight);
  fs.unlinkSync(r.filePath);
});

test('2.2 区域截图：尺寸与内容对应', async () => {
  const r = await screenshot.captureRegion({ x: 0, y: 0, width: 200, height: 150 });
  assert.ok(r.success);
  assert.ok(Math.abs(r.width - 200) <= 1, `width ${r.width} vs 200`);
  assert.ok(Math.abs(r.height - 150) <= 1, `height ${r.height} vs 150`);
  fs.unlinkSync(r.filePath);
});

test('2.3 按窗口标题截图', async () => {
  const tw = await createTestWindow();
  try {
    const r = await screenshot.captureWindow({ handle: tw.handle });
    assert.ok(r.success);
    assert.ok(fs.existsSync(r.filePath));
    assert.ok(r.width > 100 && r.height > 100, `窗口截图尺寸 ${r.width}x${r.height}`);
    assert.equal(r.window.handle, tw.handle);
    fs.unlinkSync(r.filePath);
  } finally {
    cleanupTestWindow(tw.pid);
  }
});

test('2.5 文件名唯一不覆盖', async () => {
  const r1 = await screenshot.captureFullscreen('u');
  const r2 = await screenshot.captureFullscreen('u');
  assert.notEqual(r1.filePath, r2.filePath);
  fs.unlinkSync(r1.filePath);
  fs.unlinkSync(r2.filePath);
});

// ============ §3 鼠标基础 ============

test('3.1 移动后位置一致', async () => {
  await mouse.move(400, 300, { smooth: false });
  const pos = await mouse.getPosition();
  const si = await info.screenInfo();
  const logical = { x: Math.round(400 / si.scaleX), y: Math.round(300 / si.scaleY) };
  assert.ok(Math.abs(pos.logical.x - logical.x) <= 3);
  assert.ok(Math.abs(pos.logical.y - logical.y) <= 3);
});

test('3.2 平滑移动终点一致', async () => {
  await mouse.move(600, 400, { smooth: true, duration: 400 });
  const pos = await mouse.getPosition();
  const si = await info.screenInfo();
  const logical = { x: Math.round(600 / si.scaleX), y: Math.round(400 / si.scaleY) };
  assert.ok(Math.abs(pos.logical.x - logical.x) <= 3);
  assert.ok(Math.abs(pos.logical.y - logical.y) <= 3);
});

test('3.6 长按 press/release 释放正确', async () => {
  await mouse.move(700, 500);
  await mouse.press(700, 500);
  await new Promise((r) => setTimeout(r, 200));
  const r = await mouse.release('left');
  assert.equal(r.state, 'released');
});

test('3.7 取鼠标位置双坐标系', async () => {
  const pos = await mouse.getPosition();
  assert.ok(pos.logical.x > 0 && pos.logical.y > 0);
  assert.ok(pos.physical.x > 0 && pos.physical.y > 0);
});

// ============ §4 滚轮（用测试窗口标题栏区域做滚动验证不可靠，改为内容位移验证） ============

test('4.1 向下滚动后鼠标位置不变、无异常', async () => {
  // 滚动作用于当前鼠标位置；这里验证 API 调用成功且位置不漂移
  await mouse.move(800, 600);
  const before = await mouse.getPosition();
  await mouse.scroll('down', 3);
  await mouse.scroll('up', 3);
  const after = await mouse.getPosition();
  assert.equal(after.logical.x, before.logical.x);
  assert.equal(after.logical.y, before.logical.y);
});

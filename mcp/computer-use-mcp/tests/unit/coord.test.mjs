/**
 * 坐标换算单元测试
 * 不依赖真实屏幕（直接测试换算函数，scale 从 getScreenInfo 读取）
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  physicalToLogical,
  logicalToPhysical,
  clampPhysicalPoint,
  validateRegion,
  invalidateScreenCache,
} from '../../src/core/coord.js';

test('physicalToLogical 往返一致（150% 缩放）', async () => {
  invalidateScreenCache();
  const log = await physicalToLogical({ x: 2560, y: 1600 });
  const phys = await logicalToPhysical(log);
  // 允许 ±1px 舍入误差
  assert.ok(Math.abs(phys.x - 2560) <= 1, `x 差 ${phys.x - 2560}`);
  assert.ok(Math.abs(phys.y - 1600) <= 1, `y 差 ${phys.y - 1600}`);
});

test('scale 比例正确（物理宽 = 逻辑宽 * scaleX）', async () => {
  invalidateScreenCache();
  const info = (await import('../../src/core/coord.js')).getScreenInfo;
  const si = await info();
  const expectedScaleX = si.physicalWidth / si.logicalWidth;
  assert.ok(Math.abs(si.scaleX - expectedScaleX) < 1e-9);
});

test('clampPhysicalPoint 钳制越界坐标', async () => {
  const info = (await import('../../src/core/coord.js')).getScreenInfo;
  const si = await info();
  const p1 = await clampPhysicalPoint(-10, -20);
  assert.equal(p1.x, 0);
  assert.equal(p1.y, 0);
  const p2 = await clampPhysicalPoint(si.physicalWidth + 100, si.physicalHeight + 100);
  assert.equal(p2.x, si.physicalWidth - 1);
  assert.equal(p2.y, si.physicalHeight - 1);
});

test('validateRegion 合法区域返回逻辑坐标', async () => {
  invalidateScreenCache();
  const v = await validateRegion(0, 0, 100, 100);
  assert.equal(v.width, 100);
  assert.equal(v.height, 100);
  assert.ok(v.logical.width > 0);
  assert.ok(v.logical.height > 0);
});

test('validateRegion 非法区域抛错', async () => {
  invalidateScreenCache();
  await assert.rejects(() => validateRegion(0, 0, 0, 100), /宽高必须大于 0/);
  await assert.rejects(() => validateRegion(0, 0, -5, 100), /宽高必须大于 0/);
  await assert.rejects(() => validateRegion(0, 0, 100000, 100), /超出屏幕范围/);
  await assert.rejects(() => validateRegion(NaN, 0, 100, 100), /必须为数字/);
});

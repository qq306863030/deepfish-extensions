/**
 * 鼠标模块
 *
 * 能力：
 *   - move：移动（可选平滑插值）
 *   - click：左/右/中键，单击/双击
 *   - press / release：长按
 *   - scroll：滚轮四向（系统步进，约 120/notch）
 *   - drag：按住左键拖拽（起止点 + 中间步数）
 *   - getPosition：当前位置（双坐标系）
 *
 * 所有坐标输入均为物理像素（截图像素），内部换算逻辑像素交给 nut-js。
 */

import { mouse, Point, Button } from '@nut-tree-fork/nut-js';
import { physicalToLogical, logicalToPhysical, clampPhysicalPoint, getScreenInfo } from './coord.js';

/** 按键字符串 -> nut-js Button */
export function parseButton(button = 'left') {
  switch (String(button).toLowerCase()) {
    case 'right':
      return Button.RIGHT;
    case 'middle':
      return Button.MIDDLE;
    case 'left':
    default:
      return Button.LEFT;
  }
}

/**
 * 移动鼠标到物理像素坐标。
 * @param {number} x 物理 x
 * @param {number} y 物理 y
 * @param {{smooth?: boolean, duration?: number, clamp?: boolean}} [opts]
 */
export async function move(x, y, opts = {}) {
  const { smooth = false, duration = 300, clamp = true } = opts;
  let target = { x, y };
  if (clamp) target = await clampPhysicalPoint(x, y);
  const logical = await physicalToLogical(target);
  const from = await mouse.getPosition();

  if (smooth && duration > 0) {
    const steps = Math.max(5, Math.min(60, Math.round(duration / 10)));
    const stepMs = duration / steps;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = Math.round(from.x + (logical.x - from.x) * t);
      const py = Math.round(from.y + (logical.y - from.y) * t);
      await mouse.move(new Point(px, py));
      if (i < steps) await sleep(stepMs);
    }
  } else {
    await mouse.move(new Point(logical.x, logical.y));
  }

  const after = await mouse.getPosition();
  return {
    success: true,
    from: { x: from.x, y: from.y },
    to: { x: target.x, y: target.y, logical: logical },
    actual: after,
    smooth,
    duration,
  };
}

/**
 * 点击（左/右/中键，支持双击）。
 * @param {number} x 物理 x
 * @param {number} y 物理 y
 * @param {{button?: string, double?: boolean, clamp?: boolean}} [opts]
 */
export async function click(x, y, opts = {}) {
  const { button = 'left', double = false, clamp = true } = opts;
  let target = { x, y };
  if (clamp) target = await clampPhysicalPoint(x, y);
  const logical = await physicalToLogical(target);
  const btn = parseButton(button);

  await mouse.move(new Point(logical.x, logical.y));
  const presses = double ? 2 : 1;
  for (let i = 0; i < presses; i++) {
    await mouse.pressButton(btn);
    await mouse.releaseButton(btn);
    if (i < presses - 1) await sleep(100); // 双击间隔
  }

  return { success: true, x: target.x, y: target.y, button, double, logical };
}

/**
 * 按住鼠标按钮（长按起点）。
 * @param {number} x 物理 x
 * @param {number} y 物理 y
 * @param {string} [button] 按钮
 */
export async function press(x, y, button = 'left') {
  const target = await clampPhysicalPoint(x, y);
  const logical = await physicalToLogical(target);
  const btn = parseButton(button);
  await mouse.move(new Point(logical.x, logical.y));
  await mouse.pressButton(btn);
  return { success: true, x: target.x, y: target.y, button, state: 'pressed' };
}

/**
 * 释放鼠标按钮。
 * @param {string} [button] 按钮
 */
export async function release(button = 'left') {
  const btn = parseButton(button);
  await mouse.releaseButton(btn);
  return { success: true, button, state: 'released' };
}

/**
 * 滚轮滚动（四向）。amount 为滚动格数（系统步进，约 120/notch）。
 * @param {'up'|'down'|'left'|'right'} direction
 * @param {number} amount 格数
 */
export async function scroll(direction, amount) {
  const n = Math.max(1, Math.round(Number(amount) || 1));
  const dir = String(direction).toLowerCase();
  const map = {
    up: () => mouse.scrollUp(n),
    down: () => mouse.scrollDown(n),
    left: () => mouse.scrollLeft(n),
    right: () => mouse.scrollRight(n),
  };
  if (!map[dir]) throw new Error(`无效滚动方向: ${direction}（可选 up/down/left/right）`);
  // 滚动前先聚焦当前位置（可传坐标？此处滚动作用于当前鼠标位置）
  await map[dir]();
  const pos = await mouse.getPosition();
  return { success: true, direction: dir, amount: n, position: { x: pos.x, y: pos.y } };
}

/**
 * 拖拽：按住左键从起点移动到终点后释放。
 * @param {number} fromX 起点物理 x
 * @param {number} fromY 起点物理 y
 * @param {number} toX 终点物理 x
 * @param {number} toY 终点物理 y
 * @param {{steps?: number, duration?: number}} [opts]
 */
export async function drag(fromX, fromY, toX, toY, opts = {}) {
  const { steps = 20, duration = 300 } = opts;
  const from = await clampPhysicalPoint(fromX, fromY);
  const to = await clampPhysicalPoint(toX, toY);
  const fLogical = await physicalToLogical(from);
  const tLogical = await physicalToLogical(to);

  // 先移动到起点
  await mouse.move(new Point(fLogical.x, fLogical.y));
  await sleep(50);
  // 按住左键，并停留足够时间让 Windows Shell 识别为拖拽（而非单击）
  await mouse.pressButton(Button.LEFT);
  await sleep(250);
  let n = Math.max(2, Math.round(steps));
  try {
    // 沿直线插值移动
    const stepMs = duration / n;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const px = Math.round(fLogical.x + (tLogical.x - fLogical.x) * t);
      const py = Math.round(fLogical.y + (tLogical.y - fLogical.y) * t);
      await mouse.move(new Point(px, py));
      if (i < n) await sleep(stepMs);
    }
    // 终点停留片刻，确保放下（drop）被识别
    await sleep(200);
  } finally {
    // 无论成败都释放，防止锁死鼠标
    await mouse.releaseButton(Button.LEFT);
  }
  const end = await mouse.getPosition();
  return {
    success: true,
    from: { x: from.x, y: from.y },
    to: { x: to.x, y: to.y },
    end,
    steps: n,
  };
}

/**
 * 获取鼠标当前位置（双坐标系）。
 */
export async function getPosition() {
  const pos = await mouse.getPosition();
  const physical = await logicalToPhysical({ x: pos.x, y: pos.y });
  const info = await getScreenInfo();
  return {
    success: true,
    logical: { x: pos.x, y: pos.y },
    physical: { x: physical.x, y: physical.y },
    screen: { logicalWidth: info.logicalWidth, logicalHeight: info.logicalHeight, scaleX: info.scaleX, scaleY: info.scaleY },
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

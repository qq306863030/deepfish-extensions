/**
 * 坐标系统核心模块
 *
 * 约定（PLAN.md §2.1）：
 *   - MCP 工具的所有坐标参数 = 截图像素（物理像素），与视觉模型看到的截图一致；
 *   - nut-js 的 mouse.move / screen.grabRegion / 窗口 region 使用逻辑像素；
 *   - scale = 截图物理宽 / screen.width() 逻辑宽（实测本机 150% 缩放下 = 1.4997 ≈ 1.5）。
 *
 * 本模块提供：
 *   - getScreenInfo()：读取逻辑/物理分辨率与 scale；
 *   - physicalToLogical() / logicalToPhysical()：坐标换算；
 *   - clampPoint() / validateRegion()：坐标与区域校验。
 */

import { screen } from '@nut-tree-fork/nut-js';

// 缓存，避免每次调用都读屏幕（屏幕分辨率变化需重启进程）
let cached = null;

/**
 * 获取屏幕信息（首次调用后缓存）。
 * @returns {Promise<{logicalWidth, logicalHeight, physicalWidth, physicalHeight, scaleX, scaleY}>}
 */
export async function getScreenInfo() {
  if (cached) return cached;
  const logicalWidth = await screen.width();
  const logicalHeight = await screen.height();
  // grab 一次获取物理尺寸（物理像素截图）
  const shot = await screen.grab();
  const physicalWidth = shot.width;
  const physicalHeight = shot.height;
  cached = {
    logicalWidth,
    logicalHeight,
    physicalWidth,
    physicalHeight,
    scaleX: physicalWidth / logicalWidth,
    scaleY: physicalHeight / logicalHeight,
  };
  return cached;
}

/** 强制刷新屏幕缓存（分辨率变化时调用） */
export function invalidateScreenCache() {
  cached = null;
}

/**
 * 物理像素 -> 逻辑像素（MCP 坐标 -> nut-js 坐标）。
 * @param {{x: number, y: number}} p 物理像素坐标
 * @returns {Promise<{x: number, y: number}>} 逻辑像素坐标（取整）
 * @throws 坐标非有限数时抛错
 */
export async function physicalToLogical(p) {
  const info = await getScreenInfo();
  const x = Number(p.x);
  const y = Number(p.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`坐标必须为有限数字: x=${p.x}, y=${p.y}`);
  }
  return {
    x: Math.round(x / info.scaleX),
    y: Math.round(y / info.scaleY),
  };
}

/**
 * 逻辑像素 -> 物理像素（nut-js 坐标 -> MCP 坐标）。
 */
export async function logicalToPhysical(p) {
  const info = await getScreenInfo();
  return {
    x: Math.round(p.x * info.scaleX),
    y: Math.round(p.y * info.scaleY),
  };
}

/**
 * 将物理像素坐标钳制到屏幕物理范围内。
 * NaN / 非有限数坐标抛出明确错误，防止把无效坐标发给 nut-js 导致异常。
 * @returns {Promise<{x, y}>} 钳制后的物理坐标
 * @throws 坐标非有限数时抛错
 */
export async function clampPhysicalPoint(x, y) {
  const nums = [x, y].map(Number);
  if (nums.some((n) => !Number.isFinite(n))) {
    throw new Error(`坐标必须为有限数字: x=${x}, y=${y}`);
  }
  const info = await getScreenInfo();
  return {
    x: Math.max(0, Math.min(Math.round(nums[0]), info.physicalWidth - 1)),
    y: Math.max(0, Math.min(Math.round(nums[1]), info.physicalHeight - 1)),
  };
}

/**
 * 校验并规范化物理像素区域。
 * @param {number} x 左上角物理 x
 * @param {number} y 左上角物理 y
 * @param {number} width 物理宽度
 * @param {number} height 物理高度
 * @returns {Promise<{left, top, width, height, logical}>}
 *   返回逻辑区域（供 nut-js grabRegion/窗口截图用）与原物理区域。
 * @throws 区域非法（非有限数、宽高 <= 0、越界）时抛错
 */
export async function validateRegion(x, y, width, height) {
  const nums = [x, y, width, height].map(Number);
  if (nums.some((n) => !Number.isFinite(n))) {
    throw new Error(`区域参数必须为数字: x=${x}, y=${y}, width=${width}, height=${height}`);
  }
  const [rx, ry, rw, rh] = nums;
  if (rw <= 0 || rh <= 0) {
    throw new Error(`区域宽高必须大于 0: width=${rw}, height=${rh}`);
  }
  const info = await getScreenInfo();
  if (rx < 0 || ry < 0 || rx + rw > info.physicalWidth || ry + rh > info.physicalHeight) {
    throw new Error(
      `区域超出屏幕范围: (${rx},${ry}) ${rw}x${rh}，屏幕物理尺寸 ${info.physicalWidth}x${info.physicalHeight}`
    );
  }
  const logical = {
    left: Math.round(rx / info.scaleX),
    top: Math.round(ry / info.scaleY),
    width: Math.round(rw / info.scaleX),
    height: Math.round(rh / info.scaleY),
  };
  return { left: rx, top: ry, width: rw, height: rh, logical };
}

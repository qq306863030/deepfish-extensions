/**
 * 系统信息模块
 *
 * 提供：屏幕信息（逻辑/物理/scale）、鼠标位置、活动窗口。
 */

import { getScreenInfo } from './coord.js';
import { getPosition } from './mouse.js';
import { getActiveWindowInfo } from './window.js';

/**
 * 获取屏幕信息。
 * @returns {Promise<{success, logicalWidth, logicalHeight, physicalWidth, physicalHeight, scaleX, scaleY}>}
 */
export async function screenInfo() {
  const info = await getScreenInfo();
  return { success: true, ...info };
}

/**
 * 汇总信息：屏幕 + 鼠标 + 活动窗口。
 * @param {{mouse?: boolean, activeWindow?: boolean}} [opts]
 */
export async function systemInfo(opts = {}) {
  const { mouse = true, activeWindow = true } = opts;
  const info = await getScreenInfo();
  const result = {
    success: true,
    screen: {
      logicalWidth: info.logicalWidth,
      logicalHeight: info.logicalHeight,
      physicalWidth: info.physicalWidth,
      physicalHeight: info.physicalHeight,
      scaleX: info.scaleX,
      scaleY: info.scaleY,
    },
  };
  if (mouse) {
    try {
      result.mouse = await getPosition();
    } catch (_) {
      result.mouse = null;
    }
  }
  if (activeWindow) {
    try {
      const aw = await getActiveWindowInfo();
      result.activeWindow = aw.active;
    } catch (_) {
      result.activeWindow = null;
    }
  }
  return result;
}

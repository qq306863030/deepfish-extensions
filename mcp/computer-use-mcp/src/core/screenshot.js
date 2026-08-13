/**
 * 截图模块
 *
 * 能力：
 *   - 全屏截图（物理像素）
 *   - 区域截图（物理像素坐标输入，内部换算逻辑）
 *   - 按窗口标题截图（先定位窗口矩形，再抓该区域）
 *
 * 输出：PNG 文件到 COMPUTER_USE_SCREENSHOT_DIR（默认 <包根>/screenshots/），
 * 每次生成唯一文件名（时间戳），返回绝对路径 + 尺寸 + scale。
 */

import { screen } from '@nut-tree-fork/nut-js';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getScreenInfo, validateRegion } from './coord.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');

/** 截图输出目录（环境变量可覆盖） */
export function getScreenshotDir() {
  return process.env.COMPUTER_USE_SCREENSHOT_DIR
    ? path.resolve(process.env.COMPUTER_USE_SCREENSHOT_DIR)
    : path.join(PACKAGE_ROOT, 'screenshots');
}

/** 生成唯一文件名：screenshot_YYYYMMDD_HHmmss_xxx.png */
function uniqueFilename(prefix = 'screenshot') {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts =
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${ts}_${rand}.png`;
}

/** 把 nut-js 的 Image（raw 数据）用 sharp 保存为 PNG */
async function saveImage(image, filePath) {
  await sharp(image.data, {
    raw: { width: image.width, height: image.height, channels: image.channels },
  })
    .png()
    .toFile(filePath);
  return filePath;
}

/**
 * 全屏截图
 * @param {string} [prefix] 文件名前缀
 * @returns {Promise<{success, filePath, width, height, scaleX, scaleY, logicalWidth, logicalHeight}>}
 */
export async function captureFullscreen(prefix) {
  const shot = await screen.grab();
  const info = await getScreenInfo();
  const dir = getScreenshotDir();
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, uniqueFilename(prefix));
  await saveImage(shot, filePath);
  return {
    success: true,
    filePath,
    width: shot.width,
    height: shot.height,
    scaleX: info.scaleX,
    scaleY: info.scaleY,
    logicalWidth: info.logicalWidth,
    logicalHeight: info.logicalHeight,
  };
}

/**
 * 区域截图（物理像素坐标输入）
 * @param {{x:number,y:number,width:number,height:number}} region
 * @param {string} [prefix]
 */
export async function captureRegion(region, prefix) {
  const v = await validateRegion(region.x, region.y, region.width, region.height);
  const shot = await screen.grabRegion(v.logical);
  const dir = getScreenshotDir();
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, uniqueFilename(prefix || 'region'));
  await saveImage(shot, filePath);
  return {
    success: true,
    filePath,
    width: shot.width,
    height: shot.height,
    region: { x: region.x, y: region.y, width: region.width, height: region.height },
    scaleX: v.logical.width > 0 ? shot.width / v.logical.width : 1,
  };
}

/**
 * 按窗口标题截图：先找窗口矩形（逻辑坐标），转物理，再抓区域。
 * @param {{handle?:number, title?:string}} target 窗口定位
 * @returns {Promise<{success, filePath, width, height, window}>}
 * @throws 找不到窗口时抛错
 */
export async function captureWindow(target, prefix) {
  const { findWindow } = await import('./window.js');
  const win = await findWindow(target);
  const region = win.region; // 逻辑坐标 {left, top, width, height}
  // 转物理像素（截图以物理为准）
  const info = await getScreenInfo();
  const px = {
    x: Math.round(region.left * info.scaleX),
    y: Math.round(region.top * info.scaleY),
    width: Math.round(region.width * info.scaleX),
    height: Math.round(region.height * info.scaleY),
  };
  // 防止越界
  const x = Math.max(0, px.x);
  const y = Math.max(0, px.y);
  const width = Math.min(px.width, info.physicalWidth - x);
  const height = Math.min(px.height, info.physicalHeight - y);
  const v = await validateRegion(x, y, width, height);
  const shot = await screen.grabRegion(v.logical);
  const dir = getScreenshotDir();
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, uniqueFilename(prefix || 'window'));
  await saveImage(shot, filePath);
  return {
    success: true,
    filePath,
    width: shot.width,
    height: shot.height,
    window: { handle: win.handle, title: win.title },
  };
}

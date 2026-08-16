/**
 * 截图模块
 *
 * 能力：
 *   - 全屏截图（物理像素）
 *   - 区域截图（物理像素坐标输入，内部换算逻辑）
 *   - 按窗口标题截图（先定位窗口矩形，再抓该区域）
 *
 * 输出：PNG 文件到 SCREENSHOT_DIR（默认 <包根>/screenshots/），
 * 每次生成唯一文件名（时间戳），返回绝对路径 + 尺寸 + scale。
 * 自动清理：SCREENSHOT_MIX_COUNT（默认 10）控制目录保留文件数，-1 表示不删除。
 */

import { screen } from '@nut-tree-fork/nut-js';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getScreenInfo, validateRegion } from './coord.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');

/**
 * 截图输出目录（环境变量 SCREENSHOT_DIR 可覆盖）：
 *   - 设置了非空 SCREENSHOT_DIR → 使用该目录；
 *   - 未设置 / 空字符串 / 纯空白 → 回退到 index.js 所在目录（包根）。
 */
export function getScreenshotDir() {
  const dir = process.env.SCREENSHOT_DIR;
  if (dir && String(dir).trim() !== '') {
    return path.resolve(String(dir).trim());
  }
  return PACKAGE_ROOT;
}

/**
 * 截图保留数量（环境变量 SCREENSHOT_MIX_COUNT）：
 *   - 未设置 / 非法值 → 默认 10
 *   - -1 → 不自动删除
 *   - >= 0 → 目录仅保留最近 N 个 PNG 文件（0 表示只留最新一张）
 * @returns {number}
 */
export function getMaxKeepCount() {
  const raw = process.env.SCREENSHOT_MIX_COUNT;
  if (raw === undefined || raw === null || String(raw).trim() === '') return 10;
  const n = Number.parseInt(String(raw), 10);
  if (Number.isNaN(n)) return 10;
  return n;
}

/**
 * 清理旧截图：目录内仅保留最近 keep 个 PNG 文件（按修改时间，最新在前）。
 * keep < 0 表示不清理；目录不存在时静默返回。
 * @param {string} dir 截图目录
 * @param {number} keep 保留数量
 */
export async function cleanupOldScreenshots(dir, keep) {
  if (keep < 0) return; // -1：不自动删除
  let names;
  try {
    names = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return; // 目录不存在则无需清理
  }
  const pngs = names
    .filter((f) => f.isFile() && f.name.toLowerCase().endsWith('.png'))
    .map((f) => ({
      name: f.name,
      mtime: fs.statSync(path.join(dir, f.name)).mtimeMs,
    }));
  if (pngs.length <= keep) return;
  pngs.sort((a, b) => b.mtime - a.mtime); // 最新在前
  for (const f of pngs.slice(keep)) {
    try {
      await fs.promises.unlink(path.join(dir, f.name));
    } catch (err) {
      process.stderr.write(`[cleanup] 删除失败 ${f.name}: ${err.message}\n`);
    }
  }
}

/** 截图后异步清理旧文件（fire-and-forget，不阻塞截图返回） */
function scheduleCleanup(dir) {
  const keep = getMaxKeepCount();
  if (keep < 0) return;
  cleanupOldScreenshots(dir, keep).catch((err) => {
    process.stderr.write(`[cleanup] ${err.message}\n`);
  });
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
  let data = image.data;
  // nut-js 在 Windows 上 grab 返回 BGRA（DIB 位图格式），而 sharp 的 raw 输入
  // 按 RGBA 解释，会导致红蓝通道互换（截图偏色）。4 通道时交换 R/B 修正。
  if (image.channels === 4) {
    const buf = Buffer.from(data);
    for (let i = 0; i < buf.length; i += 4) {
      const tmp = buf[i];
      buf[i] = buf[i + 2];
      buf[i + 2] = tmp;
    }
    data = buf;
  }
  await sharp(data, {
    raw: { width: image.width, height: image.height, channels: image.channels },
  })
    .png()
    .toFile(filePath);
  return filePath;
}

/**
 * 截图后处理（借鉴 domdomegg/computer-use-mcp 的 crosshair 与降采样思路）：
 *   1. showCursor=true 时在鼠标位置绘制红色十字准星——模型可直观看到光标在哪、
 *      点击后对照验证是否命中（避免"点了不知道点到哪"）；
 *   2. maxSize 指定时按最长边降采样（如 1568）——模型看到的是 API 降采样后的尺寸，
 *      返回 imageWidth/imageHeight/scale，模型坐标按 scale 换算回物理像素，
 *      从根上解决 2K/4K 全屏坐标幻觉。
 * @param {string} filePath PNG 文件路径（就地覆盖写）
 * @param {{showCursor?: boolean, maxSize?: number, originX?: number, originY?: number}} opts
 * @returns {Promise<{scale: number, imageWidth: number, imageHeight: number}>}
 */
async function postProcess(filePath, opts = {}) {
  const { showCursor = false, maxSize, originX = 0, originY = 0 } = opts;
  let pipeline = sharp(filePath);
  const meta = await pipeline.metadata();
  let scale = 1;

  if (showCursor) {
    let pos = null;
    try {
      // mouse.js 为具名导出：move / click / getPosition 等
      const m = await import('./mouse.js');
      const r = await m.getPosition();
      // 十字中心 = 鼠标物理坐标 - 截图区域原点（全屏原点为 0,0）
      pos = { x: r.physical.x - originX, y: r.physical.y - originY };
    } catch {
      // 鼠标位置不可得则跳过十字
    }
    if (pos && pos.x >= 0 && pos.y >= 0 && pos.x < meta.width && pos.y < meta.height) {
      const L = 18;
      const svg = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}">` +
          `<line x1="${pos.x - L}" y1="${pos.y}" x2="${pos.x + L}" y2="${pos.y}" stroke="#ff0000" stroke-width="3"/>` +
          `<line x1="${pos.x}" y1="${pos.y - L}" x2="${pos.x}" y2="${pos.y + L}" stroke="#ff0000" stroke-width="3"/>` +
          `<circle cx="${pos.x}" cy="${pos.y}" r="5" fill="none" stroke="#ff0000" stroke-width="3"/>` +
          `</svg>`
      );
      const overlay = await sharp(svg).png().toBuffer();
      pipeline = pipeline.composite([{ input: overlay, left: 0, top: 0 }]);
    }
  }

  if (maxSize && Math.max(meta.width, meta.height) > maxSize) {
    scale = maxSize / Math.max(meta.width, meta.height);
    pipeline = pipeline.resize(Math.max(1, Math.round(meta.width * scale)), Math.max(1, Math.round(meta.height * scale)));
  }

  // sharp 不允许同文件输入输出：先写临时文件再原子替换
  const tmpPath = `${filePath}.tmp.png`;
  await pipeline.png().toFile(tmpPath);
  await fs.promises.rename(tmpPath, filePath);
  const outMeta = await sharp(filePath).metadata();
  return { scale, imageWidth: outMeta.width, imageHeight: outMeta.height };
}

/**
 * 全屏截图
 * @param {string} [prefix] 文件名前缀
 * @param {{showCursor?: boolean, maxSize?: number}} [opts] showCursor=画鼠标十字准星；maxSize=最长边降采样
 * @returns {Promise<{success, filePath, width, height, scaleX, scaleY, logicalWidth, logicalHeight,
 *   imageWidth?, imageHeight?, scale?}>}
 */
export async function captureFullscreen(prefix, opts = {}) {
  const shot = await screen.grab();
  const info = await getScreenInfo();
  const dir = getScreenshotDir();
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, uniqueFilename(prefix));
  await saveImage(shot, filePath);
  const post = await postProcess(filePath, opts);
  scheduleCleanup(dir);
  return {
    success: true,
    filePath,
    width: shot.width,
    height: shot.height,
    scaleX: info.scaleX,
    scaleY: info.scaleY,
    logicalWidth: info.logicalWidth,
    logicalHeight: info.logicalHeight,
    // 降采样后：模型看到的尺寸与换算比例（physical = model / scale）
    imageWidth: post.imageWidth,
    imageHeight: post.imageHeight,
    scale: post.scale,
  };
}

/**
 * 区域截图（物理像素坐标输入）
 * @param {{x:number,y:number,width:number,height:number}} region
 * @param {string} [prefix]
 * @param {{showCursor?: boolean, maxSize?: number}} [opts]
 */
export async function captureRegion(region, prefix, opts = {}) {
  const v = await validateRegion(region.x, region.y, region.width, region.height);
  const shot = await screen.grabRegion(v.logical);
  const dir = getScreenshotDir();
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, uniqueFilename(prefix || 'region'));
  await saveImage(shot, filePath);
  const post = await postProcess(filePath, {
    ...opts,
    originX: region.x,
    originY: region.y,
  });
  scheduleCleanup(dir);
  return {
    success: true,
    filePath,
    width: shot.width,
    height: shot.height,
    region: { x: region.x, y: region.y, width: region.width, height: region.height },
    scaleX: v.logical.width > 0 ? shot.width / v.logical.width : 1,
    imageWidth: post.imageWidth,
    imageHeight: post.imageHeight,
    scale: post.scale,
  };
}

/**
 * 按窗口标题截图：先找窗口矩形（逻辑坐标），转物理，再抓区域。
 * @param {{handle?:number, title?:string}} target 窗口定位
 * @param {string} [prefix]
 * @param {{showCursor?: boolean, maxSize?: number}} [opts]
 * @returns {Promise<{success, filePath, width, height, window}>}
 * @throws 找不到窗口时抛错
 */
export async function captureWindow(target, prefix, opts = {}) {
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
  const post = await postProcess(filePath, {
    ...opts,
    originX: x,
    originY: y,
  });
  scheduleCleanup(dir);
  return {
    success: true,
    filePath,
    width: shot.width,
    height: shot.height,
    window: { handle: win.handle, title: win.title },
    imageWidth: post.imageWidth,
    imageHeight: post.imageHeight,
    scale: post.scale,
  };
}

/**
 * 剪贴板模块（文本）
 *
 * 基于 nut-js 内置 clipboard（Windows 走 clipboardy）。
 * 提供 get / set，以及"设置后恢复原内容"的辅助（供 type 粘贴用）。
 */

import { clipboard } from '@nut-tree-fork/nut-js';

const RETRY = 5;
const RETRY_DELAY_MS = 80;

/** 带重试的剪贴板设置（Windows 剪贴板锁偶发"拒绝访问"） */
async function setContentWithRetry(text) {
  let lastErr = null;
  for (let i = 0; i < RETRY; i++) {
    try {
      await clipboard.setContent(text);
      return;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  throw lastErr;
}

/** 带重试的剪贴板读取 */
async function getContentWithRetry() {
  let lastErr = null;
  for (let i = 0; i < RETRY; i++) {
    try {
      return await clipboard.getContent();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  throw lastErr;
}

/**
 * 读取剪贴板文本。
 * @returns {Promise<{success, text}>}
 */
export async function getText() {
  const text = await getContentWithRetry();
  return { success: true, text };
}

/**
 * 设置剪贴板文本。
 * @param {string} text
 */
export async function setText(text) {
  if (typeof text !== 'string') throw new Error(`剪贴板内容必须是字符串，收到: ${typeof text}`);
  await setContentWithRetry(text);
  return { success: true, text };
}

/**
 * 临时设置剪贴板，执行 callback 后恢复原内容（若失败也恢复）。
 * @param {string} text 临时内容
 * @param {() => Promise<T>} fn 期间要执行的异步函数
 * @returns {Promise<T>}
 */
export async function withClipboard(text, fn) {
  let prev = null;
  try {
    prev = await getContentWithRetry();
  } catch (_) {
    prev = null;
  }
  await setContentWithRetry(text);
  try {
    return await fn();
  } finally {
    // 恢复原内容（读不到则清空）
    try {
      if (prev !== null) await setContentWithRetry(prev);
    } catch (_) {}
  }
}

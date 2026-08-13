/**
 * 文本输入模块（剪贴板粘贴方案）
 *
 * 用户决策：所有文本输入一律走"剪贴板粘贴"，彻底绕开 IME/中文输入法问题
 * （详见 PLAN.md 与 AGENTS.md §4.4）。
 *
 * 流程：
 *   1. 保存当前剪贴板内容；
 *   2. 写入目标文本到剪贴板；
 *   3. 发送 Ctrl+V 粘贴；
 *   4. 可选回车；
 *   5. 恢复原剪贴板内容。
 *
 * 注意：目标应用需支持 Ctrl+V（终端类可能需 Ctrl+Shift+V，由调用方选择 shortcut）。
 */

import { keyboard, Key } from '@nut-tree-fork/nut-js';
import { withClipboard } from './clipboard.js';

/**
 * 粘贴输入文本。
 * @param {string} text 要输入的文本
 * @param {{enter?: boolean, delay?: number, shortcut?: 'ctrl+v'|'ctrl+shift+v'}} [opts]
 */
export async function typeText(text, opts = {}) {
  if (typeof text !== 'string') throw new Error(`输入内容必须是字符串，收到: ${typeof text}`);
  const { enter = false, delay = 50, shortcut = 'ctrl+v' } = opts;
  keyboard.config.autoDelayMs = delay;

  const result = await withClipboard(text, async () => {
    // 发送粘贴快捷键
    const parts = shortcut.toLowerCase().split('+').map((k) => k.trim());
    const keys = parts.map((p) => {
      if (p === 'ctrl') return Key.LeftControl;
      if (p === 'shift') return Key.LeftShift;
      if (p === 'v') return Key.V;
      if (p === 'c') return Key.C;
      if (p === 'a') return Key.A;
      throw new Error(`粘贴快捷键中无效按键: ${p}`);
    });
    try {
      await keyboard.pressKey(...keys);
      await keyboard.releaseKey(...keys);
    } catch (e) {
      try { await keyboard.releaseKey(...keys); } catch (_) {}
      throw e;
    }
    if (enter) {
      await keyboard.pressKey(Key.Enter);
      await keyboard.releaseKey(Key.Enter);
    }
  });

  return { success: true, text, length: text.length, enter, shortcut, clipboardRestored: true };
}

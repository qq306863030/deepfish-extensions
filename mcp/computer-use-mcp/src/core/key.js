/**
 * 键盘按键模块
 *
 * 能力：
 *   - key：组合键（ctrl+c、ctrl+shift+esc、win+r 等），自动释放防卡键
 *   - 完整按键表：修饰键、编辑键、导航键、方向键、F1-F24、数字、字母、小键盘、多媒体键
 *
 * 组合格式：小写 + 连接（如 "ctrl+shift+esc"）。
 */

import { keyboard, Key } from '@nut-tree-fork/nut-js';

// 按键映射表（仅收录 nut-js Key 中确实存在的键）
const KEY_MAP = {
  // 修饰键
  ctrl: Key.LeftControl,
  control: Key.LeftControl,
  shift: Key.LeftShift,
  alt: Key.LeftAlt,
  meta: Key.LeftMeta,
  win: Key.LeftMeta,
  cmd: Key.LeftMeta,
  super: Key.LeftMeta,
  // 编辑键
  enter: Key.Enter,
  return: Key.Enter,
  tab: Key.Tab,
  esc: Key.Escape,
  escape: Key.Escape,
  space: Key.Space,
  backspace: Key.Backspace,
  bksp: Key.Backspace,
  delete: Key.Delete,
  del: Key.Delete,
  insert: Key.Insert,
  ins: Key.Insert,
  // 导航
  home: Key.Home,
  end: Key.End,
  pageup: Key.PageUp,
  pgup: Key.PageUp,
  pagedown: Key.PageDown,
  pgdn: Key.PageDown,
  up: Key.Up,
  down: Key.Down,
  left: Key.Left,
  right: Key.Right,
  // F 键
  f1: Key.F1, f2: Key.F2, f3: Key.F3, f4: Key.F4,
  f5: Key.F5, f6: Key.F6, f7: Key.F7, f8: Key.F8,
  f9: Key.F9, f10: Key.F10, f11: Key.F11, f12: Key.F12,
  f13: Key.F13, f14: Key.F14, f15: Key.F15, f16: Key.F16,
  f17: Key.F17, f18: Key.F18, f19: Key.F19, f20: Key.F20,
  f21: Key.F21, f22: Key.F22, f23: Key.F23, f24: Key.F24,
  // 小键盘数字
  num0: Key.NumPad0, num1: Key.NumPad1, num2: Key.NumPad2,
  num3: Key.NumPad3, num4: Key.NumPad4, num5: Key.NumPad5,
  num6: Key.NumPad6, num7: Key.NumPad7, num8: Key.NumPad8,
  num9: Key.NumPad9,
  numlock: Key.NumLock,
  // 锁定/系统
  capslock: Key.CapsLock,
  scrolllock: Key.ScrollLock,
  printscreen: Key.PrintScreen,
  prtsc: Key.PrintScreen,
  pause: Key.Pause,
  // 多媒体（nut-js 真实常量名）
  volumeup: Key.AudioVolUp,
  volumedown: Key.AudioVolDown,
  audiomute: Key.AudioMute,
  // 分隔符
  numadd: Key.NumPadAdd,
  numsub: Key.NumPadSubtract,
  nummul: Key.NumPadMultiply,
  numdiv: Key.NumPadDivide,
  numdec: Key.NumPadDecimal,
};

/** 可读的按键列表（供 MCP schema 枚举提示用） */
export function listKeys() {
  return Object.keys(KEY_MAP);
}

/**
 * 解析按键串为 Key 对象数组。
 * @param {string} keys 如 "ctrl+shift+esc"
 * @returns {Key[]}
 */
export function parseKeys(keys) {
  const parts = String(keys).toLowerCase().split('+').map((k) => k.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error('按键串为空');
  const result = [];
  for (const part of parts) {
    const mapped = KEY_MAP[part];
    // 注意：部分 Key 常量枚举值为 0（如 Escape），不能用 truthy 判断
    if (mapped !== undefined) {
      result.push(mapped);
      continue;
    }
    // 单字母
    if (part.length === 1 && /[a-z]/.test(part)) {
      const letter = part.toUpperCase();
      if (Key[letter]) { result.push(Key[letter]); continue; }
    }
    // 单数字 -> 主键盘数字键 Key.Num0-Num9（nut-js 模型）
    if (/^[0-9]$/.test(part)) {
      const numKey = `Num${part}`;
      if (Key[numKey] !== undefined) { result.push(Key[numKey]); continue; }
    }
    throw new Error(`未知按键: ${part}（支持: ${listKeys().join(', ')}）`);
  }
  return result;
}

/**
 * 执行按键组合。
 * @param {string} keys 如 "ctrl+c"
 * @param {{delay?: number}} [opts]
 */
export async function key(keys, opts = {}) {
  const delay = opts.delay ?? 30;
  keyboard.config.autoDelayMs = delay;
  const keyObjects = parseKeys(keys);
  try {
    await keyboard.pressKey(...keyObjects);
    await keyboard.releaseKey(...keyObjects);
  } catch (e) {
    // 异常时确保释放
    try { await keyboard.releaseKey(...keyObjects); } catch (_) {}
    throw e;
  }
  return { success: true, keys, keyList: keys.toLowerCase().split('+').map((k) => k.trim()) };
}

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
import { execFileSync } from 'node:child_process';

// 按键映射表（仅收录 nut-js Key 中确实存在的键）
// 含 xdotool 风格别名（借鉴 domdomegg/computer-use-mcp）：_l/_r 后缀、l_/r_ 前缀、kp_ 小键盘等
const KEY_MAP = {
  // 修饰键
  ctrl: Key.LeftControl,
  control: Key.LeftControl,
  ctrl_l: Key.LeftControl, l_ctrl: Key.LeftControl, control_l: Key.LeftControl, l_control: Key.LeftControl,
  ctrl_r: Key.RightControl, r_ctrl: Key.RightControl, control_r: Key.RightControl, r_control: Key.RightControl,
  shift: Key.LeftShift,
  shift_l: Key.LeftShift, l_shift: Key.LeftShift,
  shift_r: Key.RightShift, r_shift: Key.RightShift,
  alt: Key.LeftAlt,
  alt_l: Key.LeftAlt, l_alt: Key.LeftAlt,
  alt_r: Key.RightAlt, r_alt: Key.RightAlt,
  meta: Key.LeftMeta,
  win: Key.LeftMeta,
  cmd: Key.LeftMeta,
  super: Key.LeftMeta,
  win_l: Key.LeftMeta, l_win: Key.LeftMeta, meta_l: Key.LeftMeta, l_meta: Key.LeftMeta,
  super_l: Key.LeftMeta, l_super: Key.LeftMeta, command: Key.LeftMeta, command_l: Key.LeftMeta,
  win_r: Key.RightMeta, r_win: Key.RightMeta, meta_r: Key.RightMeta, r_meta: Key.RightMeta,
  super_r: Key.RightMeta, r_super: Key.RightMeta, command_r: Key.RightMeta,
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
  page_up: Key.PageUp, prior: Key.PageUp,
  pagedown: Key.PageDown,
  pgdn: Key.PageDown,
  page_down: Key.PageDown, next: Key.PageDown,
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
  // 小键盘数字（kp_ 与 num 两种前缀）
  num0: Key.NumPad0, num1: Key.NumPad1, num2: Key.NumPad2,
  num3: Key.NumPad3, num4: Key.NumPad4, num5: Key.NumPad5,
  num6: Key.NumPad6, num7: Key.NumPad7, num8: Key.NumPad8,
  num9: Key.NumPad9,
  kp_0: Key.NumPad0, kp_1: Key.NumPad1, kp_2: Key.NumPad2,
  kp_3: Key.NumPad3, kp_4: Key.NumPad4, kp_5: Key.NumPad5,
  kp_6: Key.NumPad6, kp_7: Key.NumPad7, kp_8: Key.NumPad8,
  kp_9: Key.NumPad9,
  numlock: Key.NumLock,
  num_lock: Key.NumLock,
  kp_add: Key.NumPadAdd, numadd: Key.NumPadAdd,
  kp_subtract: Key.NumPadSubtract, numsub: Key.NumPadSubtract,
  kp_multiply: Key.NumPadMultiply, nummul: Key.NumPadMultiply,
  kp_divide: Key.NumPadDivide, numdiv: Key.NumPadDivide,
  kp_decimal: Key.NumPadDecimal, numdec: Key.NumPadDecimal,
  // 锁定/系统
  capslock: Key.CapsLock,
  caps_lock: Key.CapsLock, caps: Key.CapsLock,
  scrolllock: Key.ScrollLock,
  scroll_lock: Key.ScrollLock,
  printscreen: Key.PrintScreen,
  prtsc: Key.PrintScreen,
  pause: Key.Pause,
  // 多媒体（nut-js 真实常量名）
  volumeup: Key.AudioVolUp,
  volup: Key.AudioVolUp, vol_up: Key.AudioVolUp, audio_vol_up: Key.AudioVolUp,
  volumedown: Key.AudioVolDown,
  voldown: Key.AudioVolDown, vol_down: Key.AudioVolDown, audio_vol_down: Key.AudioVolDown,
  audiomute: Key.AudioMute,
  mute: Key.AudioMute, audio_mute: Key.AudioMute,
  // 标点（xdotool 风格名）
  minus: Key.Minus,
  equal: Key.Equal,
  bracketleft: Key.LeftBracket, bracket_l: Key.LeftBracket, l_bracket: Key.LeftBracket,
  bracketright: Key.RightBracket, bracket_r: Key.RightBracket, r_bracket: Key.RightBracket,
  semicolon: Key.Semicolon, semi: Key.Semicolon,
  quote: Key.Quote,
  grave: Key.Grave,
  comma: Key.Comma,
  period: Key.Period,
  slash: Key.Slash,
  backslash: Key.Backslash,
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
  const lower = String(keys).toLowerCase();
  // Windows 下 nut-js 的 LeftMeta 不可靠（win+d 偶发无效），
  // 含 win/meta 的组合键一律走 PowerShell keybd_event 兜底
  if (/(^|\+)win(\+|$)/.test(lower) || /(^|\+)meta(\+|$)/.test(lower) || /(^|\+)super(\+|$)/.test(lower)) {
    return await winKey(lower, opts);
  }
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
  return { success: true, keys, keyList: lower.split('+').map((k) => k.trim()) };
}

/** Windows 虚拟键码（keybd_event 用） */
const VK = {
  win: 0x5b, meta: 0x5b,
  ctrl: 0x11, control: 0x11, shift: 0x10, alt: 0x12,
  enter: 0x0d, return: 0x0d, tab: 0x09, esc: 0x1b, escape: 0x1b,
  space: 0x20, backspace: 0x08, bksp: 0x08, delete: 0x2e, del: 0x2e,
  insert: 0x2d, ins: 0x2d,
  home: 0x24, end: 0x23, pageup: 0x21, pgup: 0x21, pagedown: 0x22, pgdn: 0x22,
  up: 0x26, down: 0x28, left: 0x25, right: 0x27,
};

/** 组合串 -> VK 码数组（仅支持 keybd_event 场景的键） */
function parseVk(keys) {
  const parts = String(keys).toLowerCase().split('+').map((k) => k.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error('按键串为空');
  return parts.map((p) => {
    if (VK[p] !== undefined) return VK[p];
    if (p.length === 1 && /[a-z]/.test(p)) return 0x41 + (p.charCodeAt(0) - 97);
    if (/^[0-9]$/.test(p)) return 0x30 + Number(p);
    if (/^f([1-9]|1[0-9]|2[0-4])$/.test(p)) return 0x70 + (Number(p.slice(1)) - 1);
    if (/^num([0-9])$/.test(p)) return 0x60 + Number(p[3]);
    if (p === 'numlock') return 0x90;
    if (p === 'capslock') return 0x14;
    if (p === 'printscreen' || p === 'prtsc') return 0x2c;
    if (p === 'pause') return 0x13;
    throw new Error(`win 组合中不支持按键: ${p}`);
  });
}

/** 用 PowerShell keybd_event 发送含 win 的组合键（Windows 下可靠） */
async function winKey(keys, opts = {}) {
  // win+d 显示桌面：MinimizeAll 比 keybd_event 更可靠（实测 3/3 vs 1/3）
  if (/^(win|meta|super)\+d$/.test(keys.toLowerCase())) {
    try {
      execFileSync('powershell.exe', ['-NoProfile', '-Command',
        "(New-Object -ComObject Shell.Application).MinimizeAll()"], { encoding: 'utf8', windowsHide: true });
      return { success: true, keys, keyList: keys.toLowerCase().split('+').map((k) => k.trim()), via: 'minimize-all' };
    } catch (e) {
      // 兜底 keybd_event
    }
  }
  const vks = parseVk(keys);
  const delay = Math.max(20, opts.delay ?? 60);
  const pressList = vks.map((v) => `[Kbd]::keybd_event(${v}, 0, 0, 0); Start-Sleep -Milliseconds ${delay}`);
  const releaseList = [...vks].reverse().map((v) => `[Kbd]::keybd_event(${v}, 0, 2, 0); Start-Sleep -Milliseconds ${delay}`);
  const ps = `
Add-Type -TypeDefinition '
using System;
using System.Runtime.InteropServices;
public class Kbd {
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
}
';
${pressList.join('\n')}
${releaseList.join('\n')}
`;
  try {
    execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], {
      encoding: 'utf8', windowsHide: true,
    });
  } catch (e) {
    const msg = (e.stdout || '') + (e.stderr || '') || e.message;
    throw new Error(`win 组合键发送失败: ${msg.trim().split('\n')[0]}`);
  }
  return { success: true, keys, keyList: keys.toLowerCase().split('+').map((k) => k.trim()), via: 'keybd_event' };
}

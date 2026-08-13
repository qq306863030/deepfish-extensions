/**
 * 功能测试共享工具
 *
 * 测试目标窗口：用 PowerShell 内联创建 WinForms 窗口（标题 = 唯一 tag）。
 * 理由：这台机器 Win11 的 notepad/mspaint 等经典应用是 UWP 单例（复用实例、
 * 不可杀、标题脏），不适合做独立窗口测试；WinForms 窗口 100% 可控可关可杀。
 */

import { execSync } from 'node:child_process';
import * as window from '../../src/core/window.js';
import * as wait from '../../src/core/wait.js';
import * as type from '../../src/core/type.js';
import * as key from '../../src/core/key.js';
import * as mouse from '../../src/core/mouse.js';
import * as clipboard from '../../src/core/clipboard.js';

/** 创建测试窗口，返回 { pid, handle, title, region } */
export async function createTestWindow() {
  const tag = 'CUMCP-TEST-' + Math.random().toString(36).slice(2, 8);
  const inline =
    `Add-Type -AssemblyName System.Windows.Forms; ` +
    `$f = New-Object System.Windows.Forms.Form; ` +
    `$f.Text = '${tag}'; ` +
    `$f.Width = 640; $f.Height = 480; ` +
    `$f.StartPosition = 'CenterScreen'; ` +
    `$f.Show(); ` +
    `[System.Windows.Forms.Application]::Run($f)`;
  const r = await window.launchProcess('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', inline]);
  // 等窗口出现（最多 6s）
  let hit = null;
  for (let i = 0; i < 30; i++) {
    await wait.wait(200);
    try {
      const wins = await window.listWindows();
      hit = wins.find((w) => w.title === tag);
      if (hit) break;
    } catch (_) {}
  }
  if (!hit) throw new Error('测试窗口未在 6s 内出现');
  return { pid: r.pid, handle: hit.handle, title: tag, region: hit.region };
}

/** 关闭测试窗口进程 */
export function cleanupTestWindow(pid) {
  try {
    if (pid) execSync(`taskkill /PID ${pid} /F >nul 2>&1`, { shell: 'cmd.exe' });
  } catch (_) {}
}

/**
 * 在测试窗口上聚焦编辑区域并输入文本（模拟 Agent：激活→点击定位→输入）。
 * WinForms 窗口没有文本输入区，这里把输入焦点放到窗口，用剪贴板验证。
 */
export async function focusAndType(handle, text) {
  await window.activateWindow({ handle });
  await wait.wait(600);
  await mouse.click(400, 250, { button: 'left' }); // 窗口中央
  await wait.wait(200);
  await type.typeText(text);
  await wait.wait(300);
}

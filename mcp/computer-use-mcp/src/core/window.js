/**
 * 窗口管理模块
 *
 * 实现策略（实测结论，详见 AGENTS.md §8）：
 *   - nut-js `getWindows()` 能枚举窗口（getTitle/getRegion/focus/move/resize），
 *     但 getTitle 对中文标题有乱码风险；
 *   - **窗口列表一律走 PowerShell GetWindowTextW（Unicode 安全）** 读取标题 + 矩形，
 *     nut-js 仅用于 handle 的聚焦/移动/缩放；
 *   - minimize/restore/maximize/close/launch 均用 PowerShell（nut-js 不支持）。
 *
 * 坐标约定：window region 返回逻辑坐标（与 nut-js 一致），
 * 但 MCP 层的窗口移动/缩放的 x/y 参数采用物理像素（截图像素），内部换算。
 */

import nut from '@nut-tree-fork/nut-js';
import { execFileSync } from 'node:child_process';
import { physicalToLogical, getScreenInfo } from './coord.js';

// nut-js 是 CJS 模块，通过默认导入解构
const { getWindows, getActiveWindow, window: win } = nut;

/** 枚举所有顶层可见窗口（PowerShell GetWindowTextW，Unicode 安全） */
export async function listWindows() {
  const out = runPowerShell(getEnumPsScript());
  const windows = [];
  for (const line of out.split(/\r?\n/)) {
    const line2 = line.trim();
    if (!line2) continue;
    // 格式: handle|pid|title
    const seg = line2.split('|');
    if (seg.length < 3) continue;
    const handle = Number(seg[0]);
    const pid = Number(seg[1]);
    const title = seg.slice(2).join('|');
    if (!Number.isFinite(handle) || handle <= 0) continue;
    windows.push({ handle, pid: Number.isFinite(pid) ? pid : undefined, title });
  }
  // 补充 region（nut-js，逻辑坐标），失败则跳过该窗口
  const result = [];
  for (const w of windows) {
    const region = await getWindowRegion(w.handle);
    if (region) {
      result.push({
        handle: w.handle,
        pid: w.pid,
        title: w.title,
        region,
        visible: true,
      });
    }
  }
  return result;
}

/**
 * 查找窗口：按 handle / 标题（子串，忽略大小写）/ PID。
 * @param {{handle?:number, title?:string, pid?:number}} target
 * @returns {Promise<{handle, title, region, pid?}>}
 * @throws 未找到时抛错
 */
export async function findWindow(target) {
  const wins = await listWindows();
  let hit = null;
  if (target.handle) {
    hit = wins.find((w) => w.handle === Number(target.handle));
  } else if (target.title) {
    const q = String(target.title).toLowerCase();
    hit = wins.find((w) => w.title.toLowerCase().includes(q));
    // 精确匹配优先
    hit = wins.find((w) => w.title.toLowerCase() === q) || hit;
  } else if (target.pid) {
    const pid = Number(target.pid);
    hit = wins.find((w) => w.pid === pid);
  } else {
    throw new Error('窗口定位参数缺失：需提供 handle / title / pid 之一');
  }
  if (!hit) {
    const desc = target.title || target.handle || target.pid || '?';
    throw new Error(`未找到窗口: ${desc}`);
  }
  // 补 PID
  const pid = getPidForHandle(hit.handle);
  return { handle: hit.handle, title: hit.title, region: hit.region, pid };
}

/** 通过 PowerShell GetWindowThreadProcessId 获取窗口 PID */
export function getPidForHandle(handle) {
  const ps = `
Add-Type -TypeDefinition '
using System;
using System.Runtime.InteropServices;
public class WN {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
}
';
$pidOut = 0
[WN]::GetWindowThreadProcessId([IntPtr]${handle}, [ref]$pidOut) | Out-Null
Write-Output $pidOut
`;
  try {
    const out = runPowerShell(ps);
    return parseInt(out.trim(), 10) || undefined;
  } catch (_) {
    return undefined;
  }
}

/** 获取窗口矩形（逻辑坐标） */
export async function getWindowRegion(handle) {
  try {
    // 通过 nut-js 获取（逻辑坐标）
    const w = await getWindowByHandle(handle);
    if (!w) return null;
    return await w.getRegion();
  } catch (_) {
    return null;
  }
}

/** 通过 handle 拿 nut-js Window 对象 */
async function getWindowByHandle(handle) {
  const wins = await getWindows();
  return wins.find((w) => Number(w.windowHandle) === Number(handle)) || null;
}

/** 激活（聚焦）窗口到前台（PowerShell SetForegroundWindow，比 nut-js w.focus() 更可靠） */
export async function activateWindow(target) {
  const found = await findWindow(target);
  runPowerShell(`
    Add-Type -TypeDefinition '
    using System;
    using System.Runtime.InteropServices;
    public class AW {
      [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
      [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    }
    ';
    [AW]::ShowWindow([IntPtr]${found.handle}, 9) | Out-Null;
    [AW]::SetForegroundWindow([IntPtr]${found.handle}) | Out-Null
  `);
  return { success: true, handle: found.handle, title: found.title };
}

/** 最小化窗口 */
export async function minimizeWindow(target) {
  const found = await findWindow(target);
  runPowerShell(showWindowPs(found.handle, 'SW_MINIMIZE'));
  return { success: true, handle: found.handle, title: found.title, state: 'minimized' };
}

/** 最大化窗口 */
export async function maximizeWindow(target) {
  const found = await findWindow(target);
  runPowerShell(showWindowPs(found.handle, 'SW_MAXIMIZE'));
  return { success: true, handle: found.handle, title: found.title, state: 'maximized' };
}

/** 恢复窗口（还原） */
export async function restoreWindow(target) {
  const found = await findWindow(target);
  runPowerShell(showWindowPs(found.handle, 'SW_RESTORE'));
  return { success: true, handle: found.handle, title: found.title, state: 'restored' };
}

/** 关闭窗口（优雅 WM_CLOSE） */
export async function closeWindow(target, opts = {}) {
  const { force = false } = opts;
  const found = await findWindow(target);
  if (force) {
    runPowerShell(killProcessPs(found.pid));
  } else {
    runPowerShell(closeWindowPs(found.handle));
  }
  return { success: true, handle: found.handle, title: found.title, pid: found.pid, force };
}

/**
 * 移动窗口（坐标用物理像素，内部换算逻辑）。
 * @param {number} x 目标左上角物理 x
 * @param {number} y 目标左上角物理 y
 */
export async function moveWindow(target, x, y) {
  const found = await findWindow(target);
  const w = await getWindowByHandle(found.handle);
  if (!w) throw new Error(`无法获取窗口对象: ${found.handle}`);
  const logical = await physicalToLogical({ x, y });
  await w.move({ x: logical.x, y: logical.y });
  const region = await w.getRegion();
  return { success: true, handle: found.handle, title: found.title, newOrigin: { x: region.left, y: region.top } };
}

/**
 * 缩放窗口（宽高用物理像素，内部换算逻辑）。
 */
export async function resizeWindow(target, width, height) {
  const found = await findWindow(target);
  const w = await getWindowByHandle(found.handle);
  if (!w) throw new Error(`无法获取窗口对象: ${found.handle}`);
  const info = await getScreenInfo();
  const logical = {
    width: Math.max(50, Math.round(width / info.scaleX)),
    height: Math.max(50, Math.round(height / info.scaleY)),
  };
  await w.resize({ width: logical.width, height: logical.height });
  const region = await w.getRegion();
  return {
    success: true,
    handle: found.handle,
    title: found.title,
    newSize: { width: Math.round(region.width * info.scaleX), height: Math.round(region.height * info.scaleY) },
  };
}

/** 获取活动窗口 */
export async function getActiveWindowInfo() {
  const aw = await getActiveWindow();
  if (!aw) return { success: true, active: null };
  const title = await aw.getTitle();
  const region = await aw.getRegion();
  const pid = getPidForHandle(aw.windowHandle);
  return {
    success: true,
    active: { handle: aw.windowHandle, title, region, pid },
  };
}

/** 启动进程 */
export async function launchProcess(command, args = []) {
  const ps = launchPs(command, args);
  const out = runPowerShell(ps);
  const pid = parseInt((out.match(/\d+/) || [])[0], 10);
  return { success: true, command, args, pid };
}// ============ PowerShell 脚本生成 ============

function runPowerShell(script) {
  try {
    return execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
      encoding: 'utf8',
      windowsHide: true,
    });
  } catch (e) {
    const msg = (e.stdout || '') + (e.stderr || '') || e.message;
    throw new Error(`PowerShell 执行失败: ${msg.trim().split('\n')[0]}`);
  }
}

/** 枚举窗口：handle|pid|title（GetWindowTextW + GetWindowThreadProcessId） */
function getEnumPsScript() {
  return `
Add-Type -TypeDefinition '
using System;
using System.Text;
using System.Runtime.InteropServices;
public class WE {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lp);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lp);
}
';
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$list = New-Object System.Collections.ArrayList
$cb = [WE+EnumWindowsProc]{ param($h, $lp)
  if ([WE]::IsWindowVisible($h)) {
    $sb = New-Object System.Text.StringBuilder 512
    [WE]::GetWindowText($h, $sb, 512) | Out-Null
    if ($sb.Length -gt 0) {
      $p = 0
      [WE]::GetWindowThreadProcessId($h, [ref]$p) | Out-Null
      [void]$list.Add($h.ToString() + '|' + $p.ToString() + '|' + $sb.ToString())
    }
  }
  return $true
}
[WE]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null
$list | ForEach-Object { Write-Output $_ }
`;
}

/** ShowWindow 脚本 */
function showWindowPs(handle, cmd) {
  return `
Add-Type -TypeDefinition '
using System;
using System.Runtime.InteropServices;
public class WS {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
';
[WS]::ShowWindow([IntPtr]${handle}, ${cmdMap(cmd)}) | Out-Null
`;
}

function cmdMap(cmd) {
  switch (cmd) {
    case 'SW_MINIMIZE': return 6;
    case 'SW_MAXIMIZE': return 3;
    case 'SW_RESTORE': return 9;
    default: return 9;
  }
}

/** WM_CLOSE 优雅关闭 */
function closeWindowPs(handle) {
  return `
Add-Type -TypeDefinition '
using System;
using System.Runtime.InteropServices;
public class WC {
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wp, IntPtr lp);
}
';
[WC]::PostMessage([IntPtr]${handle}, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
`;
}

/** 杀进程 */
function killProcessPs(pid) {
  return `Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`;
}

/** 启动进程（返回 PID）；无参数时不传 ArgumentList（避免空数组报错） */
function launchPs(command, args) {
  const safe = String(command).replace(/'/g, "''");
  if (!args || args.length === 0) {
    return `$p = Start-Process -FilePath '${safe}' -PassThru; Write-Output $p.Id`;
  }
  const argStr = args.map((a) => `'${String(a).replace(/'/g, "''")}'`).join(', ');
  return `$p = Start-Process -FilePath '${safe}' -ArgumentList @(${argStr}) -PassThru; Write-Output $p.Id`;
}

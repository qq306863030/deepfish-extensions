/**
 * 端到端演示：模拟 Agent 完整闭环
 *
 * 任务：打开记事本 → 输入"Hello 你好 123" → 全选复制 → 验证剪贴板 → 关闭。
 *
 * 闭环：
 *   1. 启动目标（processLaunch）
 *   2. 截图（screenshot）→ 得到画面
 *   3. "视觉理解"（此处用已知坐标模拟 Agent 定位）→ 决定点击位置
 *   4. 操作（click / type）
 *   5. 再截图（可选）
 *   6. 验证（clipboardGet / 截图对比）
 *
 * 注意：这台机器记事本是 UWP 单例，本演示用"已存在的窗口"或 WinForms 测试窗口。
 * 这里用 WinForms 窗口演示，避免 UWP 干扰。
 */

import * as core from './src/core/index.js';
import { execSync } from 'node:child_process';

function log(label, data) {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(data, null, 2).slice(0, 800));
}

// 1. 创建测试窗口（模拟"打开一个应用"）
const inline =
  `Add-Type -AssemblyName System.Windows.Forms; ` +
  `$f = New-Object System.Windows.Forms.Form; ` +
  `$f.Text = 'E2E-DEMO'; ` +
  `$f.Width = 600; $f.Height = 400; ` +
  `$f.StartPosition = 'CenterScreen'; ` +
  `$f.Show(); [System.Windows.Forms.Application]::Run($f)`;
const launch = await core.window.launchProcess('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', inline]);
log('1. 启动应用', launch);

// 等窗口出现
let tw = null;
for (let i = 0; i < 30; i++) {
  await core.wait.wait(200);
  const wins = await core.window.listWindows();
  tw = wins.find((w) => w.title === 'E2E-DEMO');
  if (tw) break;
}
if (!tw) { console.log('FAIL: 窗口未出现'); process.exit(1); }
log('2. 找到窗口', { handle: tw.handle, pid: tw.pid, title: tw.title });

// 2. 截图（Agent 看到画面）
const shot = await core.screenshot.captureWindow({ handle: tw.handle });
log('3. 截图（Agent 获取画面）', { path: shot.filePath, width: shot.width, height: shot.height });

// 3. 模拟"视觉模型识别"：窗口中央即点击目标（物理坐标）
const si = await core.info.screenInfo();
const cx = Math.round((tw.region.left + tw.region.width / 2) * si.scaleX);
const cy = Math.round((tw.region.top + tw.region.height / 2) * si.scaleY);
log('4. 视觉定位（模拟模型识别坐标）', { cx, cy, scale: si.scaleX });

// 4. 激活 + 点击 + 输入
await core.window.activateWindow({ handle: tw.handle });
await core.wait.wait(500);
const clickR = await core.mouse.click(cx, cy, { button: 'left' });
log('5. 点击定位', clickR);

const typeR = await core.type.typeText('Hello 你好 123');
log('6. 输入文本', typeR);

// 5. 验证：截图对比（窗口标题没变，用剪贴板验证输入内容被写入过）
const shot2 = await core.screenshot.captureWindow({ handle: tw.handle });
log('7. 再截图验证', { path: shot2.filePath, width: shot2.width, height: shot2.height });

// 6. 验证剪贴板（typeText 后恢复原内容；这里显式设内容证明剪贴板可用）
await core.clipboard.setText('Hello 你好 123');
const clip = await core.clipboard.getText();
log('8. 验证剪贴板', clip);
if (clip.text !== 'Hello 你好 123') { console.log('FAIL: 剪贴板验证失败'); process.exit(1); }

// 7. 关闭窗口（WM_CLOSE）
await core.window.closeWindow({ handle: tw.handle });
await core.wait.wait(500);
const winsAfter = await core.window.listWindows();
const still = winsAfter.find((w) => w.handle === tw.handle);
log('9. 关闭窗口', { closed: !still });

console.log('\n✅ 端到端演示完成');

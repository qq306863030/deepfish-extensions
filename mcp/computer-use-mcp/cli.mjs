#!/usr/bin/env node
/**
 * computer-use-mcp 调试 CLI
 *
 * 用法：
 *   node cli.mjs screenshot [--region x,y,w,h] [--window <title>]
 *   node cli.mjs info
 *   node cli.mjs mouse <x> <y> [--smooth]
 *   node cli.mjs click <x> <y> [--button left|right|middle] [--double]
 *   node cli.mjs scroll <up|down|left|right> [amount]
 *   node cli.mjs drag <fx> <fy> <tx> <ty> [--steps 20]
 *   node cli.mjs type <text> [--enter]
 *   node cli.mjs key <keys>           # 如 ctrl+c
 *   node cli.mjs windows              # 列出窗口
 *   node cli.mjs window <action> <handle|title>   # activate|minimize|maximize|restore|close
 *   node cli.mjs clipboard [text]     # 无参读取，有参写入
 *   node cli.mjs launch <command> [args...]
 *   node cli.mjs wait <ms>
 *
 * 说明：坐标均为物理像素（截图像素）。日志走 stderr。
 */

import * as core from './src/core/index.js';

const [cmd, ...rest] = process.argv.slice(2);

async function main() {
  switch (cmd) {
    case 'screenshot': {
      const regionIdx = rest.indexOf('--region');
      const winIdx = rest.indexOf('--window');
      if (regionIdx >= 0) {
        const [x, y, w, h] = rest[regionIdx + 1].split(',').map(Number);
        return await core.screenshot.captureRegion({ x, y, width: w, height: h });
      }
      if (winIdx >= 0) {
        return await core.screenshot.captureWindow({ title: rest[winIdx + 1] });
      }
      return await core.screenshot.captureFullscreen();
    }
    case 'info':
      return await core.info.systemInfo();
    case 'mouse': {
      const [x, y] = rest.map(Number);
      return await core.mouse.move(x, y, { smooth: rest.includes('--smooth') });
    }
    case 'click': {
      const [x, y] = rest.map(Number);
      const b = rest[rest.indexOf('--button') + 1] || 'left';
      return await core.mouse.click(x, y, { button: b, double: rest.includes('--double') });
    }
    case 'scroll': {
      const dir = rest[0];
      const amount = Number(rest[1]) || 1;
      return await core.mouse.scroll(dir, amount);
    }
    case 'drag': {
      const [fx, fy, tx, ty] = rest.slice(0, 4).map(Number);
      return await core.mouse.drag(fx, fy, tx, ty, {});
    }
    case 'type': {
      const text = rest.join(' ');
      return await core.type.typeText(text, { enter: rest.includes('--enter') });
    }
    case 'key':
      return await core.key.key(rest.join('+'));
    case 'windows': {
      const wins = await core.window.listWindows();
      return { count: wins.length, windows: wins };
    }
    case 'window': {
      const [action, target] = rest;
      const targetObj = /^\d+$/.test(target) ? { handle: Number(target) } : { title: target };
      switch (action) {
        case 'activate': return await core.window.activateWindow(targetObj);
        case 'minimize': return await core.window.minimizeWindow(targetObj);
        case 'maximize': return await core.window.maximizeWindow(targetObj);
        case 'restore': return await core.window.restoreWindow(targetObj);
        case 'close': return await core.window.closeWindow(targetObj);
        default: throw new Error(`未知 window action: ${action}`);
      }
    }
    case 'clipboard': {
      if (rest.length) return await core.clipboard.setText(rest.join(' '));
      return await core.clipboard.getText();
    }
    case 'launch':
      return await core.window.launchProcess(rest[0], rest.slice(1));
    case 'wait':
      return await core.wait.wait(Number(rest[0]));
    case 'help':
    case '-h':
    case '--help':
      printHelp();
      return { success: true };
    default:
      printHelp();
      throw new Error(`未知命令: ${cmd}`);
  }
}

function printHelp() {
  process.stderr.write(`
computer-use-mcp 调试 CLI
用法:
  screenshot [--region x,y,w,h] [--window <title>]
  info
  mouse <x> <y> [--smooth]
  click <x> <y> [--button left|right|middle] [--double]
  scroll <up|down|left|right> [amount]
  drag <fx> <fy> <tx> <ty>
  type <text> [--enter]
  key <keys>
  windows
  window <action> <handle|title>
  clipboard [text]
  launch <command> [args...]
  wait <ms>
坐标均为物理像素（截图像素）。
`);
}

main()
  .then((r) => process.stdout.write(JSON.stringify(r, null, 2) + '\n'))
  .catch((e) => {
    process.stderr.write('错误: ' + e.message + '\n');
    process.exit(1);
  });

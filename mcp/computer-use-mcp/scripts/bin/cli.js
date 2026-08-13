#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// ============ 自动安装依赖检查 ============
const scriptDir = path.resolve(__dirname, '..');
const nodeModulesPath = path.join(scriptDir, 'node_modules');
const packageJsonPath = path.join(scriptDir, 'package.json');

if (!fs.existsSync(nodeModulesPath) || !fs.existsSync(path.join(nodeModulesPath, '.package-lock.json'))) {
  console.log('🔧 正在自动安装依赖（首次使用，请稍候）...');
  try {
    execSync('npm install --omit=dev', { cwd: scriptDir, stdio: 'inherit' });
    console.log('✅ 依赖安装完成！\n');
  } catch (err) {
    console.error('❌ 依赖安装失败:', err.message);
    console.error('请手动执行: cd ' + scriptDir + ' && npm install');
    process.exit(1);
  }
}
// ==========================================

const { Command } = require('commander');
const chalk = require('chalk');

// 检查并导入各个命令模块
const screenshot = require('../lib/screenshot');
const click = require('../lib/click');
const type = require('../lib/type');
const key = require('../lib/key');
const mouse = require('../lib/mouse');
const window = require('../lib/window');
const info = require('../lib/info');
const flow = require('../lib/flow');
const ime = require('../lib/ime');

const program = new Command();

// 版本信息
program
  .name('desktop-auto')
  .description(chalk.blue('桌面自动化控制命令行工具'))
  .version('1.0.0');

// 主命令：截图（固定输出为 tmp_screen.png）
program
  .command('screenshot')
  .alias('ss')
  .description(chalk.green('截取屏幕截图（固定保存为 tmp_screen.png）'))
  .option('-r, --region <x,y,w,h>', '截取指定区域 (x,y,宽度,高度)')
  .action(async (options) => {
    try {
      await screenshot.execute(options);
    } catch (error) {
      console.error(chalk.red('截图失败:'), error.message);
      process.exit(1);
    }
  });

// 主命令：鼠标点击
program
  .command('click')
  .alias('c')
  .description(chalk.green('执行鼠标点击操作'))
  .argument('<x>', 'X坐标', parseInt)
  .argument('<y>', 'Y坐标', parseInt)
  .option('-b, --button <button>', '鼠标按钮 (left, right, middle)', 'left')
  .option('-n, --times <times>', '点击次数', '1')
  .option('-d, --delay <delay>', '点击间隔（毫秒）', '50')
  .action(async (x, y, options) => {
    try {
      await click.execute(x, y, options);
    } catch (error) {
      console.error(chalk.red('点击失败:'), error.message);
      process.exit(1);
    }
  });

// 主命令：鼠标移动
program
  .command('move')
  .alias('m')
  .description(chalk.green('移动鼠标到指定位置'))
  .argument('<x>', 'X坐标', parseInt)
  .argument('<y>', 'Y坐标', parseInt)
  .option('-s, --smooth', '平滑移动', false)
  .option('-d, --duration <duration>', '移动持续时间（毫秒）', '300')
  .action(async (x, y, options) => {
    try {
      await mouse.moveTo(x, y, options);
    } catch (error) {
      console.error(chalk.red('移动失败:'), error.message);
      process.exit(1);
    }
  });

// 主命令：键盘输入
program
  .command('type')
  .alias('t')
  .description(chalk.green('输入文本 (支持 IME 自动切换)'))
  .argument('<text>', '要输入的文本')
  .option('-d, --delay <delay>', '按键间隔（毫秒）', '50')
  .option('-e, --enter', '输入后按回车', false)
  .option('--english', '输入前切换到非中文输入法，输入后自动恢复 (避免被中文IME拦截)', false)
  .option('--no-restore', '与 --english 配合使用：输入后不恢复原输入法')
  .option('--no-switch', '与 --english 配合使用：完全不触碰输入法 (使用当前IME)')
  .option('--ime-strict', '与 --english 配合使用：找不到非中文 IME 时报错', false)
  .action(async (text, options) => {
    try {
      await type.execute(text, options);
    } catch (error) {
      console.error(chalk.red('输入失败:'), error.message);
      process.exit(1);
    }
  });

// 主命令：输入法管理
program
  .command('ime')
  .description(chalk.green('输入法 (IME) 管理：检测/切换/恢复'))
  .argument('[action]', '操作类型: status | list | english | restore | press')
  .argument('[count]', 'press 操作时按 Win+Space 的次数 (默认 1)', '1')
  .option('--no-restore', '切换到英文后不自动恢复')
  .option('--max-steps <n>', '最多按多少次 Win+Space (默认 5)', '5')
  .option('--settle <ms>', '每次切换后等待稳定时间 (毫秒)', '300')
  .action(async (action, count, options) => {
    try {
      const op = (action || 'status').toLowerCase();
      if (op === 'status' || op === 'get' || op === 'current') {
        const cur = await ime.getCurrent();
        console.log(chalk.cyan('Current IME:'));
        console.log(chalk.gray(`  Title:        ${cur.title}`));
        console.log(chalk.gray(`  Layout hex:   ${cur.layoutHex}`));
        console.log(chalk.gray(`  Is Chinese:   ${cur.isChinese}`));
      } else if (op === 'list') {
        const list = await ime.list();
        console.log(chalk.cyan('Installed languages / IMEs:'));
        for (const it of list) {
          console.log(chalk.gray(`  ${it.tag}  ${it.name}`));
        }
      } else if (op === 'english' || op === 'switch') {
        const before = await ime.getCurrent();
        console.log(chalk.gray(`Before: layout=${before.layoutHex} isChinese=${before.isChinese}`));
        const r = await ime.switchToEnglish({
          maxSteps: parseInt(options.maxSteps) || 5,
          settleMs: parseInt(options.settleMs) || 300,
        });
        console.log(chalk.cyan(`Switch result:`));
        console.log(chalk.gray(`  Switched:    ${r.switched}`));
        console.log(chalk.gray(`  Attempts:    ${r.attempts}`));
        console.log(chalk.gray(`  Reason:      ${r.reason}`));
        console.log(chalk.gray(`  After:       layout=${r.after.layoutHex} isChinese=${r.after.isChinese}`));
        if (r.switched && options.restore) {
          const restore = await ime.restore(before, {
            maxSteps: parseInt(options.maxSteps) || 5,
            settleMs: parseInt(options.settleMs) || 300,
          });
          console.log(chalk.gray(`Restored:     ${restore.restored} (attempts=${restore.attempts})`));
        }
      } else if (op === 'restore') {
        // Restore the most recently captured state. For now we use a simple
        // heuristic: assume the target is the system default (en-US). If
        // no-english-ime is installed, this is a no-op.
        const r = await ime.restore({ isChinese: false, layoutHex: '0x04090409' }, {
          maxSteps: parseInt(options.maxSteps) || 5,
          settleMs: parseInt(options.settleMs) || 300,
        });
        console.log(chalk.cyan(`Restore result:`));
        console.log(chalk.gray(`  Restored: ${r.restored}`));
        console.log(chalk.gray(`  Reason:   ${r.reason}`));
      } else if (op === 'press') {
        const n = parseInt(count) || 1;
        console.log(chalk.gray(`Pressing Win+Space ${n} times...`));
        await ime.pressWinSpace(n);
        const after = await ime.getCurrent();
        console.log(chalk.gray(`After: layout=${after.layoutHex} isChinese=${after.isChinese}`));
      } else {
        console.error(chalk.red(`Unknown action: ${op}. Use: status | list | english | restore | press`));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('IME operation failed:'), error.message);
      process.exit(1);
    }
  });

// 主命令：键盘按键
program
  .command('key')
  .alias('k')
  .description(chalk.green('执行键盘按键操作'))
  .argument('<keys>', '按键名称，多个用+连接 (如: ctrl+c, enter)')
  .option('-d, --delay <delay>', '按键间隔（毫秒）', '50')
  .action(async (keys, options) => {
    try {
      await key.execute(keys, options);
    } catch (error) {
      console.error(chalk.red('按键失败:'), error.message);
      process.exit(1);
    }
  });

// 主命令：窗口操作
program
  .command('window')
  .alias('w')
  .description(chalk.green('窗口管理操作'))
  .argument('[action]', '操作类型 (list, find, activate, close)')
  .argument('[query]', '查询条件（窗口标题或进程名）')
  .option('-t, --title <title>', '窗口标题')
  .option('-p, --pid <pid>', '进程ID')
  .action(async (action, query, options) => {
    try {
      await window.execute(action, query, options);
    } catch (error) {
      console.error(chalk.red('窗口操作失败:'), error.message);
      process.exit(1);
    }
  });

// 主命令：系统信息
program
  .command('info')
  .alias('i')
  .description(chalk.green('获取系统信息'))
  .option('-s, --screen', '显示屏幕信息', false)
  .option('-m, --mouse', '显示鼠标位置', false)
  .option('-w, --windows', '显示窗口列表', false)
  .action(async (options) => {
    try {
      await info.execute(options);
    } catch (error) {
      console.error(chalk.red('获取信息失败:'), error.message);
      process.exit(1);
    }
  });

// 主命令：自动化流程
program
  .command('flow')
  .alias('f')
  .description(chalk.green('执行自动化流程'))
  .argument('<flowFile>', '流程文件路径 (JSON格式)')
  .option('-v, --verbose', '显示详细日志', false)
  .option('-d, --dry-run', '模拟运行，不实际执行', false)
  .action(async (flowFile, options) => {
    try {
      await flow.execute(flowFile, options);
    } catch (error) {
      console.error(chalk.red('流程执行失败:'), error.message);
      process.exit(1);
    }
  });

// 解析命令行参数
program.parse(process.argv);

// 如果没有提供参数，显示帮助信息
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
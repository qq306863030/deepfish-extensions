const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

class FlowCommand {
  async execute(flowFile, options) {
    try {
      console.log(chalk.blue('🔄 执行自动化流程...'));
      
      // 检查流程文件是否存在
      if (!fs.existsSync(flowFile)) {
        throw new Error(`流程文件不存在: ${flowFile}`);
      }
      
      // 读取流程文件
      const flowContent = fs.readFileSync(flowFile, 'utf-8');
      const flow = JSON.parse(flowContent);
      
      console.log(chalk.gray(`  文件: ${flowFile}`));
      console.log(chalk.gray(`  步骤: ${flow.steps?.length || 0}`));
      
      if (options.verbose) {
        console.log(chalk.gray(`  模拟运行: ${options.dryRun ? '是' : '否'}`));
      }
      
      // 执行流程
      await this.executeFlow(flow, options);
      
      console.log(chalk.green(`✅ 流程执行完成！`));
      
      return { success: true };
      
    } catch (error) {
      console.error(chalk.red('❌ 流程执行失败:'), error.message);
      throw error;
    }
  }
  
  async executeFlow(flow, options) {
    const steps = flow.steps || [];
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepNumber = i + 1;
      
      console.log(chalk.yellow(`\n📌 步骤 ${stepNumber}/${steps.length}: ${step.description || step.type}`));
      
      if (options.verbose) {
        console.log(chalk.gray(`  类型: ${step.type}`));
        console.log(chalk.gray(`  参数: ${JSON.stringify(step.params || {})}`));
      }
      
      if (options.dryRun) {
        console.log(chalk.blue('  [模拟运行] 跳过实际执行'));
        continue;
      }
      
      try {
        await this.executeStep(step);
      } catch (error) {
        console.error(chalk.red(`  步骤 ${stepNumber} 失败: ${error.message}`));
        
        if (!step.continueOnError) {
          throw error;
        }
        
        console.log(chalk.yellow(`  继续执行下一步...`));
      }
      
      // 步骤间延迟
      if (step.delay) {
        console.log(chalk.gray(`  延迟: ${step.delay}ms`));
        await this.sleep(step.delay);
      }
    }
  }
  
  async executeStep(step) {
    switch (step.type) {
      case 'screenshot':
        await this.executeScreenshot(step.params || {});
        break;
        
      case 'click':
        await this.executeClick(step.params || {});
        break;
        
      case 'type':
        await this.executeType(step.params || {});
        break;
        
      case 'key':
        await this.executeKey(step.params || {});
        break;
        
      case 'move':
        await this.executeMove(step.params || {});
        break;
        
      case 'wait':
        await this.executeWait(step.params || {});
        break;
        
      case 'info':
        await this.executeInfo(step.params || {});
        break;

      case 'ime':
        await this.executeIme(step.params || {});
        break;

      default:
        throw new Error(`未知的步骤类型: ${step.type}`);
    }
  }

  async executeIme(params) {
    const ime = require('./ime');
    const action = (params.action || 'status').toLowerCase();
    if (action === 'status' || action === 'get') {
      const cur = await ime.getCurrent();
      console.log(chalk.gray(`  IME: title="${cur.title}" layout=${cur.layoutHex} isChinese=${cur.isChinese}`));
    } else if (action === 'english' || action === 'switch') {
      const before = await ime.getCurrent();
      const r = await ime.switchToEnglish({
        maxSteps: parseInt(params.maxSteps) || 5,
        settleMs: parseInt(params.settleMs) || 300,
      });
      console.log(chalk.gray(`  IME switch: switched=${r.switched} attempts=${r.attempts} reason=${r.reason}`));
      // Stash for later restore
      this._imePrev = before;
    } else if (action === 'restore') {
      const prev = this._imePrev;
      const r = await ime.restore(prev || { isChinese: false, layoutHex: '0x04090409' }, {
        maxSteps: parseInt(params.maxSteps) || 5,
        settleMs: parseInt(params.settleMs) || 300,
      });
      console.log(chalk.gray(`  IME restore: restored=${r.restored} attempts=${r.attempts} reason=${r.reason}`));
      this._imePrev = null;
    } else if (action === 'press') {
      const n = parseInt(params.count) || 1;
      await ime.pressWinSpace(n);
      const after = await ime.getCurrent();
      console.log(chalk.gray(`  IME press: ${n}x Win+Space, after layout=${after.layoutHex}`));
    } else {
      throw new Error(`未知的 ime action: ${action}. Use: status | english | restore | press`);
    }
  }
  
  async executeScreenshot(params) {
    const { screen } = require('@nut-tree-fork/nut-js');
    const path = require('path');
    
    // 固定文件名：始终保存到当前工作目录下的 tmp_screen.png
    const filename = path.resolve('tmp_screen.png');
    
    console.log(chalk.blue('  📸 截图...'));
    console.log(chalk.gray(`  输出: ${filename}`));
    
    try {
      const snapshot = await screen.grab();
      
      // 使用sharp保存图片
      if (snapshot && snapshot.data) {
        const sharp = require('sharp');
        await sharp(snapshot.data, {
          raw: {
            width: snapshot.width,
            height: snapshot.height,
            channels: snapshot.channels
          }
        }).png().toFile(filename);
        console.log(chalk.green(`  ✅ 截图保存: ${filename}`));
      } else {
        console.log(chalk.yellow('  ⚠️  截图数据为空'));
      }
      
    } catch (error) {
      console.log(chalk.red(`  ❌ 截图失败: ${error.message}`));
      throw error;
    }
  }
  
  async executeClick(params) {
    const { mouse, Point, Button } = require('@nut-tree-fork/nut-js');
    
    const { x, y, button = 'left' } = params;
    
    if (x === undefined || y === undefined) {
      throw new Error('点击需要指定x和y坐标');
    }
    
    console.log(chalk.blue(`  🖱️  点击 (${x}, ${y})`));
    
    let mouseButton;
    switch (button.toLowerCase()) {
      case 'right':
        mouseButton = Button.RIGHT;
        break;
      case 'middle':
        mouseButton = Button.MIDDLE;
        break;
      default:
        mouseButton = Button.LEFT;
    }
    
    await mouse.move(new Point(x, y));
    // 使用 pressButton + releaseButton 确保鼠标按钮被释放
    await mouse.pressButton(mouseButton);
    await mouse.releaseButton(mouseButton);
  }
  
  async executeType(params) {
    const { text, delay = 50, english = false, restore = true, imeStrict = false } = params;

    if (!text) {
      throw new Error('输入需要指定文本内容');
    }

    console.log(chalk.blue(`  ⌨️  输入: "${text}" (english=${english})`));

    const typeCmd = require('./type');
    await typeCmd.execute(text, {
      delay,
      enter: false,
      english,
      noRestore: !restore,
      imeStrict,
    });
  }
  
  async executeKey(params) {
    const { keyboard, Key } = require('@nut-tree-fork/nut-js');
    
    const { keys, delay = 50 } = params;
    
    if (!keys) {
      throw new Error('按键需要指定按键名称');
    }
    
    console.log(chalk.blue(`  🎹 按键: ${keys}`));
    
    keyboard.config.autoDelayMs = delay;
    
    // 解析按键组合
    const keyMap = {
      'enter': Key.Enter,
      'tab': Key.Tab,
      'escape': Key.Escape,
      'space': Key.Space,
      'ctrl': Key.LeftControl,
      'control': Key.LeftControl,
      'shift': Key.LeftShift,
      'alt': Key.LeftAlt,
      'win': Key.LeftMeta,
      'backspace': Key.Backspace,
      'delete': Key.Delete,
    };
    
    const keyList = keys.toLowerCase().split('+').map(k => k.trim());
    const keyObjects = [];
    for (const keyName of keyList) {
      const keyObj = keyMap[keyName];
      if (keyObj) {
        keyObjects.push(keyObj);
      } else if (keyName.length === 1 && /[a-z]/i.test(keyName)) {
        const letterKey = keyName.toUpperCase();
        if (Key[letterKey]) {
          keyObjects.push(Key[letterKey]);
        }
      } else if (/^[0-9]$/.test(keyName)) {
        const numberKey = `Digit${keyName}`;
        if (Key[numberKey]) {
          keyObjects.push(Key[numberKey]);
        }
      } else {
        throw new Error(`未知的按键: ${keyName}`);
      }
    }
    
    if (keyObjects.length === 0) {
      throw new Error(`未识别的有效按键: ${keys}`);
    }
    
    await keyboard.pressKey(...keyObjects);
    // 自动释放所有按下的按键，防止按键残留
    try {
      await keyboard.releaseKey(...keyObjects);
    } catch (_) {}
  }
  
  async executeMove(params) {
    const { mouse, Point } = require('@nut-tree-fork/nut-js');
    
    const { x, y, smooth = false, duration = 300 } = params;
    
    if (x === undefined || y === undefined) {
      throw new Error('移动需要指定x和y坐标');
    }
    
    console.log(chalk.blue(`  🖱️  移动到 (${x}, ${y})`));
    
    await mouse.move(new Point(x, y));
  }
  
  async executeWait(params) {
    const { duration = 1000 } = params;
    
    console.log(chalk.blue(`  ⏳ 等待 ${duration}ms`));
    
    await this.sleep(duration);
  }
  
  async executeInfo(params) {
    console.log(chalk.blue('  💻 获取系统信息...'));
    
    const { screen, mouse } = require('@nut-tree-fork/nut-js');
    const os = require('os');
    
    try {
      // 显示系统信息
      console.log(chalk.gray('  系统:'), `${os.type()} ${os.release()}`);
      console.log(chalk.gray('  主机:'), os.hostname());
      
      // 获取屏幕信息
      const screenWidth = await screen.width();
      const screenHeight = await screen.height();
      console.log(chalk.gray('  屏幕:'), `${screenWidth}x${screenHeight}`);
      
      // 获取鼠标位置
      const mousePos = await mouse.getPosition();
      console.log(chalk.gray('  鼠标:'), `(${mousePos.x}, ${mousePos.y})`);
      
    } catch (error) {
      console.log(chalk.yellow('  ⚠️  部分信息获取失败:', error.message));
    }
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new FlowCommand();
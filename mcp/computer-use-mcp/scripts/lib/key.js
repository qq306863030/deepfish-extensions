const { keyboard, Key } = require('@nut-tree-fork/nut-js');
const chalk = require('chalk');

class KeyCommand {
  // 按键映射表
  keyMap = {
    'ctrl': Key.LeftControl,
    'control': Key.LeftControl,
    'shift': Key.LeftShift,
    'alt': Key.LeftAlt,
    'meta': Key.LeftMeta,
    'win': Key.LeftMeta,
    'cmd': Key.LeftMeta,
    'super': Key.LeftMeta,
    'enter': Key.Enter,
    'return': Key.Enter,
    'tab': Key.Tab,
    'esc': Key.Escape,
    'escape': Key.Escape,
    'space': Key.Space,
    'backspace': Key.Backspace,
    'delete': Key.Delete,
    'del': Key.Delete,
    'insert': Key.Insert,
    'ins': Key.Insert,
    'home': Key.Home,
    'end': Key.End,
    'pageup': Key.PageUp,
    'pagedown': Key.PageDown,
    'pgup': Key.PageUp,
    'pgdn': Key.PageDown,
    'up': Key.Up,
    'down': Key.Down,
    'left': Key.Left,
    'right': Key.Right,
    'f1': Key.F1,
    'f2': Key.F2,
    'f3': Key.F3,
    'f4': Key.F4,
    'f5': Key.F5,
    'f6': Key.F6,
    'f7': Key.F7,
    'f8': Key.F8,
    'f9': Key.F9,
    'f10': Key.F10,
    'f11': Key.F11,
    'f12': Key.F12,
    'num0': Key.NumPad0,
    'num1': Key.NumPad1,
    'num2': Key.NumPad2,
    'num3': Key.NumPad3,
    'num4': Key.NumPad4,
    'num5': Key.NumPad5,
    'num6': Key.NumPad6,
    'num7': Key.NumPad7,
    'num8': Key.NumPad8,
    'num9': Key.NumPad9,
    'numlock': Key.NumLock,
    'capslock': Key.CapsLock,
    'scrolllock': Key.ScrollLock,
    'printscreen': Key.PrintScreen,
    'prtsc': Key.PrintScreen,
  };
  
  async execute(keys, options) {
    const startTime = Date.now();
    
    try {
      // 显示执行信息
      console.log(chalk.blue(`🎹 执行键盘按键操作...`));
      console.log(chalk.gray(`  按键: ${keys}`));
      
      const delay = parseInt(options.delay) || 50;
      console.log(chalk.gray(`  按键间隔: ${delay}ms`));
      
      // 设置键盘延迟
      keyboard.config.autoDelayMs = delay;
      
      // 解析按键组合
      const keyList = keys.toLowerCase().split('+').map(k => k.trim());
      console.log(chalk.gray(`  按键组合: ${keyList.join(' + ')}`));
      
      // 转换为Key对象
      const keyObjects = [];
      for (const keyName of keyList) {
        const key = this.keyMap[keyName];
        if (key) {
          keyObjects.push(key);
          continue;
        }
        
        // 尝试作为字母处理
        if (keyName.length === 1 && /[a-z]/.test(keyName)) {
          const letterKey = keyName.toUpperCase();
          if (Key[letterKey]) {
            keyObjects.push(Key[letterKey]);
            continue;
          }
        }
        
        // 尝试作为数字处理
        if (/^[0-9]$/.test(keyName)) {
          const numberKey = `Digit${keyName}`;
          if (Key[numberKey]) {
            keyObjects.push(Key[numberKey]);
            continue;
          }
        }
        
        throw new Error(`未知的按键: ${keyName}`);
      }
      
      // 执行按键组合
      await keyboard.pressKey(...keyObjects);
      
      // 自动释放所有按下的按键，防止按键残留
      try {
        await keyboard.releaseKey(...keyObjects);
      } catch (_) {}
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 显示成功信息
      console.log(chalk.green(`✅ 按键操作完成！`));
      console.log(chalk.gray(`  耗时: ${duration}ms`));
      
      return {
        success: true,
        keys,
        keyList,
        duration
      };
      
    } catch (error) {
      // 发生错误时也尝试释放按键，防止按键残留
      try {
        await keyboard.releaseKey(...keyObjects);
      } catch (_) {}
      console.error(chalk.red('❌ 按键失败:'), error.message);
      throw error;
    }
  }
}

module.exports = new KeyCommand();
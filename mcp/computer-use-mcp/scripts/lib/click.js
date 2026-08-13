const { mouse, Point, Button } = require('@nut-tree-fork/nut-js');
const chalk = require('chalk');

class ClickCommand {
  async execute(x, y, options) {
    const startTime = Date.now();
    
    try {
      // 显示执行信息
      console.log(chalk.blue(`🖱️  执行点击操作...`));
      console.log(chalk.gray(`  坐标: (${x}, ${y})`));
      
      // 解析鼠标按钮
      let button;
      switch (options.button.toLowerCase()) {
        case 'right':
          button = Button.RIGHT;
          console.log(chalk.gray(`  按钮: 右键`));
          break;
        case 'middle':
          button = Button.MIDDLE;
          console.log(chalk.gray(`  按钮: 中键`));
          break;
        default:
          button = Button.LEFT;
          console.log(chalk.gray(`  按钮: 左键`));
      }
      
      const times = parseInt(options.times) || 1;
      const delay = parseInt(options.delay) || 50;
      
      console.log(chalk.gray(`  次数: ${times}`));
      console.log(chalk.gray(`  间隔: ${delay}ms`));
      
      // 移动鼠标到指定位置
      await mouse.move(new Point(x, y));
      
      // 执行点击操作（每次点击后自动释放按钮）
      for (let i = 0; i < times; i++) {
        await mouse.pressButton(button);
        await mouse.releaseButton(button);
        if (i < times - 1) {
          await this.sleep(delay);
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 显示成功信息
      console.log(chalk.green(`✅ 点击完成！`));
      console.log(chalk.gray(`  耗时: ${duration}ms`));
      
      return {
        success: true,
        x,
        y,
        button: options.button,
        times,
        duration
      };
      
    } catch (error) {
      console.error(chalk.red('❌ 点击失败:'), error.message);
      throw error;
    }
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new ClickCommand();
const { mouse, Point } = require('@nut-tree-fork/nut-js');
const chalk = require('chalk');

class MouseCommand {
  async moveTo(x, y, options) {
    const startTime = Date.now();
    
    try {
      // 获取当前位置
      const currentPos = await mouse.getPosition();
      console.log(chalk.blue(`🖱️  移动鼠标...`));
      console.log(chalk.gray(`  从: (${currentPos.x}, ${currentPos.y})`));
      console.log(chalk.gray(`  到: (${x}, ${y})`));
      
      const smooth = options.smooth || false;
      const duration = parseInt(options.duration) || 300;
      
      console.log(chalk.gray(`  平滑移动: ${smooth ? '是' : '否'}`));
      if (smooth) {
        console.log(chalk.gray(`  持续时间: ${duration}ms`));
      }
      
      // 计算距离
      const distance = Math.sqrt(
        Math.pow(x - currentPos.x, 2) + Math.pow(y - currentPos.y, 2)
      );
      console.log(chalk.gray(`  距离: ${Math.round(distance)}px`));
      
      if (smooth) {
        // 平滑移动
        await this.smoothMove(currentPos.x, currentPos.y, x, y, duration);
      } else {
        // 直接移动
        await mouse.move(new Point(x, y));
      }
      
      const endTime = Date.now();
      const durationTime = endTime - startTime;
      
      // 显示成功信息
      console.log(chalk.green(`✅ 移动完成！`));
      console.log(chalk.gray(`  耗时: ${durationTime}ms`));
      
      return {
        success: true,
        from: { x: currentPos.x, y: currentPos.y },
        to: { x, y },
        distance: Math.round(distance),
        smooth,
        duration: durationTime
      };
      
    } catch (error) {
      console.error(chalk.red('❌ 移动失败:'), error.message);
      throw error;
    }
  }
  
  async smoothMove(startX, startY, endX, endY, duration) {
    const steps = 50;
    const stepDuration = duration / steps;
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const x = Math.round(startX + (endX - startX) * progress);
      const y = Math.round(startY + (endY - startY) * progress);
      
      await mouse.move(new Point(x, y));
      await this.sleep(stepDuration);
    }
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new MouseCommand();
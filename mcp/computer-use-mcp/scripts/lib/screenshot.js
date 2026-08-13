const { screen } = require('@nut-tree-fork/nut-js');
const chalk = require('chalk');
const path = require('path');

class ScreenshotCommand {
  async execute(options) {
    const startTime = Date.now();
    
    try {
      // 固定文件名：始终保存到当前工作目录下的 tmp_screen.png
      const filename = path.resolve('tmp_screen.png');
      
      // 显示执行信息
      console.log(chalk.blue('📸 开始截图...'));
      console.log(chalk.cyan(`  输出文件: ${filename}`));
      
      // 解析区域参数
      let region = null;
      if (options.region) {
        const [x, y, width, height] = options.region.split(',').map(Number);
        if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
          throw new Error('区域参数格式错误，应为: x,y,宽度,高度');
        }
        region = { x, y, width, height };
        console.log(chalk.gray(`  区域: (${x}, ${y}) ${width}x${height}`));
      }
      
      // 执行截图
      const snapshot = await screen.grab();
      
      // 使用sharp保存截图
      const sharp = require('sharp');
      if (snapshot && snapshot.data) {
        await sharp(snapshot.data, {
          raw: {
            width: snapshot.width,
            height: snapshot.height,
            channels: snapshot.channels
          }
        }).png().toFile(filename);
      } else {
        throw new Error('截图数据为空');
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 显示成功信息（重点突出文件路径）
      console.log(chalk.green(`✅ 截图成功！`));
      console.log(chalk.bold.underline.white(`  文件: ${filename}`));
      console.log(chalk.gray(`  尺寸: ${snapshot.width}x${snapshot.height}`));
      console.log(chalk.gray(`  耗时: ${duration}ms`));
      
      return {
        success: true,
        filename,
        width: snapshot.width,
        height: snapshot.height,
        duration
      };
      
    } catch (error) {
      console.error(chalk.red('❌ 截图失败:'), error.message);
      throw error;
    }
  }
}

module.exports = new ScreenshotCommand();
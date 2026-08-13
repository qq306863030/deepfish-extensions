const { screen, mouse } = require('@nut-tree-fork/nut-js');
const chalk = require('chalk');
const os = require('os');

class InfoCommand {
  async execute(options) {
    try {
      console.log(chalk.blue('💻 系统信息...'));
      console.log('');
      
      // 显示系统信息
      if (options.screen) {
        await this.showScreenInfo();
      }
      
      if (options.mouse) {
        await this.showMouseInfo();
      }
      
      if (options.windows) {
        await this.showWindowsInfo();
      }
      
      // 如果没有指定具体信息，显示所有
      if (!options.screen && !options.mouse && !options.windows) {
        await this.showSystemInfo();
        await this.showScreenInfo();
        await this.showMouseInfo();
      }
      
      return { success: true };
      
    } catch (error) {
      console.error(chalk.red('❌ 获取信息失败:'), error.message);
      throw error;
    }
  }
  
  async showSystemInfo() {
    console.log(chalk.green('📋 系统信息:'));
    console.log(chalk.gray('  操作系统:'), `${os.type()} ${os.release()} (${os.arch()})`);
    console.log(chalk.gray('  主机名:'), os.hostname());
    console.log(chalk.gray('  用户名:'), os.userInfo().username);
    console.log(chalk.gray('  系统运行时间:'), this.formatUptime(os.uptime()));
    console.log(chalk.gray('  CPU:'), os.cpus()[0]?.model || '未知');
    console.log(chalk.gray('  内存:'), this.formatMemory(os.totalmem(), os.freemem()));
    console.log('');
  }
  
  async showScreenInfo() {
    try {
      const screenWidth = await screen.width();
      const screenHeight = await screen.height();
      
      console.log(chalk.green('🖥️  屏幕信息:'));
      console.log(chalk.gray('  分辨率:'), `${screenWidth} x ${screenHeight}`);
      console.log('');
    } catch (error) {
      console.log(chalk.yellow('⚠️  无法获取屏幕信息'));
    }
  }
  
  async showMouseInfo() {
    try {
      const mousePos = await mouse.getPosition();
      
      console.log(chalk.green('🖱️  鼠标信息:'));
      console.log(chalk.gray('  当前位置:'), `(${mousePos.x}, ${mousePos.y})`);
      console.log('');
    } catch (error) {
      console.log(chalk.yellow('⚠️  无法获取鼠标信息'));
    }
  }
  
  async showWindowsInfo() {
    console.log(chalk.green('🪟  窗口信息:'));
    console.log(chalk.yellow('  ⚠️  窗口信息功能需要node-active-win库'));
    console.log(chalk.gray('  请安装: npm install node-active-win'));
    console.log('');
  }
  
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0) parts.push(`${minutes}分钟`);
    
    return parts.join(' ') || '刚启动';
  }
  
  formatMemory(total, free) {
    const used = total - free;
    const formatSize = (bytes) => {
      const gb = bytes / (1024 * 1024 * 1024);
      return `${gb.toFixed(2)} GB`;
    };
    
    return `${formatSize(used)} / ${formatSize(total)} (${((used / total) * 100).toFixed(1)}%)`;
  }
}

module.exports = new InfoCommand();
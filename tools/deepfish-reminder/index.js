const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const functions = {
  /**
   * 【仅限用户明确提出"网页提醒/浏览器弹窗"时调用】在浏览器中弹出一个全屏居中的提示页面，展示指定的提示消息
   * @param {string} message - 要提示的文本内容，例如"下班该打卡了！"
   * @returns {{ success: boolean, data?: any, error?: string }}
   */
  showNotify(message) {
    try {
      if (!message || typeof message !== 'string') {
        return { success: false, error: '参数 message 必须是一个非空字符串' };
      }

      // 读取 template.html（相对于本文件所在目录）
      const templatePath = path.join(__dirname, 'template.html');
      if (!fs.existsSync(templatePath)) {
        return { success: false, error: `模板文件不存在: ${templatePath}` };
      }

      let template = fs.readFileSync(templatePath, 'utf-8');

      // 替换模板中的 {{message}} 占位符
      // 对消息中的 HTML 特殊字符进行转义，防止 XSS
      const escapedMessage = message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

      template = template.replace(/\{\{message\}\}/g, escapedMessage);

      // 在当前工作目录生成 temp.html（覆盖已存在的文件）
      const outputPath = path.join(__dirname, 'temp.html');
      fs.writeFileSync(outputPath, template, 'utf-8');

      // 使用系统默认浏览器打开 temp.html
      const cmd = process.platform === 'win32'
        ? `start "" "${outputPath}"`
        : process.platform === 'darwin'
          ? `open "${outputPath}"`
          : `xdg-open "${outputPath}"`;

      exec(cmd, (err) => {
        if (err) {
          console.error(`打开浏览器失败: ${err.message}`);
        }
      });

      return {
        success: true,
        data: {
          message: escapedMessage,
          outputFile: outputPath,
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};

const descriptions = [
  {
    type: 'function',
    function: {
      name: 'showNotify',
      description: '【重要：仅在用户明确提出"网页提醒"、"用浏览器弹窗"、"打开网页提示"、"网页提醒工具"等明确涉及浏览器/网页展示的请求时才调用此工具】在浏览器中打开一个全屏居中、带高级CSS渐变动画的提示页面，展示用户指定的提示消息。不要将此工具用于普通的文字提醒或通知，仅限需要浏览器弹窗展示的场景。',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: '要提示的文本内容，例如"下班该打卡了！"、"开会啦！"等。注意提示内容要简洁明了。',
          },
        },
        required: ['message'],
      },
    },
  },
];

module.exports = { functions, descriptions };

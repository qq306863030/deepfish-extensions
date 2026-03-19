/**
 * FFmpeg媒体工具集成版本
 * 重新导出 ffmpeg-integrated.js 的功能，提供向后兼容性
 */

// 导入集成文件
const { descriptions, functions } = require('./ffmpeg-integrated.js');

// 创建向后兼容的别名（可选）
// 如果需要保持与旧代码的兼容性，可以取消注释以下代码
/*
const compatibleFunctions = {};

// 将 ffmpeg_ 前缀的函数映射为 ffmpegMediaTools_ 前缀
for (const [key, value] of Object.entries(functions)) {
  if (key.startsWith('ffmpeg_')) {
    const newKey = key.replace('ffmpeg_', 'ffmpegMediaTools_');
    // 简单转换函数名，例如: ffmpeg_checkFfmpegInstallation -> ffmpegMediaTools_checkFfmpegInstallation
    // 更复杂的转换需要根据具体函数名调整
    compatibleFunctions[newKey] = value;
  }
}

// 合并新旧函数
const allFunctions = {
  ...functions,
  ...compatibleFunctions
};
*/

// 导出
module.exports = {
  descriptions,
  functions
  // 如果启用向后兼容，使用下面的导出
  // functions: allFunctions
};
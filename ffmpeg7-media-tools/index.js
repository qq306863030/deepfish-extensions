/**
 * FFmpeg媒体工具集成版本
 * 重新导出拆分的功能函数和描述文件，提供向后兼容性
 */

const functions = require('./ffmpeg-functions.js').functions;
const descriptions = require('./ffmpeg-descriptions.js');

// 导出
module.exports = {
  descriptions,
  functions
};
/**
 * FFmpeg媒体工具集成版本
 * 重新导出 ffmpeg-integrated.js 的功能，提供向后兼容性
 */

const { descriptions, functions } = require('./ffmpeg-integrated.js');


// 导出
module.exports = {
  descriptions,
  functions
};
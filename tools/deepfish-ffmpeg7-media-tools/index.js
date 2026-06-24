/**
 * FFmpeg媒体工具集成版本
 * 重新导出拆分的功能函数和描述文件，提供向后兼容性
 */

const functions = require('./ffmpeg-functions.js');
const descriptions = require('./ffmpeg-descriptions.js');

const name = '@deepfish-ai/ffmpeg7-media-tools';
const description = 'A DeepFish AI extension tool for FFmpeg 7 media processing, including FFmpeg installation/version checks, video/audio format conversion, video trim/merge/concat/crop/rotate/resize, playback speed and bitrate/volume adjustment, video compression, GIF generation, frame and thumbnail extraction, subtitle and watermark/text overlay, audio extraction/mixing, video-audio muxing, and media metadata inspection.';

// 导出
module.exports = {
  name,
  description,
  descriptions,
  functions
};
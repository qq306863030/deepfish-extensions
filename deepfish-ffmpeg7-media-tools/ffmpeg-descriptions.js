/**
 * FFmpeg 媒体工具描述文件
 * 包含所有功能的AI智能体描述信息
 * @version 1.0.0
 */

// 描述数组初始化
const descriptions = [];

// ============ AI 智能体描述部分 ============
// 以下描述供 AI 智能体读取，用于理解函数功能和参数结构

descriptions.push({
  name: 'ffmpeg_checkFfmpegInstallation',
  description: 'FFmpeg工具:检测ffmpeg是否安装和版本检测',
  parameters: {
    type: 'object',
    properties: {
      minVersion: {
        type: 'string',
        description: '最低要求的ffmpeg版本号（可选），例如"7.0"',
      },
    },
  },
});

descriptions.push({
  name: 'ffmpeg_convertVideoFormat',
  description: 'FFmpeg工具:转换视频格式',
  parameters: {
    type: 'object',
    properties: {
      inputPath: {
        type: 'string',
        description: '输入视频文件路径',
      },
      outputPath: {
        type: 'string',
        description: '输出视频文件路径',
      },
      format: {
        type: 'string',
        description: '目标格式，如mp4、avi、mov、mkv等（可选）',
      },
      quality: {
        type: 'string',
        description: '视频质量参数（可选，默认为-crf 23）',
      },
    },
    required: ['inputPath', 'outputPath'],
  },
});

descriptions.push({
  name: 'ffmpeg_extractAudioFromVideo',
  description: 'FFmpeg工具:从视频中提取音频',
  parameters: {
    type: 'object',
    properties: {
      videoPath: {
        type: 'string',
        description: '输入视频文件路径',
      },
      audioPath: {
        type: 'string',
        description: '输出音频文件路径',
      },
      audioFormat: {
        type: 'string',
        description: '音频格式，如mp3、wav、aac等（可选，默认为mp3）',
      },
    },
    required: ['videoPath', 'audioPath'],
  },
});

descriptions.push({
  name: 'ffmpeg_resizeVideo',
  description: 'FFmpeg工具:调整视频尺寸',
  parameters: {
    type: 'object',
    properties: {
      inputPath: {
        type: 'string',
        description: '输入视频文件路径',
      },
      outputPath: {
        type: 'string',
        description: '输出视频文件路径',
      },
      width: {
        type: 'number',
        description: '目标宽度（像素）',
      },
      height: {
        type: 'number',
        description: '目标高度（像素）',
      },
      keepAspectRatio: {
        type: 'boolean',
        description: '是否保持宽高比（可选，默认为true）',
      },
    },
    required: ['inputPath', 'outputPath', 'width', 'height'],
  },
});

descriptions.push({
  name: 'ffmpeg_trimVideo',
  description: 'FFmpeg工具:剪切视频片段',
  parameters: {
    type: 'object',
    properties: {
      inputPath: {
        type: 'string',
        description: '输入视频文件路径',
      },
      outputPath: {
        type: 'string',
        description: '输出视频文件路径',
      },
      startTime: {
        type: 'string',
        description: '开始时间（格式：HH:MM:SS 或 秒数）',
      },
      duration: {
        type: 'string',
        description: '持续时间（格式：HH:MM:SS 或 秒数）',
      },
    },
    required: ['inputPath', 'outputPath', 'startTime', 'duration'],
  },
});

descriptions.push({
  name: 'ffmpeg_mergeVideos',
  description: 'FFmpeg工具:合并多个视频文件',
  parameters: {
    type: 'object',
    properties: {
      videoPaths: {
        type: 'array',
        description: '视频文件路径数组',
        items: {
          type: 'string',
        },
      },
      outputPath: {
        type: 'string',
        description: '输出视频文件路径',
      },
      method: {
        type: 'string',
        description: '合并方法：concat（串联）或 overlay（叠加，可选，默认为concat）',
      },
    },
    required: ['videoPaths', 'outputPath'],
  },
});

descriptions.push({
  name: 'ffmpeg_convertAudioFormat',
  description: 'FFmpeg工具:转换音频格式',
  parameters: {
    type: 'object',
    properties: {
      inputPath: {
        type: 'string',
        description: '输入音频文件路径',
      },
      outputPath: {
        type: 'string',
        description: '输出音频文件路径',
      },
      format: {
        type: 'string',
        description: '目标格式，如mp3、wav、aac、flac等',
      },
      bitrate: {
        type: 'string',
        description: '比特率（可选，如128k、192k、256k等）',
      },
    },
    required: ['inputPath', 'outputPath', 'format'],
  },
});

descriptions.push({
  name: 'ffmpeg_adjustAudioVolume',
  description: 'FFmpeg工具:调整音频音量',
  parameters: {
    type: 'object',
    properties: {
      inputPath: {
        type: 'string',
        description: '输入音频文件路径',
      },
      outputPath: {
        type: 'string',
        description: '输出音频文件路径',
      },
      volume: {
        type: 'number',
        description: '音量倍数（如0.5为一半音量，2.0为两倍音量）',
      },
    },
    required: ['inputPath', 'outputPath', 'volume'],
  },
});

descriptions.push({
  name: 'ffmpeg_addWatermark',
  description: 'FFmpeg工具:添加水印',
  parameters: {
    type: 'object',
    properties: {
      inputPath: {
        type: 'string',
        description: '输入视频文件路径',
      },
      outputPath: {
        type: 'string',
        description: '输出视频文件路径',
      },
      watermarkPath: {
        type: 'string',
        description: '水印图片路径',
      },
      position: {
        type: 'string',
        description: '水印位置，如top-left、top-right、bottom-left、bottom-right、center（可选，默认为bottom-right）',
      },
      opacity: {
        type: 'number',
        description: '水印透明度，0-1之间（可选，默认为1）',
      },
    },
    required: ['inputPath', 'outputPath', 'watermarkPath'],
  },
});

descriptions.push({
  name: 'ffmpeg_adjustBitrate',
  description: 'FFmpeg工具:调整视频比特率',
  parameters: {
    type: 'object',
    properties: {
      inputPath: {
        type: 'string',
        description: '输入视频文件路径',
      },
      outputPath: {
        type: 'string',
        description: '输出视频文件路径',
      },
      bitrate: {
        type: 'string',
        description: '目标比特率，如1M、500k、2M等',
      },
      audioBitrate: {
        type: 'string',
        description: '音频比特率（可选）',
      },
    },
    required: ['inputPath', 'outputPath', 'bitrate'],
  },
});

descriptions.push({
  name: 'ffmpeg_mergeVideoAudio',
  description: 'FFmpeg工具:合并视频和音频',
  parameters: {
    type: 'object',
    properties: {
      videoPath: {
        type: 'string',
        description: '视频文件路径',
      },
      audioPath: {
        type: 'string',
        description: '音频文件路径',
      },
      outputPath: {
        type: 'string',
        description: '输出文件路径',
      },
      sync: {
        type: 'boolean',
        description: '是否同步音视频（可选，默认为true）',
      },
    },
    required: ['videoPath', 'audioPath', 'outputPath'],
  },
});

descriptions.push({
  name: 'ffmpeg_extractVideoThumbnail',
  description: 'FFmpeg工具:提取视频缩略图',
  parameters: {
    type: 'object',
    properties: {
      videoPath: {
        type: 'string',
        description: '输入视频文件路径',
      },
      outputPath: {
        type: 'string',
        description: '输出图片文件路径',
      },
      time: {
        type: 'string',
        description: '提取时间点（格式：HH:MM:SS 或 秒数，默认为00:00:01）',
      },
      size: {
        type: 'string',
        description: '缩略图尺寸（格式：宽x高，如320x240）',
      },
    },
    required: ['videoPath', 'outputPath'],
  },
});

descriptions.push({
  name: 'ffmpeg_getMediaInfo',
  description: 'FFmpeg工具:获取媒体文件信息',
  parameters: {
    type: 'object',
    properties: {
      mediaPath: {
        type: 'string',
        description: '媒体文件路径',
      },
    },
    required: ['mediaPath'],
  },
});

// ============ 新增函数描述 ============

descriptions.push({
  "name": "ffmpeg_videoToGif",
  "description": "FFmpeg工具:将视频转换为GIF动图",
  "parameters": {
    "type": "object",
    "properties": {
      "videoPath": {
        "type": "string",
        "description": "输入视频文件路径"
      },
      "outputPath": {
        "type": "string",
        "description": "输出GIF文件路径"
      },
      "startTime": {
        "type": "string",
        "description": "开始时间（格式：HH:MM:SS 或 秒数，默认为00:00:00）"
      },
      "duration": {
        "type": "string",
        "description": "持续时间（格式：HH:MM:SS 或 秒数，默认为全部）"
      },
      "fps": {
        "type": "number",
        "description": "帧率（默认为10）"
      },
      "width": {
        "type": "number",
        "description": "输出宽度（保持宽高比，高度自动计算）"
      }
    },
    "required": [
      "videoPath",
      "outputPath"
    ]
  }
});

descriptions.push({
  "name": "ffmpeg_cropVideo",
  "description": "FFmpeg工具:裁剪视频区域",
  "parameters": {
    "type": "object",
    "properties": {
      "videoPath": {
        "type": "string",
        "description": "输入视频文件路径"
      },
      "outputPath": {
        "type": "string",
        "description": "输出视频文件路径"
      },
      "x": {
        "type": "number",
        "description": "起始X坐标（像素）"
      },
      "y": {
        "type": "number",
        "description": "起始Y坐标（像素）"
      },
      "width": {
        "type": "number",
        "description": "裁剪宽度（像素）"
      },
      "height": {
        "type": "number",
        "description": "裁剪高度（像素）"
      }
    },
    "required": [
      "videoPath",
      "outputPath",
      "x",
      "y",
      "width",
      "height"
    ]
  }
});

descriptions.push({
  "name": "ffmpeg_rotateVideo",
  "description": "FFmpeg工具:旋转视频",
  "parameters": {
    "type": "object",
    "properties": {
      "videoPath": {
        "type": "string",
        "description": "输入视频文件路径"
      },
      "outputPath": {
        "type": "string",
        "description": "输出视频文件路径"
      },
      "angle": {
        "type": "string",
        "description": "旋转角度（90, 180, 270, 或 transpose参数）"
      }
    },
    "required": [
      "videoPath",
      "outputPath",
      "angle"
    ]
  }
});

descriptions.push({
  "name": "ffmpeg_changeVideoSpeed",
  "description": "FFmpeg工具:改变视频播放速度",
  "parameters": {
    "type": "object",
    "properties": {
      "videoPath": {
        "type": "string",
        "description": "输入视频文件路径"
      },
      "outputPath": {
        "type": "string",
        "description": "输出视频文件路径"
      },
      "speed": {
        "type": "number",
        "description": "速度倍数（0.5表示慢放一半，2.0表示快放一倍）"
      }
    },
    "required": [
      "videoPath",
      "outputPath",
      "speed"
    ]
  }
});

descriptions.push({
  "name": "ffmpeg_addSubtitles",
  "description": "FFmpeg工具:添加字幕到视频",
  "parameters": {
    "type": "object",
    "properties": {
      "videoPath": {
        "type": "string",
        "description": "输入视频文件路径"
      },
      "subtitlePath": {
        "type": "string",
        "description": "字幕文件路径（支持srt, ass等格式）"
      },
      "outputPath": {
        "type": "string",
        "description": "输出视频文件路径"
      },
      "encoding": {
        "type": "string",
        "description": "字幕编码（默认为UTF-8）"
      }
    },
    "required": [
      "videoPath",
      "subtitlePath",
      "outputPath"
    ]
  }
});

descriptions.push({
  "name": "ffmpeg_extractVideoFrames",
  "description": "FFmpeg工具:提取视频帧为图片序列",
  "parameters": {
    "type": "object",
    "properties": {
      "videoPath": {
        "type": "string",
        "description": "输入视频文件路径"
      },
      "outputDir": {
        "type": "string",
        "description": "输出目录路径"
      },
      "fps": {
        "type": "number",
        "description": "每秒提取帧数（默认为1）"
      },
      "format": {
        "type": "string",
        "description": "输出图片格式（jpg, png等，默认为jpg）"
      },
      "startTime": {
        "type": "string",
        "description": "开始时间（格式：HH:MM:SS）"
      },
      "duration": {
        "type": "string",
        "description": "持续时间（格式：HH:MM:SS）"
      }
    },
    "required": [
      "videoPath",
      "outputDir"
    ]
  }
});

descriptions.push({
  "name": "ffmpeg_concatVideos",
  "description": "FFmpeg工具:拼接多个视频文件（使用concat demuxer）",
  "parameters": {
    "type": "object",
    "properties": {
      "videoPaths": {
        "type": "array",
        "description": "视频文件路径数组"
      },
      "outputPath": {
        "type": "string",
        "description": "输出视频文件路径"
      },
      "transition": {
        "type": "string",
        "description": "转场效果（none, fade等，可选）"
      }
    },
    "required": [
      "videoPaths",
      "outputPath"
    ]
  }
});

descriptions.push({
  "name": "ffmpeg_mixAudios",
  "description": "FFmpeg工具:混合多个音频文件",
  "parameters": {
    "type": "object",
    "properties": {
      "audioPaths": {
        "type": "array",
        "description": "音频文件路径数组"
      },
      "outputPath": {
        "type": "string",
        "description": "输出音频文件路径"
      },
      "volumes": {
        "type": "array",
        "description": "各音频音量数组（如[1.0, 0.5]）"
      }
    },
    "required": [
      "audioPaths",
      "outputPath"
    ]
  }
});

descriptions.push({
  "name": "ffmpeg_compressVideo",
  "description": "FFmpeg工具:压缩视频（调整CRF）",
  "parameters": {
    "type": "object",
    "properties": {
      "videoPath": {
        "type": "string",
        "description": "输入视频文件路径"
      },
      "outputPath": {
        "type": "string",
        "description": "输出视频文件路径"
      },
      "crf": {
        "type": "number",
        "description": "CRF值（0-51，越小质量越高，默认为23）"
      },
      "preset": {
        "type": "string",
        "description": "编码预设（ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow，默认为medium）"
      }
    },
    "required": [
      "videoPath",
      "outputPath"
    ]
  }
});

descriptions.push({
  "name": "ffmpeg_addTextOverlay",
  "description": "FFmpeg工具:添加文本叠加到视频",
  "parameters": {
    "type": "object",
    "properties": {
      "videoPath": {
        "type": "string",
        "description": "输入视频文件路径"
      },
      "outputPath": {
        "type": "string",
        "description": "输出视频文件路径"
      },
      "text": {
        "type": "string",
        "description": "要叠加的文本"
      },
      "x": {
        "type": "number",
        "description": "文本X坐标（像素）"
      },
      "y": {
        "type": "number",
        "description": "文本Y坐标（像素）"
      },
      "fontSize": {
        "type": "number",
        "description": "字体大小（默认为24）"
      },
      "fontColor": {
        "type": "string",
        "description": "字体颜色（默认为white）"
      },
      "startTime": {
        "type": "string",
        "description": "开始显示时间（格式：HH:MM:SS）"
      },
      "duration": {
        "type": "string",
        "description": "显示持续时间（格式：HH:MM:SS）"
      }
    },
    "required": [
      "videoPath",
      "outputPath",
      "text"
    ]
  }
});

descriptions.push({
  name: 'ffmpeg_adjustVideoVolume',
  description: 'FFmpeg工具:调整视频音量',
  parameters: {
    type: 'object',
    properties: {
      videoPath: {
        type: 'string',
        description: '输入视频文件路径',
      },
      outputPath: {
        type: 'string',
        description: '输出视频文件路径',
      },
      volume: {
        type: 'number',
        description: '音量倍数（如0.5为一半音量，2.0为两倍音量）',
      },
    },
    required: ['videoPath', 'outputPath', 'volume'],
  },
});




// ============ 模块导出 ============
module.exports = descriptions;

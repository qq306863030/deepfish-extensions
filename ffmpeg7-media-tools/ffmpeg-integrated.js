/**
 * 基于FFmpeg 7的集成媒体处理工具
 * 合并了ffmpegTools.js和index.js的功能，去除重复部分
 * @version 1.0.0
 */

const descriptions = [];
const functions = {};

// ============ 内部辅助函数 ============

/**
 * 内部函数：检测ffmpeg是否安装
 */
const checkFfmpeg = async () => {
  try {
    // 根据不同平台执行不同的命令
    const platform = process.platform;
    let command;
    if (platform === 'win32') {
      command = 'where ffmpeg';
    } else {
      command = 'which ffmpeg';
    }
    
    await this.Tools.executeCommand(command);
    return { installed: true, error: null };
  } catch (error) {
    return { 
      installed: false, 
      error: error.message,
      message: 'FFmpeg未安装或未在系统路径中。请访问 https://ffmpeg.p2hp.com/download.html 下载并安装FFmpeg。'
    };
  }
};

/**
 * 内部函数：获取ffmpeg版本
 */
const getFfmpegVersion = async () => {
  try {
    const result = await this.Tools.executeCommand('ffmpeg -version');
    // 从输出中提取版本号
    const versionMatch = result.match(/ffmpeg version (\S+)/);
    const version = versionMatch ? versionMatch[1] : '未知版本';
    return { 
      version,
      details: result.split('\n').slice(0, 5).join('\n') // 返回前5行信息
    };
  } catch (error) {
    return { version: null, error: error.message };
  }
};

// ============ 公共功能函数 ============

// 函数1: 检测ffmpeg是否安装和版本检测
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

functions.ffmpeg_checkFfmpegInstallation = async (params = {}) => {
  const { minVersion } = params;
  
  // 检查是否安装
  const checkResult = await checkFfmpeg();
  if (!checkResult.installed) {
    return {
      installed: false,
      message: checkResult.message,
      error: checkResult.error
    };
  }
  
  // 获取版本信息
  const versionInfo = await getFfmpegVersion();
  if (versionInfo.error) {
    return {
      installed: false,
      message: '无法获取FFmpeg版本信息，请确保ffmpeg正确安装',
      error: versionInfo.error
    };
  }
  
  // 检查版本是否满足要求
  let versionOk = true;
  let versionMessage = '';
  if (minVersion && versionInfo.version) {
    const currentVersion = versionInfo.version.split('-')[0]; // 移除可能的构建信息
    const currentParts = currentVersion.split('.').map(Number);
    const minParts = minVersion.split('.').map(Number);
    
    // 简单的版本比较
    for (let i = 0; i < Math.min(currentParts.length, minParts.length); i++) {
      if (currentParts[i] > minParts[i]) {
        versionOk = true;
        break;
      } else if (currentParts[i] < minParts[i]) {
        versionOk = false;
        break;
      }
    }
    
    if (!versionOk) {
      versionMessage = `当前版本${versionInfo.version}低于要求版本${minVersion}`;
    }
  }
  
  return {
    installed: true,
    version: versionInfo.version,
    versionOk,
    versionMessage,
    details: versionInfo.details,
    message: versionOk 
      ? `FFmpeg已安装，版本: ${versionInfo.version}` 
      : `FFmpeg版本不符合要求: ${versionMessage}`
  };
};

// 函数2: 转换视频格式（来自index.js，改进版）
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

functions.ffmpeg_convertVideoFormat = async (params) => {
  const { inputPath, outputPath, format, quality = '-crf 23' } = params;
  
  // 检查ffmpeg安装
  const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
  if (!checkResult.installed || !checkResult.versionOk) {
    throw new Error(`FFmpeg检查失败: ${checkResult.message}`);
  }
  
  // 确保输出路径有正确的扩展名
  let finalOutputPath = outputPath;
  if (format && !finalOutputPath.toLowerCase().endsWith(`.${format.toLowerCase()}`)) {
    finalOutputPath = finalOutputPath.replace(/\.[^/.]+$/, "") + `.${format}`;
  }
  
  const command = `ffmpeg -i "${inputPath}" ${quality} "${finalOutputPath}"`;
  await this.Tools.executeCommand(command);
  
  return {
    success: true,
    message: `视频格式转换完成: ${finalOutputPath}`,
    outputPath: finalOutputPath
  };
};

// 函数3: 从视频中提取音频（来自index.js）
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

functions.ffmpeg_extractAudioFromVideo = async (params) => {
  const { videoPath, audioPath, audioFormat = 'mp3' } = params;
  
  // 检查ffmpeg安装
  const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
  if (!checkResult.installed || !checkResult.versionOk) {
    throw new Error(`FFmpeg检查失败: ${checkResult.message}`);
  }
  
  // 确保输出路径有正确的扩展名
  let finalAudioPath = audioPath;
  if (!finalAudioPath.toLowerCase().endsWith(`.${audioFormat.toLowerCase()}`)) {
    finalAudioPath = finalAudioPath.replace(/\.[^/.]+$/, "") + `.${audioFormat}`;
  }
  
  const command = `ffmpeg -i "${videoPath}" -q:a 0 -map a "${finalAudioPath}"`;
  await this.Tools.executeCommand(command);
  
  return {
    success: true,
    message: `音频提取完成: ${finalAudioPath}`,
    audioPath: finalAudioPath
  };
};

// 函数4: 调整视频尺寸（来自index.js）
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

functions.ffmpeg_resizeVideo = async (params) => {
  const { inputPath, outputPath, width, height, keepAspectRatio = true } = params;
  
  // 检查ffmpeg安装
  const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
  if (!checkResult.installed || !checkResult.versionOk) {
    throw new Error(`FFmpeg检查失败: ${checkResult.message}`);
  }
  
  let scaleFilter = '';
  if (keepAspectRatio) {
    scaleFilter = `scale=w=${width}:h=${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
  } else {
    scaleFilter = `scale=${width}:${height}`;
  }
  
  const command = `ffmpeg -i "${inputPath}" -vf "${scaleFilter}" -c:a copy "${outputPath}"`;
  await this.Tools.executeCommand(command);
  
  return {
    success: true,
    message: `视频尺寸调整完成: ${width}x${height}`,
    outputPath: outputPath
  };
};

// 函数5: 剪切视频片段（来自index.js，原cutVideo）
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

functions.ffmpeg_trimVideo = async (params) => {
  const { inputPath, outputPath, startTime, duration } = params;
  
  // 检查ffmpeg安装
  const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
  if (!checkResult.installed || !checkResult.versionOk) {
    throw new Error(`FFmpeg检查失败: ${checkResult.message}`);
  }
  
  const command = `ffmpeg -i "${inputPath}" -ss ${startTime} -t ${duration} -c copy "${outputPath}"`;
  await this.Tools.executeCommand(command);
  
  return {
    success: true,
    message: `视频剪切完成: 从 ${startTime} 开始，持续 ${duration}`,
    outputPath: outputPath
  };
};

// 函数6: 合并多个视频文件（来自index.js）
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

functions.ffmpeg_mergeVideos = async (params) => {
  const { videoPaths, outputPath, method = 'concat' } = params;
  
  // 检查ffmpeg安装
  const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
  if (!checkResult.installed || !checkResult.versionOk) {
    throw new Error(`FFmpeg检查失败: ${checkResult.message}`);
  }
  
  if (method === 'concat') {
    // 创建文件列表
    const listFilePath = outputPath.replace(/\.[^/.]+$/, "") + '_list.txt';
    let listContent = '';
    videoPaths.forEach(path => {
      listContent += `file '${path}'\n`;
    });
    
    await this.Tools.createFile(listFilePath, listContent);
    
    const command = `ffmpeg -f concat -safe 0 -i "${listFilePath}" -c copy "${outputPath}"`;
    await this.Tools.executeCommand(command);
    
    // 删除临时文件
    await this.Tools.deleteFile(listFilePath);
    
  } else if (method === 'overlay') {
    // 简单叠加示例（实际应用中可能需要更复杂的处理）
    if (videoPaths.length === 2) {
      const command = `ffmpeg -i "${videoPaths[0]}" -i "${videoPaths[1]}" -filter_complex "[0:v][1:v]overlay=10:10" "${outputPath}"`;
      await this.Tools.executeCommand(command);
    } else {
      throw new Error('叠加模式目前仅支持两个视频');
    }
  } else {
    throw new Error(`不支持的合并方法: ${method}`);
  }
  
  return {
    success: true,
    message: `视频合并完成，使用 ${method} 方法`,
    outputPath: outputPath
  };
};

// 函数7: 转换音频格式（来自index.js，新增功能）
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

functions.ffmpeg_convertAudioFormat = async (params) => {
  const { inputPath, outputPath, format, bitrate = '' } = params;
  
  // 检查ffmpeg安装
  const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
  if (!checkResult.installed || !checkResult.versionOk) {
    throw new Error(`FFmpeg检查失败: ${checkResult.message}`);
  }
  
  // 确保输出路径有正确的扩展名
  let finalOutputPath = outputPath;
  if (!finalOutputPath.toLowerCase().endsWith(`.${format.toLowerCase()}`)) {
    finalOutputPath = finalOutputPath.replace(/\.[^/.]+$/, "") + `.${format}`;
  }
  
  let bitrateOption = '';
  if (bitrate) {
    bitrateOption = `-b:a ${bitrate}`;
  }
  
  const command = `ffmpeg -i "${inputPath}" ${bitrateOption} "${finalOutputPath}"`;
  await this.Tools.executeCommand(command);
  
  return {
    success: true,
    message: `音频格式转换完成: ${format}`,
    outputPath: finalOutputPath
  };
};

// 函数8: 调整音频音量（来自index.js，新增功能）
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

functions.ffmpeg_adjustAudioVolume = async (params) => {
  const { inputPath, outputPath, volume } = params;
  
  // 检查ffmpeg安装
  const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
  if (!checkResult.installed || !checkResult.versionOk) {
    throw new Error(`FFmpeg检查失败: ${checkResult.message}`);
  }
  
  const command = `ffmpeg -i "${inputPath}" -filter:a "volume=${volume}" "${outputPath}"`;
  await this.Tools.executeCommand(command);
  
  return {
    success: true,
    message: `音频音量调整完成: ${volume}倍`,
    outputPath: outputPath
  };
};

// 函数9: 添加水印（来自ffmpegTools.js，独特功能）
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

// 函数10: 调整视频比特率（来自ffmpegTools.js，独特功能）
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

// 函数11: 合并视频和音频（来自ffmpegTools.js，独特功能）
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

// 函数12: 提取视频缩略图（来自index.js，改进版）
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

functions.ffmpeg_extractVideoThumbnail = async (params) => {
  const { videoPath, outputPath, time = '00:00:01', size = '' } = params;
  
  // 检查ffmpeg安装
  const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
  if (!checkResult.installed || !checkResult.versionOk) {
    throw new Error(`FFmpeg检查失败: ${checkResult.message}`);
  }
  
  // 确保输出路径有图片扩展名
  let finalOutputPath = outputPath;
  if (!finalOutputPath.toLowerCase().match(/\.(jpg|jpeg|png|bmp|gif)$/)) {
    finalOutputPath = finalOutputPath.replace(/\.[^/.]+$/, "") + '.jpg';
  }
  
  let sizeOption = '';
  if (size) {
    sizeOption = `-s ${size}`;
  }
  
  const command = `ffmpeg -i "${videoPath}" -ss ${time} -vframes 1 ${sizeOption} "${finalOutputPath}"`;
  await this.Tools.executeCommand(command);
  
  return {
    success: true,
    message: `视频缩略图提取完成: ${time}`,
    outputPath: finalOutputPath
  };
};

// 函数13: 获取媒体文件信息（来自index.js，改进版）
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

functions.ffmpeg_getMediaInfo = async (params) => {
  const { mediaPath } = params;
  
  // 检查ffmpeg安装
  const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
  if (!checkResult.installed || !checkResult.versionOk) {
    throw new Error(`FFmpeg检查失败: ${checkResult.message}`);
  }
  
  try {
    const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${mediaPath}"`;
    const result = await this.Tools.executeCommand(command);
    
    // 解析JSON结果
    const info = JSON.parse(result);
    
    // 提取关键信息
    const formatInfo = info.format || {};
    const streams = info.streams || [];
    
    const videoStreams = streams.filter(s => s.codec_type === 'video');
    const audioStreams = streams.filter(s => s.codec_type === 'audio');
    
    const mediaInfo = {
      format: formatInfo.format_name || 'unknown',
      duration: formatInfo.duration || '0',
      size: formatInfo.size || '0',
      bitrate: formatInfo.bit_rate || '0',
      videoStreams: videoStreams.length,
      audioStreams: audioStreams.length,
      streams: streams.map(stream => ({
        type: stream.codec_type,
        codec: stream.codec_name,
        width: stream.width || null,
        height: stream.height || null,
        duration: stream.duration || null,
        bitrate: stream.bit_rate || null,
        sampleRate: stream.sample_rate || null,
        channels: stream.channels || null
      })),
      rawInfo: info
    };
    
    return {
      success: true,
      message: '媒体信息获取成功',
      info: mediaInfo
    };
    
  } catch (error) {
    // 如果ffprobe失败，尝试使用ffmpeg获取基本信息
    try {
      const fallbackCommand = `ffmpeg -i "${mediaPath}"`;
      await this.Tools.executeCommand(fallbackCommand);
    } catch (ffmpegError) {
      // 从错误信息中提取信息
      const errorStr = ffmpegError.toString();
      const durationMatch = errorStr.match(/Duration: (\d{2}:\d{2}:\d{2}\.\d{2})/);
      const videoMatch = errorStr.match(/Video: ([^,]+)/);
      const audioMatch = errorStr.match(/Audio: ([^,]+)/);
      
      return {
        success: true,
        message: '媒体信息获取成功（从错误信息中提取）',
        info: {
          format: 'unknown',
          duration: durationMatch ? durationMatch[1] : '0',
          size: 'unknown',
          bitrate: 'unknown',
          videoStreams: videoMatch ? 1 : 0,
          audioStreams: audioMatch ? 1 : 0,
          streams: [],
          rawInfo: { note: '信息从ffmpeg错误输出中提取' }
        }
      };
    }
    
    throw new Error(`无法获取媒体文件信息: ${error.message}`);
  }
};


// 函数9: 添加水印（完整实现）
functions.ffmpeg_addWatermark = async (params) => {
  const { inputPath, outputPath, watermarkPath, position = 'bottom-right', opacity = 1 } = params;
  
  // 检查ffmpeg安装
  const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
  if (!checkResult.installed || !checkResult.versionOk) {
    throw new Error(`FFmpeg检查失败: ${checkResult.message}`);
  }
  
  // 构建ffmpeg命令
  let command = `ffmpeg -i "${inputPath}" -i "${watermarkPath}"`;
  
  // 设置水印位置
  let filter = 'overlay=';
  switch (position) {
    case 'top-left':
      filter += '10:10';
      break;
    case 'top-right':
      filter += 'main_w-overlay_w-10:10';
      break;
    case 'bottom-left':
      filter += '10:main_h-overlay_h-10';
      break;
    case 'bottom-right':
      filter += 'main_w-overlay_w-10:main_h-overlay_h-10';
      break;
    case 'center':
      filter += '(main_w-overlay_w)/2:(main_h-overlay_h)/2';
      break;
    default:
      filter += 'main_w-overlay_w-10:main_h-overlay_h-10'; // 默认右下角
  }
  
  // 添加透明度参数
  let opacityFilter = '';
  if (opacity < 1) {
    opacityFilter = `[1:v]format=rgba,colorchannelmixer=aa=${opacity}[wm];[0:v][wm]${filter}`;
  } else {
    opacityFilter = `[0:v][1:v]${filter}`;
  }
  
  command += ` -filter_complex "${opacityFilter}"`;
  
  // 添加输出路径
  command += ` "${outputPath}"`;
  
  try {
    const result = await this.Tools.executeCommand(command);
    return {
      success: true,
      message: `水印添加完成: ${outputPath}`,
      command,
      outputPath: outputPath
    };
  } catch (error) {
    throw new Error(`水印添加失败: ${error.message}`);
  }
};

// 函数10: 调整视频比特率（完整实现）
functions.ffmpeg_adjustBitrate = async (params) => {
  const { inputPath, outputPath, bitrate, audioBitrate } = params;
  
  // 检查ffmpeg安装
  const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
  if (!checkResult.installed || !checkResult.versionOk) {
    throw new Error(`FFmpeg检查失败: ${checkResult.message}`);
  }
  
  // 构建ffmpeg命令
  let command = `ffmpeg -i "${inputPath}" -b:v ${bitrate}`;
  
  // 添加音频比特率参数
  if (audioBitrate) {
    command += ` -b:a ${audioBitrate}`;
  }
  
  // 添加输出路径
  command += ` "${outputPath}"`;
  
  try {
    const result = await this.Tools.executeCommand(command);
    return {
      success: true,
      message: `视频比特率调整完成: ${outputPath}`,
      command,
      outputPath: outputPath
    };
  } catch (error) {
    throw new Error(`视频比特率调整失败: ${error.message}`);
  }
};

// 函数11: 合并视频和音频（完整实现）
functions.ffmpeg_mergeVideoAudio = async (params) => {
  const { videoPath, audioPath, outputPath, sync = true } = params;
  
  // 检查ffmpeg安装
  const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
  if (!checkResult.installed || !checkResult.versionOk) {
    throw new Error(`FFmpeg检查失败: ${checkResult.message}`);
  }
  
  // 构建ffmpeg命令
  let command;
  if (sync) {
    command = `ffmpeg -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "${outputPath}"`;
  } else {
    command = `ffmpeg -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 "${outputPath}"`;
  }
  
  try {
    const result = await this.Tools.executeCommand(command);
    return {
      success: true,
      message: `视频音频合并完成: ${outputPath}`,
      command,
      outputPath: outputPath
    };
  } catch (error) {
    throw new Error(`视频音频合并失败: ${error.message}`);
  }
};

// 删除占位符注释
// 现在需要从ffmpegTools.js中提取剩余的三个函数的实现
// 由于代码量较大，我将先创建占位符，然后从原文件复制实现

// ============ 模块导出 ============
module.exports = {
  descriptions,
  functions
};
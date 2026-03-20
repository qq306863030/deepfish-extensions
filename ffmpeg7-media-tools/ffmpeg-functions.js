/**
 * 基于FFmpeg 7的集成媒体处理工具
 * 合并了ffmpegTools.js和index.js的功能，去除重复部分
 * @version 1.0.0
 */

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


// ============ 公共功能函数定义 ============

/**
 * 检测ffmpeg是否安装和版本检测
 * 
 * @param {Object} params - 参数对象，具体属性见描述
 * @returns {Promise<Object>} 处理结果
 */
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

/**
 * 转换视频格式
 * 
 * @param {Object} params - 参数对象，具体属性见描述
 * @returns {Promise<Object>} 处理结果
 */
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

/**
 * 从视频中提取音频
 * 
 * @param {Object} params - 参数对象，具体属性见描述
 * @returns {Promise<Object>} 处理结果
 */
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

/**
 * 调整视频尺寸
 * 
 * @param {Object} params - 参数对象，具体属性见描述
 * @returns {Promise<Object>} 处理结果
 */
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

/**
 * 剪切视频片段
 * 
 * @param {Object} params - 参数对象，具体属性见描述
 * @returns {Promise<Object>} 处理结果
 */
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

/**
 * 合并多个视频文件
 * 
 * @param {Object} params - 参数对象，具体属性见描述
 * @returns {Promise<Object>} 处理结果
 */
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

/**
 * 转换音频格式
 * 
 * @param {Object} params - 参数对象，具体属性见描述
 * @returns {Promise<Object>} 处理结果
 */
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

/**
 * 调整音频音量
 * 
 * @param {Object} params - 参数对象，具体属性见描述
 * @returns {Promise<Object>} 处理结果
 */
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

/**
 * 添加水印
 * 
 * @param {Object} params - 参数对象，具体属性见描述
 * @returns {Promise<Object>} 处理结果
 */
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

/**
 * 调整视频比特率
 * 
 * @param {Object} params - 参数对象，具体属性见描述
 * @returns {Promise<Object>} 处理结果
 */
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

/**
 * 合并视频和音频
 * 
 * @param {Object} params - 参数对象，具体属性见描述
 * @returns {Promise<Object>} 处理结果
 */
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

/**
 * 提取视频缩略图
 * 
 * @param {Object} params - 参数对象，具体属性见描述
 * @returns {Promise<Object>} 处理结果
 */
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

/**
 * 获取媒体文件信息
 * 
 * @param {Object} params - 参数对象，具体属性见描述
 * @returns {Promise<Object>} 处理结果
 */
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

// ============ 新增常用功能函数 ============

/**
 * 将视频转换为GIF动图
 * 
 * @param {Object} params.videoPath 输入视频文件路径
 * @param {Object} params.outputPath 输出GIF文件路径
 * @param {Object} params.startTime 开始时间（格式：HH:MM:SS 或 秒数，默认为00:00:00）（可选）
 * @param {Object} params.duration 持续时间（格式：HH:MM:SS 或 秒数，默认为全部）（可选）
 * @param {Object} params.fps 帧率（默认为10）（可选）
 * @param {Object} params.width 输出宽度（保持宽高比，高度自动计算）（可选）
 * @returns {Promise<Object>} 处理结果
 */
functions.ffmpeg_videoToGif = async (params) => {
  try {
    // 检查ffmpeg安装
    const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
    if (!checkResult.installed || !checkResult.versionOk) {
      throw new Error(`FFmpeg未安装或版本不符合要求: ${checkResult.message}`);
    }

    // 参数解构和验证
    const { videoPath, outputPath, startTime, duration, fps, width } = params;
    if (!videoPath) throw new Error('缺少必要参数: videoPath');
    if (!outputPath) throw new Error('缺少必要参数: outputPath');

    // 构建视频转GIF命令
    let command = `ffmpeg -i "${videoPath}"`;
    if (startTime) command += ` -ss ${startTime}`;
    if (duration) command += ` -t ${duration}`;
    command += ` -vf "fps=${fps || 10},scale=${width || -1}:-1:flags=lanczos"`;
    command += ` -gifflags +transdiff`;
    command += ` "${outputPath}"`;

    // 执行命令
    await this.Tools.executeCommand(command);

    return {
      success: true,
      message: `${description.split(':')[1] || '操作'}完成: ${outputPath}`,
      command,
      outputPath
    };
  } catch (error) {
    throw new Error(`${name.replace('ffmpeg_', '')}失败: ${error.message}`);
  }
};

/**
 * 裁剪视频区域
 * 
 * @param {Object} params.videoPath 输入视频文件路径
 * @param {Object} params.outputPath 输出视频文件路径
 * @param {Object} params.x 起始X坐标（像素）
 * @param {Object} params.y 起始Y坐标（像素）
 * @param {Object} params.width 裁剪宽度（像素）
 * @param {Object} params.height 裁剪高度（像素）
 * @returns {Promise<Object>} 处理结果
 */
functions.ffmpeg_cropVideo = async (params) => {
  try {
    // 检查ffmpeg安装
    const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
    if (!checkResult.installed || !checkResult.versionOk) {
      throw new Error(`FFmpeg未安装或版本不符合要求: ${checkResult.message}`);
    }

    // 参数解构和验证
    const { videoPath, outputPath, x, y, width, height } = params;
    if (!videoPath) throw new Error('缺少必要参数: videoPath');
    if (!outputPath) throw new Error('缺少必要参数: outputPath');
    if (!x) throw new Error('缺少必要参数: x');
    if (!y) throw new Error('缺少必要参数: y');
    if (!width) throw new Error('缺少必要参数: width');
    if (!height) throw new Error('缺少必要参数: height');

    // 构建视频裁剪命令
    const command = `ffmpeg -i "${videoPath}" -vf "crop=${width}:${height}:${x}:${y}" "${outputPath}"`;

    // 执行命令
    await this.Tools.executeCommand(command);

    return {
      success: true,
      message: `${description.split(':')[1] || '操作'}完成: ${outputPath}`,
      command,
      outputPath
    };
  } catch (error) {
    throw new Error(`${name.replace('ffmpeg_', '')}失败: ${error.message}`);
  }
};

/**
 * 旋转视频
 * 
 * @param {Object} params.videoPath 输入视频文件路径
 * @param {Object} params.outputPath 输出视频文件路径
 * @param {Object} params.angle 旋转角度（90, 180, 270, 或 transpose参数）
 * @returns {Promise<Object>} 处理结果
 */
functions.ffmpeg_rotateVideo = async (params) => {
  try {
    // 检查ffmpeg安装
    const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
    if (!checkResult.installed || !checkResult.versionOk) {
      throw new Error(`FFmpeg未安装或版本不符合要求: ${checkResult.message}`);
    }

    // 参数解构和验证
    const { videoPath, outputPath, angle } = params;
    if (!videoPath) throw new Error('缺少必要参数: videoPath');
    if (!outputPath) throw new Error('缺少必要参数: outputPath');
    if (!angle) throw new Error('缺少必要参数: angle');

    // 构建视频旋转命令
    let filter = '';
    if (angle === '90') filter = 'transpose=1';
    else if (angle === '180') filter = 'transpose=2,transpose=2';
    else if (angle === '270') filter = 'transpose=2';
    else if (angle === 'hflip') filter = 'hflip';
    else if (angle === 'vflip') filter = 'vflip';
    else filter = angle; // 允许直接传递filter表达式
    const command = `ffmpeg -i "${videoPath}" -vf "${filter}" "${outputPath}"`;

    // 执行命令
    await this.Tools.executeCommand(command);

    return {
      success: true,
      message: `${description.split(':')[1] || '操作'}完成: ${outputPath}`,
      command,
      outputPath
    };
  } catch (error) {
    throw new Error(`${name.replace('ffmpeg_', '')}失败: ${error.message}`);
  }
};

/**
 * 改变视频播放速度
 * 
 * @param {Object} params.videoPath 输入视频文件路径
 * @param {Object} params.outputPath 输出视频文件路径
 * @param {Object} params.speed 速度倍数（0.5表示慢放一半，2.0表示快放一倍）
 * @returns {Promise<Object>} 处理结果
 */
functions.ffmpeg_changeVideoSpeed = async (params) => {
  try {
    // 检查ffmpeg安装
    const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
    if (!checkResult.installed || !checkResult.versionOk) {
      throw new Error(`FFmpeg未安装或版本不符合要求: ${checkResult.message}`);
    }

    // 参数解构和验证
    const { videoPath, outputPath, speed } = params;
    if (!videoPath) throw new Error('缺少必要参数: videoPath');
    if (!outputPath) throw new Error('缺少必要参数: outputPath');
    if (!speed) throw new Error('缺少必要参数: speed');

    // 构建视频变速命令
    const command = `ffmpeg -i "${videoPath}" -filter_complex "[0:v]setpts=${1/speed}*PTS[v];[0:a]atempo=${speed}[a]" -map "[v]" -map "[a]" "${outputPath}"`;

    // 执行命令
    await this.Tools.executeCommand(command);

    return {
      success: true,
      message: `${description.split(':')[1] || '操作'}完成: ${outputPath}`,
      command,
      outputPath
    };
  } catch (error) {
    throw new Error(`${name.replace('ffmpeg_', '')}失败: ${error.message}`);
  }
};

/**
 * 添加字幕到视频
 * 
 * @param {Object} params.videoPath 输入视频文件路径
 * @param {Object} params.subtitlePath 字幕文件路径（支持srt, ass等格式）
 * @param {Object} params.outputPath 输出视频文件路径
 * @param {Object} params.encoding 字幕编码（默认为UTF-8）（可选）
 * @returns {Promise<Object>} 处理结果
 */
functions.ffmpeg_addSubtitles = async (params) => {
  try {
    // 检查ffmpeg安装
    const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
    if (!checkResult.installed || !checkResult.versionOk) {
      throw new Error(`FFmpeg未安装或版本不符合要求: ${checkResult.message}`);
    }

    // 参数解构和验证
    const { videoPath, subtitlePath, outputPath, encoding } = params;
    if (!videoPath) throw new Error('缺少必要参数: videoPath');
    if (!subtitlePath) throw new Error('缺少必要参数: subtitlePath');
    if (!outputPath) throw new Error('缺少必要参数: outputPath');

    // 构建添加字幕命令
    let command = `ffmpeg -i "${videoPath}"`;
    if (encoding) command += ` -sub_charenc ${encoding}`;
    command += ` -vf "subtitles=${subtitlePath}"`;
    command += ` -c:a copy "${outputPath}"`;

    // 执行命令
    await this.Tools.executeCommand(command);

    return {
      success: true,
      message: `${description.split(':')[1] || '操作'}完成: ${outputPath}`,
      command,
      outputPath
    };
  } catch (error) {
    throw new Error(`${name.replace('ffmpeg_', '')}失败: ${error.message}`);
  }
};

/**
 * 提取视频帧为图片序列
 * 
 * @param {Object} params.videoPath 输入视频文件路径
 * @param {Object} params.outputDir 输出目录路径
 * @param {Object} params.fps 每秒提取帧数（默认为1）（可选）
 * @param {Object} params.format 输出图片格式（jpg, png等，默认为jpg）（可选）
 * @param {Object} params.startTime 开始时间（格式：HH:MM:SS）（可选）
 * @param {Object} params.duration 持续时间（格式：HH:MM:SS）（可选）
 * @returns {Promise<Object>} 处理结果
 */
functions.ffmpeg_extractVideoFrames = async (params) => {
  try {
    // 检查ffmpeg安装
    const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
    if (!checkResult.installed || !checkResult.versionOk) {
      throw new Error(`FFmpeg未安装或版本不符合要求: ${checkResult.message}`);
    }

    // 参数解构和验证
    const { videoPath, outputDir, fps, format, startTime, duration } = params;
    if (!videoPath) throw new Error('缺少必要参数: videoPath');
    if (!outputDir) throw new Error('缺少必要参数: outputDir');

    // 构建提取视频帧命令
    let command = `ffmpeg -i "${videoPath}"`;
    if (startTime) command += ` -ss ${startTime}`;
    if (duration) command += ` -t ${duration}`;
    command += ` -vf "fps=${fps || 1}"`;
    command += ` "${outputDir}/frame_%04d.${format || 'jpg'}"`;

    // 执行命令
    await this.Tools.executeCommand(command);

    return {
      success: true,
      message: `${description.split(':')[1] || '操作'}完成: ${outputPath}`,
      command,
      outputPath
    };
  } catch (error) {
    throw new Error(`${name.replace('ffmpeg_', '')}失败: ${error.message}`);
  }
};

/**
 * 拼接多个视频文件（使用concat demuxer）
 * 
 * @param {Object} params.videoPaths 视频文件路径数组
 * @param {Object} params.outputPath 输出视频文件路径
 * @param {Object} params.transition 转场效果（none, fade等，可选）（可选）
 * @returns {Promise<Object>} 处理结果
 */
functions.ffmpeg_concatVideos = async (params) => {
  try {
    // 检查ffmpeg安装
    const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
    if (!checkResult.installed || !checkResult.versionOk) {
      throw new Error(`FFmpeg未安装或版本不符合要求: ${checkResult.message}`);
    }

    // 参数解构和验证
    const { videoPaths, outputPath, transition } = params;
    if (!videoPaths) throw new Error('缺少必要参数: videoPaths');
    if (!outputPath) throw new Error('缺少必要参数: outputPath');

    // 构建视频拼接命令
    // 创建临时文件列表
    const listPath = `${outputPath}.txt`;
    const listContent = videoPaths.map(path => `file '${path}'`).join('\n');
    await this.Tools.fs.writeFile(listPath, listContent);
    const command = `ffmpeg -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`;

    // 执行命令
    await this.Tools.executeCommand(command);

    return {
      success: true,
      message: `${description.split(':')[1] || '操作'}完成: ${outputPath}`,
      command,
      outputPath
    };
  } catch (error) {
    throw new Error(`${name.replace('ffmpeg_', '')}失败: ${error.message}`);
  }
};

/**
 * 混合多个音频文件
 * 
 * @param {Object} params.audioPaths 音频文件路径数组
 * @param {Object} params.outputPath 输出音频文件路径
 * @param {Object} params.volumes 各音频音量数组（如[1.0, 0.5]）（可选）
 * @returns {Promise<Object>} 处理结果
 */
functions.ffmpeg_mixAudios = async (params) => {
  try {
    // 检查ffmpeg安装
    const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
    if (!checkResult.installed || !checkResult.versionOk) {
      throw new Error(`FFmpeg未安装或版本不符合要求: ${checkResult.message}`);
    }

    // 参数解构和验证
    const { audioPaths, outputPath, volumes } = params;
    if (!audioPaths) throw new Error('缺少必要参数: audioPaths');
    if (!outputPath) throw new Error('缺少必要参数: outputPath');

    // 构建音频混合命令
    const inputs = audioPaths.map((path, i) => `-i "${path}"`).join(' ');
    const mixFilter = audioPaths.map((_, i) => `[${i}:a]`).join('') + `amix=inputs=${audioPaths.length}:duration=longest`;
    const command = `ffmpeg ${inputs} -filter_complex "${mixFilter}" "${outputPath}"`;

    // 执行命令
    await this.Tools.executeCommand(command);

    return {
      success: true,
      message: `${description.split(':')[1] || '操作'}完成: ${outputPath}`,
      command,
      outputPath
    };
  } catch (error) {
    throw new Error(`${name.replace('ffmpeg_', '')}失败: ${error.message}`);
  }
};

/**
 * 压缩视频（调整CRF）
 * 
 * @param {Object} params.videoPath 输入视频文件路径
 * @param {Object} params.outputPath 输出视频文件路径
 * @param {Object} params.crf CRF值（0-51，越小质量越高，默认为23）（可选）
 * @param {Object} params.preset 编码预设（ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow，默认为medium）（可选）
 * @returns {Promise<Object>} 处理结果
 */
functions.ffmpeg_compressVideo = async (params) => {
  try {
    // 检查ffmpeg安装
    const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
    if (!checkResult.installed || !checkResult.versionOk) {
      throw new Error(`FFmpeg未安装或版本不符合要求: ${checkResult.message}`);
    }

    // 参数解构和验证
    const { videoPath, outputPath, crf, preset } = params;
    if (!videoPath) throw new Error('缺少必要参数: videoPath');
    if (!outputPath) throw new Error('缺少必要参数: outputPath');

    // 构建视频压缩命令
    const command = `ffmpeg -i "${videoPath}" -c:v libx264 -crf ${crf || 23} -preset ${preset || 'medium'} -c:a copy "${outputPath}"`;

    // 执行命令
    await this.Tools.executeCommand(command);

    return {
      success: true,
      message: `${description.split(':')[1] || '操作'}完成: ${outputPath}`,
      command,
      outputPath
    };
  } catch (error) {
    throw new Error(`${name.replace('ffmpeg_', '')}失败: ${error.message}`);
  }
};

/**
 * 添加文本叠加到视频
 * 
 * @param {Object} params.videoPath 输入视频文件路径
 * @param {Object} params.outputPath 输出视频文件路径
 * @param {Object} params.text 要叠加的文本
 * @param {Object} params.x 文本X坐标（像素）（可选）
 * @param {Object} params.y 文本Y坐标（像素）（可选）
 * @param {Object} params.fontSize 字体大小（默认为24）（可选）
 * @param {Object} params.fontColor 字体颜色（默认为white）（可选）
 * @param {Object} params.startTime 开始显示时间（格式：HH:MM:SS）（可选）
 * @param {Object} params.duration 显示持续时间（格式：HH:MM:SS）（可选）
 * @returns {Promise<Object>} 处理结果
 */
functions.ffmpeg_addTextOverlay = async (params) => {
  try {
    // 检查ffmpeg安装
    const checkResult = await functions.ffmpeg_checkFfmpegInstallation({ minVersion: '7.0.0' });
    if (!checkResult.installed || !checkResult.versionOk) {
      throw new Error(`FFmpeg未安装或版本不符合要求: ${checkResult.message}`);
    }

    // 参数解构和验证
    const { videoPath, outputPath, text, x, y, fontSize, fontColor, startTime, duration } = params;
    if (!videoPath) throw new Error('缺少必要参数: videoPath');
    if (!outputPath) throw new Error('缺少必要参数: outputPath');
    if (!text) throw new Error('缺少必要参数: text');

    // 构建添加文本叠加命令
    let filter = `drawtext=text='${text}':x=${x || 10}:y=${y || 10}:fontsize=${fontSize || 24}:fontcolor=${fontColor || 'white'}`;
    if (startTime) filter += `:enable='between(t,${startTime},${duration ? `${startTime}+${duration}` : '9999'})'`;
    const command = `ffmpeg -i "${videoPath}" -vf "${filter}" "${outputPath}"`;

    // 执行命令
    await this.Tools.executeCommand(command);

    return {
      success: true,
      message: `${description.split(':')[1] || '操作'}完成: ${outputPath}`,
      command,
      outputPath
    };
  } catch (error) {
    throw new Error(`${name.replace('ffmpeg_', '')}失败: ${error.message}`);
  }
};



// ============ 模块导出 ============
module.exports = functions

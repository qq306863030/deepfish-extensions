/**
 * video-extract.js - 视频处理脚本
 * 提取视频音频轨道并调用转录和总结功能
 */

const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const { transcribe } = require('./transcribe');
const { summarize } = require('./summarize');

/**
 * 标准化结果格式
 */
function createResult(success, data, error = null) {
  return { success, data, error, timestamp: new Date().toISOString() };
}

/**
 * 校验输入参数
 */
function validateInput(videoPath) {
  const errors = [];
  
  if (!videoPath || typeof videoPath !== 'string') {
    errors.push('videoPath 必须是非空字符串');
  } else if (!fs.existsSync(videoPath)) {
    errors.push(`文件不存在: ${videoPath}`);
  } else {
    const ext = path.extname(videoPath).toLowerCase();
    const supportedExts = ['.mp4', '.avi', '.mkv', '.mov', '.webm', '.flv'];
    if (!supportedExts.includes(ext)) {
      errors.push(`不支持的视频格式: ${ext}，支持的格式: ${supportedExts.join(', ')}`);
    }
  }
  
  return errors;
}

/**
 * 获取视频信息
 */
async function getVideoInfo(videoPath) {
  const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
  const command = `${ffprobePath} -v quiet -print_format json -show_format -show_streams \"${videoPath}\"`;
  
  try {
    const { stdout } = await execPromise(command);
    return JSON.parse(stdout);
  } catch (err) {
    return null;
  }
}

/**
 * 从视频中提取音频
 * @param {string} videoPath - 视频文件路径
 * @param {object} options - 配置选项
 * @param {string} options.outputPath - 输出音频路径（默认自动生成）
 * @param {string} options.format - 音频格式 (mp3/wav/flac)
 * @param {string} options.quality - 音频质量 (low/medium/high)
 * @returns {object} 标准化结果
 */
async function extractAudio(videoPath, options = {}) {
  try {
    const validationErrors = validateInput(videoPath);
    if (validationErrors.length > 0) {
      return createResult(false, null, validationErrors.join('; '));
    }
    
    const {
      format = 'mp3',
      quality = 'medium',
      outputPath = null
    } = options;
    
    const outputDir = path.dirname(videoPath);
    const baseName = path.basename(videoPath, path.extname(videoPath));
    // 优化临时文件命名
    const finalOutputPath = outputPath || path.join(outputDir, `tmp_audio_${baseName}_${Date.now()}.${format}`);
    
    const bitrates = { low: '64k', medium: '128k', high: '192k' };
    const bitrate = bitrates[quality] || '128k';
    
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    const command = `${ffmpegPath} -i \"${videoPath}\" -vn -acodec ${format === 'mp3' ? 'libmp3lame' : format === 'flac' ? 'flac' : 'pcm_s16le'} -b:a ${bitrate} -y \"${finalOutputPath}\"`;
    
    await execPromise(command);
    
    if (fs.existsSync(finalOutputPath)) {
      const stats = fs.statSync(finalOutputPath);
      return createResult(true, {
        audioPath: finalOutputPath,
        format,
        size: stats.size,
        isTemporary: !outputPath
      });
    }
    
    return createResult(false, null, '音频提取失败，未生成输出文件');
    
  } catch (err) {
    return createResult(false, null, `音频提取失败: ${err.message}`);
  }
}

/**
 * 处理视频：提取音频 -> 转录 -> 总结
 * @param {string} videoPath - 视频文件路径
 * @param {object} options - 配置选项
 * @param {boolean} options.extractAudioOnly - 仅提取音频
 * @param {boolean} options.transcribeOnly - 仅转录
 * @param {boolean} options.skipSummary - 跳过总结
 * @param {object} options.transcribeOptions - 转录选项
 * @param {object} options.summaryOptions - 总结选项（需包含 prompt）
 * @param {object} options.audioOptions - 音频选项
 * @returns {object} 标准化结果
 */
async function processVideo(videoPath, options = {}) {
  let tempTranscriptPath = null;
  let tempAudioPath = null;
  
  try {
    const validationErrors = validateInput(videoPath);
    if (validationErrors.length > 0) {
      return createResult(false, null, validationErrors.join('; '));
    }
    
    const {
      extractAudioOnly = false,
      transcribeOnly = false,
      skipSummary = false,
      transcribeOptions = {},
      summaryOptions = {},
      audioOptions = {}
    } = options;
    
    const result = {
      videoPath,
      steps: []
    };
    
    // 步骤1：提取音频
    const audioResult = await extractAudio(videoPath, audioOptions);
    result.steps.push({ step: 'extract_audio', ...audioResult });
    
    if (!audioResult.success) {
      return createResult(false, result, '音频提取失败');
    }
    
    tempAudioPath = audioResult.data.audioPath;
    
    if (extractAudioOnly) {
      return createResult(true, result);
    }
    
    // 步骤2：转录
    const transcriptResult = await transcribe(tempAudioPath, transcribeOptions);
    result.steps.push({ step: 'transcribe', ...transcriptResult });
    
    if (!transcriptResult.success) {
      return createResult(false, result, '转录失败');
    }
    
    result.transcript = transcriptResult.data;
    
    if (transcribeOnly || skipSummary) {
      return createResult(true, result);
    }
    
    // 步骤3：总结（需要先将转录文本保存为文件）
    if (!summaryOptions.prompt) {
      return createResult(false, result, '总结功能需要提供 prompt 参数');
    }
    
    // 创建临时转录文本文件
    const outputDir = path.dirname(videoPath);
    const baseName = path.basename(videoPath, path.extname(videoPath));
    tempTranscriptPath = path.join(outputDir, `tmp_transcript_${baseName}_${Date.now()}.txt`);
    fs.writeFileSync(tempTranscriptPath, transcriptResult.data.text || transcriptResult.data.output || '', 'utf-8');
    
    const summaryResult = await summarize(tempTranscriptPath, summaryOptions.prompt, {
      outputPath: summaryOptions.outputPath
    });
    result.steps.push({ step: 'summarize', ...summaryResult });
    
    if (summaryResult.success) {
      result.summary = summaryResult.data;
    }
    
    return createResult(true, result);
    
  } catch (err) {
    return createResult(false, null, `视频处理失败: ${err.message}`);
  } finally {
    // 清理临时文件
    if (tempAudioPath && fs.existsSync(tempAudioPath)) {
      try { fs.unlinkSync(tempAudioPath); } catch (e) { /* ignore */ }
    }
    if (tempTranscriptPath && fs.existsSync(tempTranscriptPath)) {
      try { fs.unlinkSync(tempTranscriptPath); } catch (e) { /* ignore */ }
    }
  }
}

/**
 * 批量处理视频
 */
async function processBatch(videoPaths, options = {}) {
  const results = [];
  for (const videoPath of videoPaths) {
    const result = await processVideo(videoPath, options);
    results.push({ video: videoPath, ...result });
  }
  return createResult(true, results);
}

/**
 * 清理临时文件
 */
function cleanupTempFiles(pattern = 'tmp_audio_*') {
  const tempDir = process.cwd();
  const files = fs.readdirSync(tempDir);
  const deleted = [];
  
  for (const file of files) {
    if (file.startsWith('tmp_audio_') || file.startsWith('tmp_transcript_')) {
      const filePath = path.join(tempDir, file);
      try {
        fs.unlinkSync(filePath);
        deleted.push(filePath);
      } catch (e) { /* ignore */ }
    }
  }
  
  return deleted;
}

module.exports = {
  processVideo,
  processBatch,
  extractAudio,
  getVideoInfo,
  cleanupTempFiles,
  validateInput,
  createResult
};

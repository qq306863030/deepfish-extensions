/**
 * transcribe.js - 音频转文字脚本
 * 使用 FFmpeg whisper 滤镜实现音频文件转文字转录
 * 集成 modelManager 实现模型自动检查与下载
 */

const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const modelManager = require('./modelManager');

/**
 * 标准化结果格式
 */
function createResult(success, data, error = null) {
  return { success, data, error, timestamp: new Date().toISOString() };
}

/**
 * 校验输入参数
 */
function validateInput(filePath, options = {}) {
  const errors = [];
  
  if (!filePath || typeof filePath !== 'string') {
    errors.push('filePath 必须是非空字符串');
  } else if (!fs.existsSync(filePath)) {
    errors.push(`文件不存在: ${filePath}`);
  } else {
    const ext = path.extname(filePath).toLowerCase();
    const supportedExts = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac', '.mp4', '.webm', '.mkv', '.avi'];
    if (!supportedExts.includes(ext)) {
      errors.push(`不支持的格式: ${ext}，支持的格式: ${supportedExts.join(', ')}`);
    }
  }
  
  if (options.language && typeof options.language !== 'string') {
    errors.push('language 必须是字符串');
  }
  
  if (options.model && typeof options.model !== 'string') {
    errors.push('model 必须是字符串');
  }
  
  return errors;
}

/**
 * 提取音频（如果是视频文件）
 */
async function extractAudio(videoPath, outputAudioPath) {
  const cmd = `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 -y "${outputAudioPath}"`;
  try {
    await execPromise(cmd);
    return fs.existsSync(outputAudioPath);
  } catch (err) {
    throw new Error(`音频提取失败: ${err.message}`);
  }
}

/**
 * 执行音频转录
 * @param {string} filePath - 音频/视频文件路径
 * @param {object} options - 配置选项
 * @param {string} options.language - 语言代码 (默认: zh)
 * @param {string} options.model - 模型名称 (默认: base)
 * @param {string} options.skillDir - Skill 根目录（用于查找模型）
 * @param {string} options.outputFormat - 输出格式 (txt/srt/vtt, 默认: txt)
 * @returns {object} 标准化结果
 */
async function transcribe(filePath, options = {}) {
  try {
    // 参数校验
    const validationErrors = validateInput(filePath, options);
    if (validationErrors.length > 0) {
      return createResult(false, null, validationErrors.join('; '));
    }
    
    const { 
      language = 'zh', 
      model = 'base', 
      skillDir = path.resolve(__dirname, '..'),
      outputFormat = 'txt'
    } = options;
    
    // 1. 确保模型可用
    const modelResult = await modelManager.ensureModel(model, skillDir, true);
    if (!modelResult.success) {
      return createResult(false, null, `模型准备失败: ${modelResult.message}`);
    }
    
    let audioPath = filePath;
    const ext = path.extname(filePath).toLowerCase();
    const isVideo = ['.mp4', '.webm', '.mkv', '.avi', '.mov'].includes(ext);
    
    // 2. 如果是视频，先提取音频
    if (isVideo) {
      const tempDir = path.join(skillDir, 'tmp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      audioPath = path.join(tempDir, `tmp_audio_${Date.now()}.wav`);
      await extractAudio(filePath, audioPath);
    }
    
    // 3. 执行转录
    const result = await transcribeWithFFmpeg(audioPath, modelResult.path, language, outputFormat);
    
    // 清理临时音频
    if (isVideo && fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
    
    if (result.success) {
      return createResult(true, {
        text: result.data.text,
        filePath: result.data.outputPath,
        language: language,
        model: model
      });
    }
    
    return createResult(false, null, result.error);
    
  } catch (err) {
    return createResult(false, null, `转录失败: ${err.message}`);
  }
}

/**
 * 使用 FFmpeg whisper 滤镜进行转录
 * 修复 Windows 路径冒号解析问题：使用相对路径替代绝对路径
 */
async function transcribeWithFFmpeg(audioPath, modelPath, language, outputFormat) {
  const audioDir = path.dirname(audioPath);
  const audioBase = path.basename(audioPath);
  const outputBase = path.join(audioDir, `transcript_${Date.now()}`);
  
  // 映射输出格式：txt/vtt -> text, srt -> srt
  const ffmpegFormat = (outputFormat === 'srt') ? 'srt' : 'text';
  const outputPath = `${outputBase}.${outputFormat === 'vtt' ? 'txt' : outputFormat}`;
  
  // 计算相对路径以避免 Windows 盘符冒号问题
  let relModelPath = path.relative(audioDir, modelPath).replace(/\\/g, '/');
  let relOutputPath = path.relative(audioDir, outputPath).replace(/\\/g, '/');
  let relAudioPath = path.relative(audioDir, audioPath).replace(/\\/g, '/') || `./${audioBase}`;
  
  // 如果相对路径以 .. 开头或跨盘符，回退到复制模型到当前目录
  if (relModelPath.startsWith('..') || path.parse(modelPath).root !== path.parse(audioPath).root) {
    const localModelName = path.basename(modelPath);
    const localModelPath = path.join(audioDir, localModelName);
    if (!fs.existsSync(localModelPath)) {
      fs.copyFileSync(modelPath, localModelPath);
    }
    relModelPath = `./${localModelName}`;
  }
  
  // FFmpeg whisper 滤镜参数（使用相对路径，无需转义冒号）
  const filterArgs = `whisper=model=${relModelPath}:language=${language}:destination=${relOutputPath}:format=${ffmpegFormat}`;
  
  // whisper 滤镜是 pass-through 滤镜，需要使用 -f null - 丢弃音频输出
  const cmd = `ffmpeg -i "${relAudioPath}" -af "${filterArgs}" -f null -`;
  
  // 记录命令用于调试
  fs.appendFileSync(path.join(audioDir, 'tmp_ffmpeg_cmd.log'), `${new Date().toISOString()} CMD: ${cmd}\n`);

  try {
    // 设置较长超时时间以适应大文件，切换工作目录执行
    const { stdout, stderr } = await execPromise(cmd, { 
      timeout: 2 * 60 * 60 * 1000,
      cwd: audioDir 
    });
    
    if (fs.existsSync(outputPath)) {
      const text = fs.readFileSync(outputPath, 'utf-8');
      return { 
        success: true, 
        data: { 
          text: text,
          outputPath: outputPath
        } 
      };
    }
    
    return { success: false, error: '转录输出文件未生成' };
  } catch (err) {
    const errorMsg = err.stderr || err.message;
    return { success: false, error: `FFmpeg 转录失败: ${errorMsg}` };
  }
}

/**
 * 批量转录
 */
async function transcribeBatch(filePaths, options = {}) {
  const results = [];
  
  for (const filePath of filePaths) {
    const result = await transcribe(filePath, options);
    results.push({ file: filePath, ...result });
  }
  
  return createResult(true, results);
}

module.exports = {
  transcribe,
  transcribeBatch,
  validateInput,
  createResult,
  extractAudio
};
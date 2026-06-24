/**
 * modelManager.js - Whisper 模型管理模块
 * 负责检查、下载和管理 FFmpeg whisper 滤镜所需的模型文件
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// 默认模型配置
const DEFAULT_MODELS = {
  'tiny': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    filename: 'ggml-tiny.bin',
    size: '75 MB'
  },
  'base': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    filename: 'ggml-base.bin',
    size: '142 MB'
  },
  'small': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    filename: 'ggml-small.bin',
    size: '466 MB'
  },
  'medium': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
    filename: 'ggml-medium.bin',
    size: '1.5 GB'
  },
  'large': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin',
    filename: 'ggml-large-v3.bin',
    size: '3.1 GB'
  }
};

/**
 * 获取模型目录路径
 * 优先使用 SKILL 目录下的 assets/models，其次使用当前工作目录
 */
function getModelDir(skillDir) {
  const modelDir = path.join(skillDir || path.resolve(__dirname, '..'), 'assets', 'models');
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }
  return modelDir;
}

/**
 * 检查指定模型是否存在
 * @param {string} modelName - 模型名称 (tiny/base/small/medium/large)
 * @param {string} skillDir - Skill 根目录
 * @returns {object} { exists: boolean, path: string }
 */
function checkModel(modelName, skillDir) {
  const modelConfig = DEFAULT_MODELS[modelName];
  if (!modelConfig) {
    return { exists: false, path: null, error: `未知模型: ${modelName}` };
  }
  
  const modelDir = getModelDir(skillDir);
  const modelPath = path.join(modelDir, modelConfig.filename);
  
  return {
    exists: fs.existsSync(modelPath),
    path: modelPath,
    size: modelConfig.size
  };
}

/**
 * 检查所有可用模型
 * @param {string} skillDir - Skill 根目录
 * @returns {object} 各模型状态
 */
function checkAllModels(skillDir) {
  const results = {};
  for (const [name, config] of Object.entries(DEFAULT_MODELS)) {
    results[name] = checkModel(name, skillDir);
  }
  return results;
}

/**
 * 下载指定模型
 * @param {string} modelName - 模型名称
 * @param {string} skillDir - Skill 根目录
 * @param {function} onProgress - 进度回调 (可选)
 * @returns {Promise<object>} 下载结果
 */
async function downloadModel(modelName, skillDir, onProgress = null) {
  const modelConfig = DEFAULT_MODELS[modelName];
  if (!modelConfig) {
    throw new Error(`未知模型: ${modelName}`);
  }
  
  const modelDir = getModelDir(skillDir);
  const modelPath = path.join(modelDir, modelConfig.filename);
  const tempPath = modelPath + '.tmp';
  
  // 如果已存在，直接返回
  if (fs.existsSync(modelPath)) {
    return { success: true, path: modelPath, message: '模型已存在' };
  }
  
  console.log(`开始下载模型 ${modelName} (${modelConfig.size})...`);
  console.log(`下载地址: ${modelConfig.url}`);
  
  // 使用 curl 或 wget 下载
  const isWindows = process.platform === 'win32';
  let downloadCmd;
  
  if (isWindows) {
    // Windows 使用 PowerShell 或 curl
    downloadCmd = `curl -L -o "${tempPath}" "${modelConfig.url}"`;
  } else {
    downloadCmd = `wget -O "${tempPath}" "${modelConfig.url}" || curl -L -o "${tempPath}" "${modelConfig.url}"`;
  }
  
  try {
    const { stdout, stderr } = await execPromise(downloadCmd);
    
    // 下载完成后重命名
    if (fs.existsSync(tempPath)) {
      fs.renameSync(tempPath, modelPath);
      console.log(`模型下载完成: ${modelPath}`);
      return { success: true, path: modelPath, message: '下载成功' };
    } else {
      throw new Error('下载文件未找到');
    }
  } catch (err) {
    // 清理临时文件
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw new Error(`模型下载失败: ${err.message}`);
  }
}

/**
 * 确保模型可用（检查+自动下载）
 * @param {string} modelName - 模型名称
 * @param {string} skillDir - Skill 根目录
 * @param {boolean} autoDownload - 是否自动下载（默认 true）
 * @returns {Promise<object>} 模型路径信息
 */
async function ensureModel(modelName, skillDir, autoDownload = true) {
  const checkResult = checkModel(modelName, skillDir);
  
  if (checkResult.exists) {
    return { success: true, path: checkResult.path, message: '模型已就绪' };
  }
  
  if (!autoDownload) {
    return { success: false, path: null, message: `模型 ${modelName} 不存在，且未启用自动下载` };
  }
  
  try {
    return await downloadModel(modelName, skillDir);
  } catch (err) {
    return { success: false, path: null, message: err.message };
  }
}

module.exports = {
  DEFAULT_MODELS,
  getModelDir,
  checkModel,
  checkAllModels,
  downloadModel,
  ensureModel
};

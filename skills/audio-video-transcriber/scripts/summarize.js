/**
 * summarize.js - 内容总结脚本（优化版）
 * 功能：读取音视频提取的文本文件，使用子agent进行总结，输出markdown文件
 */

const fs = require('fs');
const path = require('path');

/**
 * 标准化结果格式
 */
function createResult(success, data, error = null) {
  return { success, data, error, timestamp: new Date().toISOString() };
}

/**
 * 校验输入参数
 */
function validateInput(textFilePath, prompt) {
  const errors = [];
  
  if (!textFilePath || typeof textFilePath !== 'string') {
    errors.push('textFilePath 必须是非空字符串');
  } else if (!fs.existsSync(textFilePath)) {
    errors.push(`文本文件不存在: ${textFilePath}`);
  }
  
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    errors.push('prompt 必须是非空字符串');
  }
  
  return errors;
}

/**
 * 总结音视频文本内容
 * @param {string} textFilePath - 音视频提取的文本文件路径
 * @param {string} prompt - 总结提示词
 * @param {object} options - 配置选项
 * @param {string} options.outputPath - 输出markdown文件路径（可选，默认与输入文件同目录）
 * @returns {object} 标准化结果
 */
async function summarize(textFilePath, prompt, options = {}) {
  try {
    // 校验输入
    const validationErrors = validateInput(textFilePath, prompt);
    if (validationErrors.length > 0) {
      return createResult(false, null, validationErrors.join('; '));
    }
    
    // 读取文本文件内容
    const textContent = fs.readFileSync(textFilePath, 'utf-8');
    
    // 确定输出路径
    const outputPath = options.outputPath || generateOutputPath(textFilePath);
    
    // 构建子agent的工作目标
    const workGoal = buildWorkGoal(textContent, prompt, outputPath);
    
    // 创建子agent执行总结任务
    const result = await executeSubAgent(workGoal);
    
    if (result && result.success) {
      return createResult(true, {
        outputPath: outputPath,
        message: '总结完成，markdown文件已生成'
      });
    } else {
      return createResult(false, null, result?.error || '子agent执行失败');
    }
    
  } catch (err) {
    return createResult(false, null, `总结失败: ${err.message}`);
  }
}

/**
 * 生成输出文件路径
 */
function generateOutputPath(inputPath) {
  const dir = path.dirname(inputPath);
  const baseName = path.basename(inputPath, path.extname(inputPath));
  return path.join(dir, `${baseName}_summary.md`);
}

/**
 * 构建子agent工作目标
 */
function buildWorkGoal(textContent, prompt, outputPath) {
  return `你是一个专业的内容总结助手。请根据以下要求完成任务：

1. 阅读以下从音视频中提取的文本内容
2. 根据用户提供的提示词进行总结
3. 将总结结果输出为markdown格式文件

---
用户提示词：${prompt}
---

待总结的文本内容：
${textContent.substring(0, 50000)}

请将总结结果写入文件：${outputPath}
要求：
- 使用markdown格式
- 结构清晰，包含标题、要点列表等
- 内容准确概括原文核心信息
- 文件写入成功后返回成功信息`;
}

/**
 * 执行子agent
 */
async function executeSubAgent(workGoal) {
  // 由于这是在Skill脚本中执行，需要通过全局Tools访问
  if (typeof this.Tools !== 'undefined' && this.Tools.createSubAgent) {
    return await this.Tools.createSubAgent(workGoal);
  }
  return { success: false, error: '无法创建子agent，请确保在DeepFish环境中运行' };
}

/**
 * 批量总结（可选功能）
 */
async function summarizeBatch(fileConfigs, options = {}) {
  const results = [];
  for (const config of fileConfigs) {
    const result = await summarize(config.textFilePath, config.prompt, {
      ...options,
      outputPath: config.outputPath
    });
    results.push(result);
  }
  return createResult(true, results);
}

module.exports = {
  summarize,
  summarizeBatch,
  validateInput,
  createResult
};

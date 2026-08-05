#!/usr/bin/env node
/**
 * recognize-image.js - GLM-4.6V-Flash 图像识别 CLI 工具
 *
 * 功能：调用智谱 GLM-4.6V-Flash 免费视觉模型，对本地图片进行识别，
 *       传入【提示词】+【本地图片绝对路径】，输出识别结果。
 *
 * 用法：
 *   node recognize-image.js <图片路径> <提示词> [选项]
 *
 * 依赖：Node.js 18+（内置全局 fetch），无需安装任何第三方 npm 包
 *
 * 配置：API Key 通过环境变量 ZHIPU_API_KEY 或 --api-key 参数提供
 */

'use strict';

const fs = require('fs');
const path = require('path');

const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const DEFAULT_MODEL = 'glm-4.6v-flash';

/**
 * 打印帮助信息
 */
function printUsage() {
  console.log(`
GLM-4.6V-Flash 图像识别 CLI 工具
================================

用法:
  node recognize-image.js <图片路径> <提示词> [选项]

必填参数:
  图片路径        本地图片文件的绝对路径或相对路径（支持 jpg/png/webp/bmp/gif 等）
  提示词          要对图片执行的识别指令，如 "描述这张图片的内容"

选项:
  --api-key <key>   智谱 API Key（优先级高于环境变量 ZHIPU_API_KEY）
  --model <model>   指定模型名称，默认 ${DEFAULT_MODEL}
  --thinking        开启思考模式（模型先深度推理再回答）
  --json            以 JSON 格式输出 API 完整响应
  -h, --help        显示本帮助

环境变量:
  ZHIPU_API_KEY     智谱开放平台 API Key（https://bigmodel.cn 控制台获取）

示例:
  node recognize-image.js C:/pics/cat.jpg "这张图片里有什么动物？"
  node recognize-image.js ./photo.png "提取图片中的文字" --thinking
  node recognize-image.js a.jpg "识别图中物体并给出位置" --api-key your_key_here
`);
}

/**
 * 解析命令行参数
 * @param {string[]} argv 命令行参数数组
 * @returns {object} 解析后的参数对象
 */
function parseArgs(argv) {
  const opts = { thinking: false, json: false, help: false };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      opts.help = true;
    } else if (arg === '--api-key') {
      opts.apiKey = argv[++i];
    } else if (arg === '--model') {
      opts.model = argv[++i];
    } else if (arg === '--thinking') {
      opts.thinking = true;
    } else if (arg === '--json') {
      opts.json = true;
    } else if (arg.startsWith('--api-key=')) {
      opts.apiKey = arg.split('=')[1];
    } else if (arg.startsWith('--model=')) {
      opts.model = arg.split('=')[1];
    } else {
      positional.push(arg);
    }
  }
  opts.imagePath = positional[0];
  opts.prompt = positional.slice(1).join(' ');
  return opts;
}

/**
 * 根据文件扩展名推断 MIME 类型
 * @param {string} filePath 文件路径
 * @returns {string} MIME 类型
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
  };
  return map[ext] || 'image/jpeg';
}

/**
 * 读取本地图片并转换为 base64 Data URL
 * @param {string} filePath 本地图片绝对路径
 * @returns {string} data:image/xxx;base64,.... 格式的图片 URL
 */
function fileToBase64DataUrl(filePath) {
  const mime = getMimeType(filePath);
  const data = fs.readFileSync(filePath);
  const b64 = data.toString('base64');
  return `data:${mime};base64,${b64}`;
}

/**
 * 调用智谱 GLM-4.6V-Flash API 进行图像识别
 * @param {object} opts 参数对象
 * @returns {Promise<object>} API 响应 JSON
 */
async function recognize(opts) {
  const apiKey = opts.apiKey || process.env.ZHIPU_API_KEY;
  if (!apiKey) {
    throw new Error('未找到 API Key：请通过 --api-key 参数或设置环境变量 ZHIPU_API_KEY');
  }

  const imageUrl = fileToBase64DataUrl(opts.imagePath);
  const body = {
    model: opts.model || DEFAULT_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl } },
          { type: 'text', text: opts.prompt || '请描述这张图片的内容' },
        ],
      },
    ],
  };

  // GLM-4.6V-Flash 支持思考模式开关
  if (opts.thinking) {
    body.thinking = { type: 'enabled' };
  }

  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  if (!resp.ok) {
    const errMsg = data.error && data.error.message ? data.error.message : JSON.stringify(data);
    throw new Error(`API 调用失败 (HTTP ${resp.status})：${errMsg}`);
  }
  return data;
}

/**
 * 程序主入口
 */
async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    printUsage();
    return 0;
  }
  if (!opts.imagePath) {
    console.error('错误：缺少图片路径参数');
    printUsage();
    return 1;
  }
  if (!opts.prompt) {
    console.error('错误：缺少提示词参数');
    printUsage();
    return 1;
  }
  if (!fs.existsSync(opts.imagePath)) {
    console.error(`错误：文件不存在：${opts.imagePath}`);
    return 1;
  }

  try {
    const data = await recognize(opts);
    const message = data.choices && data.choices[0] && data.choices[0].message;
    const content = (message && message.content) || '';
    const reasoning = (message && message.reasoning_content) || '';

    if (opts.json) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      if (reasoning) {
        console.log(`【思考过程】\n${reasoning}\n`);
      }
      console.log(content || '（模型未返回内容）');
    }
    return 0;
  } catch (err) {
    console.error(`错误：${err.message}`);
    return 1;
  }
}

main().then((code) => process.exit(code));

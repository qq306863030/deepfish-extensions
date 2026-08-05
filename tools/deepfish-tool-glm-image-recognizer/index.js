/**
 * deepfish-tool-glm-image-recognizer
 *
 * 使用智谱 GLM-4.6V-Flash 免费视觉模型进行图像识别的 Deepfish 自定义工具。
 *
 * 功能：
 *   - 输入本地图片文件的绝对路径 + 提示词，返回模型识别结果
 *   - 自动检查 API Key（环境变量 ZHIPU_API_KEY → 本地配置文件 → 控制台交互输入）
 *   - 若控制台交互输入，则自动缓存到本地配置文件供下次直接使用
 *
 * 依赖：Node.js 18+（内置全局 fetch），无需第三方 npm 包。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const MODEL_NAME = 'glm-4.6v-flash';

// 重试配置：GLM 免费模型访问量过大时（429/5xx/网络异常）自动重试
const RETRY_MAX = 5; // 最多重试次数
const RETRY_DELAY_MS = 2000; // 每次重试间隔（毫秒）

// 不可重试的 HTTP 状态码（重试也没用，直接报错）：400 参数错误、401 未认证、403 无权限、404 不存在
const NON_RETRYABLE_STATUS = new Set([400, 401, 403, 404]);

/**
 * 延时等待
 * @param {number} ms 毫秒
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 判断某次失败是否值得重试
 * @param {number|null} status HTTP 状态码，网络异常时为 null
 * @returns {boolean} true 表示值得重试
 */
function isRetryable(status) {
  // 网络异常（fetch 抛错）或 429（访问量过大）/5xx（服务端错误）都值得重试
  if (status === null) return true;
  if (status === 429) return true;
  if (status >= 500) return true;
  return false;
}

// API Key 本地缓存文件路径（交互输入后保存，避免每次重复输入）
const KEY_STORE_PATH = path.join(os.homedir(), '.deepfish-ai', 'external-tools', 'glm-image-recognizer-key.json');

/**
 * 根据文件扩展名推断 MIME 类型
 * @param {string} filePath 图片文件路径
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
 * 从本地缓存文件读取 API Key
 * @returns {string|null} API Key 或 null
 */
function getApiKeyFromStore() {
  try {
    if (fs.existsSync(KEY_STORE_PATH)) {
      const data = JSON.parse(fs.readFileSync(KEY_STORE_PATH, 'utf-8'));
      return data.apiKey || null;
    }
  } catch (err) {
    /* 缓存文件损坏时忽略，走交互输入流程 */
  }
  return null;
}

/**
 * 保存 API Key 到本地缓存文件
 * @param {string} apiKey 智谱 API Key
 */
function saveApiKeyToStore(apiKey) {
  try {
    fs.mkdirSync(path.dirname(KEY_STORE_PATH), { recursive: true });
    fs.writeFileSync(KEY_STORE_PATH, JSON.stringify({ apiKey }, null, 2), 'utf-8');
  } catch (err) {
    /* 保存失败不阻塞主流程 */
  }
}

/**
 * 在控制台以交互方式让用户输入 API Key
 * @returns {Promise<string>} 用户输入的 API Key
 */
function askForApiKey() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('未检测到 ZHIPU_API_KEY，请输入智谱开放平台 API Key（https://bigmodel.cn 控制台获取）: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * 获取可用的 API Key（环境变量 → 本地缓存 → 交互输入）
 * @returns {Promise<{ success: boolean, apiKey?: string, error?: string }>}
 */
async function resolveApiKey() {
  // 1. 优先使用环境变量
  if (process.env.ZHIPU_API_KEY) {
    return { success: true, apiKey: process.env.ZHIPU_API_KEY };
  }
  // 2. 读取本地缓存
  const stored = getApiKeyFromStore();
  if (stored) {
    return { success: true, apiKey: stored };
  }
  // 3. 控制台交互输入（要求运行在 TTY 终端环境）
  if (!process.stdin.isTTY) {
    return {
      success: false,
      error: '未配置 ZHIPU_API_KEY，且当前环境不支持交互输入。请先执行 `set ZHIPU_API_KEY=你的KEY`（Linux/Mac 用 export）设置环境变量后重试。',
    };
  }
  const apiKey = await askForApiKey();
  if (!apiKey) {
    return { success: false, error: '未输入 API Key，无法调用图像识别服务。' };
  }
  saveApiKeyToStore(apiKey);
  return { success: true, apiKey };
}

/**
 * 调用智谱 GLM-4.6V-Flash API（单次调用，不含重试）
 * @param {string} apiKey 智谱 API Key
 * @param {string} mime 图片 MIME 类型
 * @param {string} base64 图片 base64 内容
 * @param {string} prompt 识别提示词
 * @returns {Promise<{ ok: boolean, status: number|null, data?: any, content?: string, error?: string }>}
 */
async function callGLMAPI(apiKey, mime, base64, prompt) {
  let resp;
  try {
    resp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });
  } catch (err) {
    // 网络异常（超时、连接失败等），status 记为 null，可重试
    return { ok: false, status: null, error: `网络请求异常：${err.message}` };
  }

  const status = resp.status;
  let data;
  try {
    data = await resp.json();
  } catch (err) {
    data = {};
  }

  if (!resp.ok) {
    const msg = (data.error && data.error.message) || JSON.stringify(data);
    return { ok: false, status, error: `GLM-4.6V-Flash API 调用失败 (HTTP ${status})：${msg}` };
  }

  const content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  if (!content) {
    return { ok: false, status, error: '模型未返回识别内容，请重试或调整提示词' };
  }
  return { ok: true, status, content };
}

const functions = {
  /**
   * 使用 GLM-4.6V-Flash 免费视觉模型识别本地图片内容
   * @param {string} imagePath - 本地图片文件的绝对路径（支持 jpg/png/webp/bmp/gif/tiff 等）
   * @param {string} prompt - 图像识别提示词，如"描述这张图片的内容"、"提取图中文字"
   * @returns {Promise<{ success: boolean, data?: string, error?: string }>}
   */
  async recognizeImage(imagePath, prompt) {
    try {
      // 1. 参数校验
      if (!imagePath || typeof imagePath !== 'string') {
        return { success: false, error: '缺少参数 imagePath：请提供本地图片文件的绝对路径' };
      }
      if (!prompt || typeof prompt !== 'string') {
        return { success: false, error: '缺少参数 prompt：请提供图像识别提示词' };
      }

      // 2. 校验图片文件存在
      if (!fs.existsSync(imagePath)) {
        return { success: false, error: `图片文件不存在：${imagePath}` };
      }

      // 3. 获取 API Key
      const keyResult = await resolveApiKey();
      if (!keyResult.success) {
        return { success: false, error: keyResult.error };
      }

      // 4. 读取图片并转 base64 Data URL
      const mime = getMimeType(imagePath);
      const base64 = fs.readFileSync(imagePath).toString('base64');

      // 5. 调用智谱 GLM-4.6V-Flash API（访问量过大/服务端异常时自动重试：间隔2秒，最多重试5次）
      let lastError = null;
      for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
        const result = await callGLMAPI(keyResult.apiKey, mime, base64, prompt);

        if (result.ok) {
          return { success: true, data: result.content };
        }

        lastError = result.error;
        // 不可重试的错误（如 401 认证失败、400 参数错误）直接返回，不浪费重试次数
        if (!isRetryable(result.status)) {
          return { success: false, error: lastError };
        }

        if (attempt < RETRY_MAX) {
          const retryInfo =
            result.status === 429
              ? '访问量过大(429)'
              : result.status >= 500
                ? `服务端错误(${result.status})`
                : '网络异常';
          console.warn(
            `[glm-image-recognizer] ${retryInfo}，${RETRY_DELAY_MS / 1000}秒后进行第 ${attempt + 1}/${RETRY_MAX} 次重试...`
          );
          await sleep(RETRY_DELAY_MS);
        }
      }
      return { success: false, error: `GLM-4.6V-Flash 调用失败，已重试 ${RETRY_MAX} 次仍未成功：${lastError}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};

const descriptions = [
  {
    type: 'function',
    function: {
      name: 'recognizeImage',
      description:
        '使用智谱 GLM-4.6V-Flash 免费视觉模型识别本地图片。传入本地图片的绝对路径和提示词，返回图像识别结果。适用于图片内容描述、OCR 文字提取、图表解读、物体识别等场景。若未配置 ZHIPU_API_KEY，会在控制台交互式引导用户输入。',
      parameters: {
        type: 'object',
        properties: {
          imagePath: {
            type: 'string',
            description: '本地图片文件的绝对路径，例如 C:/Users/xxx/Desktop/photo.png',
          },
          prompt: {
            type: 'string',
            description: '图像识别提示词，例如"描述这张图片的内容"、"提取图片中的所有文字"',
          },
        },
        required: ['imagePath', 'prompt'],
      },
    },
  },
];

module.exports = { functions, descriptions };

/**
 * deepfish-tool-openai-image-recognizer
 *
 * 使用 OpenAI 兼容接口的视觉模型进行图像识别的 Deepfish 自定义工具。
 * 可对接任意 OpenAI 兼容的 Chat Completions 服务（如 one-api、new-api、
 * 各类中转站、本地 vLLM/Ollama 网关等），支持视觉模型图片理解。
 *
 * 功能：
 *   - 输入本地图片文件的绝对路径 + 提示词，返回模型识别结果
 *   - 可配置：url（接口地址）、apiKey（密钥）、model（模型名）
 *   - 配置来源优先级：函数参数 config → 环境变量 → 本地配置文件 → 控制台交互输入
 *   - 若控制台交互输入，则自动缓存到本地配置文件供下次直接使用
 *   - 接口访问量过大/服务端异常时自动重试（间隔2秒，最多5次）
 *
 * 依赖：Node.js 18+（内置全局 fetch），无需第三方 npm 包。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// 本地配置文件路径（保存 url/apiKey/model 配置，避免每次重复输入）
const CONFIG_STORE_PATH = path.join(os.homedir(), '.deepfish-ai', 'external-tools', 'openai-image-recognizer-config.json');

// 重试配置：接口访问量过大时（429/5xx/网络异常）自动重试
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
 * 从本地配置文件读取配置
 * @returns {{ url?: string, apiKey?: string, model?: string }|null}
 */
function getConfigFromStore() {
  try {
    if (fs.existsSync(CONFIG_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_STORE_PATH, 'utf-8'));
    }
  } catch (err) {
    /* 配置文件损坏时忽略 */
  }
  return null;
}

/**
 * 保存配置到本地配置文件
 * @param {{ url?: string, apiKey?: string, model?: string }} config
 */
function saveConfigToStore(config) {
  try {
    fs.mkdirSync(path.dirname(CONFIG_STORE_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_STORE_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    /* 保存失败不阻塞主流程 */
  }
}

/**
 * 拼接完整的 Chat Completions 接口地址
 * 兼容两种情况：传入的是 base url（如 http://host/v1）或完整地址（如 http://host/v1/chat/completions）
 * @param {string} url 用户配置的接口地址
 * @returns {string} 完整的 chat/completions 地址
 */
function buildChatCompletionsUrl(url) {
  const trimmed = url.trim().replace(/\/+$/, ''); // 去掉尾部斜杠
  if (/\/chat\/completions$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}/chat/completions`;
}

/**
 * 在控制台以交互方式让用户输入内容
 * @param {string} question 提示语
 * @returns {Promise<string>} 用户输入的内容（已去除首尾空格）
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * 在控制台交互式询问用户缺失的配置项（url / apiKey / model）
 * @param {string[]} missing 缺失的配置项名称列表
 * @returns {Promise<{ url?: string, apiKey?: string, model?: string }>} 用户补充的配置
 */
async function askForMissingConfig(missing) {
  const answered = {};
  console.warn('[openai-image-recognizer] 检测到配置缺失，请在控制台输入以下信息（输入内容将自动缓存，下次直接复用）：');
  for (const key of missing) {
    if (key === 'url') {
      answered.url = await askQuestion('请输入 OpenAI 兼容接口地址 url（如 http://xxx.com/v1）: ');
    } else if (key === 'apiKey') {
      answered.apiKey = await askQuestion('请输入接口密钥 apiKey（如 sk-123）: ');
    } else if (key === 'model') {
      answered.model = await askQuestion('请输入模型名称 model（如 MiMo_mimo-v2.5）: ');
    }
  }
  return answered;
}

/**
 * 解析并合并配置（优先级：函数参数 config → 环境变量 → 本地配置文件 → 控制台交互输入）
 * @param {{ url?: string, apiKey?: string, model?: string }} [paramConfig] 函数调用时传入的配置
 * @returns {Promise<{ ok: boolean, config?: { url: string, apiKey: string, model: string }, error?: string }>}
 */
async function resolveConfig(paramConfig) {
  const stored = getConfigFromStore() || {};

  // 按优先级合并：函数参数 > 环境变量 > 本地配置文件
  const url =
    (paramConfig && paramConfig.url) ||
    process.env.OPENAI_BASE_URL ||
    stored.url ||
    '';
  const apiKey =
    (paramConfig && paramConfig.apiKey) ||
    process.env.OPENAI_API_KEY ||
    stored.apiKey ||
    '';
  const model =
    (paramConfig && paramConfig.model) ||
    process.env.OPENAI_MODEL ||
    stored.model ||
    '';

  const missing = [];
  if (!url) missing.push('url');
  if (!apiKey) missing.push('apiKey');
  if (!model) missing.push('model');

  let finalUrl = url;
  let finalApiKey = apiKey;
  let finalModel = model;

  // 存在缺失配置时，优先控制台交互输入（要求运行在 TTY 终端环境）
  if (missing.length > 0) {
    if (!process.stdin.isTTY) {
      return {
        ok: false,
        error: `缺少必要配置：${missing.join('、')}，且当前环境不支持交互输入。可通过以下任一方式提供：\n` +
          `  1. 调用时传入 config 参数：{ url, apiKey, model }\n` +
          `  2. 设置环境变量：OPENAI_BASE_URL / OPENAI_API_KEY / OPENAI_MODEL\n` +
          `  3. 编辑本地配置文件：${CONFIG_STORE_PATH}`,
      };
    }
    const answered = await askForMissingConfig(missing);
    if (answered.url) finalUrl = answered.url;
    if (answered.apiKey) finalApiKey = answered.apiKey;
    if (answered.model) finalModel = answered.model;
  }

  // 再次校验（用户可能输入空值）
  const stillMissing = [];
  if (!finalUrl) stillMissing.push('url');
  if (!finalApiKey) stillMissing.push('apiKey');
  if (!finalModel) stillMissing.push('model');
  if (stillMissing.length > 0) {
    return { ok: false, error: `未提供完整配置，缺少：${stillMissing.join('、')}，无法调用图像识别服务。` };
  }

  const resolved = { url: buildChatCompletionsUrl(finalUrl), apiKey: finalApiKey, model: finalModel };

  // 有配置变化时更新本地缓存，便于下次复用
  if (finalUrl !== stored.url || finalApiKey !== stored.apiKey || finalModel !== stored.model) {
    saveConfigToStore({ url: finalUrl, apiKey: finalApiKey, model: finalModel });
  }

  return { ok: true, config: resolved };
}

/**
 * 解析 Chat Completions 响应内容（兼容普通 JSON 与 SSE 流式两种格式）
 * 深度思考型模型可能把内容输出在 reasoning_content 字段，也一并收集
 * @param {string} text 响应体文本
 * @returns {{ content: string, reasoningContent: string }}
 */
function parseChatResponse(text) {
  const trimmed = text.trim();

  // 情况1：SSE 流式响应（data: {...}\n\ndata: {...}）
  if (trimmed.startsWith('data:')) {
    let content = '';
    let reasoningContent = '';
    for (const line of trimmed.split('\n')) {
      const l = line.trim();
      if (!l.startsWith('data:')) continue;
      const payload = l.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const chunk = JSON.parse(payload);
        const delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
        if (delta) {
          if (delta.content) content += delta.content;
          if (delta.reasoning_content) reasoningContent += delta.reasoning_content;
        }
      } catch (e) {
        /* 跳过无法解析的分块 */
      }
    }
    return { content, reasoningContent };
  }

  // 情况2：普通 JSON 响应
  try {
    const data = JSON.parse(trimmed);
    const message = data.choices && data.choices[0] && data.choices[0].message;
    return {
      content: (message && message.content) || '',
      reasoningContent: (message && message.reasoning_content) || '',
    };
  } catch (e) {
    return { content: '', reasoningContent: '' };
  }
}

/**
 * 调用 OpenAI 兼容 Chat Completions API（单次调用，不含重试）
 * @param {{ url: string, apiKey: string, model: string }} config
 * @param {string} mime 图片 MIME 类型
 * @param {string} base64 图片 base64 内容
 * @param {string} prompt 识别提示词
 * @returns {Promise<{ ok: boolean, status: number|null, content?: string, error?: string }>}
 */
async function callOpenAIAPI(config, mime, base64, prompt) {
  let resp;
  try {
    resp = await fetch(config.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        // 不传 stream 参数，兼容只支持 SSE 流式或默认流式的服务
        // 代码已同时兼容普通 JSON 与 SSE 流式两种响应格式
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
  const text = await resp.text();

  if (!resp.ok) {
    // 尝试解析错误信息
    let msg = text;
    try {
      const data = JSON.parse(text);
      msg = (data.error && data.error.message) || JSON.stringify(data);
    } catch (e) {
      /* 非 JSON 错误体，保持原文 */
    }
    return { ok: false, status, error: `OpenAI 兼容接口调用失败 (HTTP ${status})：${msg}` };
  }

  // 解析响应（兼容普通 JSON 与 SSE 流式）；深度思考模型 content 为空时回退用 reasoning_content
  const { content, reasoningContent } = parseChatResponse(text);
  const finalContent = content || reasoningContent;
  if (!finalContent) {
    return { ok: false, status, error: '模型未返回识别内容，请重试或调整提示词' };
  }
  return { ok: true, status, content: finalContent };
}

const functions = {
  /**
   * 使用 OpenAI 兼容接口的视觉模型识别本地图片内容
   * @param {string} imagePath - 本地图片文件的绝对路径（支持 jpg/png/webp/bmp/gif/tiff 等）
   * @param {string} prompt - 图像识别提示词，如"描述这张图片的内容"、"提取图中文字"
   * @param {{ url?: string, apiKey?: string, model?: string }} [config] - 可选配置，覆盖环境变量/本地配置：
   *   url: OpenAI 兼容接口地址，如 http://xxx.com/v1
   *   apiKey: 接口密钥，如 sk-123
   *   model: 模型名称，如 MiMo_mimo-v2.5
   *   若以上均未配置，会在控制台交互式引导用户输入并自动缓存。
   * @returns {Promise<{ success: boolean, data?: string, config?: object, error?: string }>}
   */
  async recognizeImage(imagePath, prompt, config) {
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

      // 3. 解析配置（函数参数 → 环境变量 → 本地配置文件 → 控制台交互输入）
      const cfgResult = await resolveConfig(config);
      if (!cfgResult.ok) {
        return { success: false, error: cfgResult.error };
      }
      const cfg = cfgResult.config;

      // 4. 读取图片并转 base64 Data URL
      const mime = getMimeType(imagePath);
      const base64 = fs.readFileSync(imagePath).toString('base64');

      // 5. 调用 OpenAI 兼容接口（访问量过大/服务端异常时自动重试：间隔2秒，最多重试5次）
      let lastError = null;
      for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
        const result = await callOpenAIAPI(cfg, mime, base64, prompt);

        if (result.ok) {
          return {
            success: true,
            data: result.content,
            config: { url: cfg.url, model: cfg.model },
          };
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
            `[openai-image-recognizer] ${retryInfo}，${RETRY_DELAY_MS / 1000}秒后进行第 ${attempt + 1}/${RETRY_MAX} 次重试...`
          );
          await sleep(RETRY_DELAY_MS);
        }
      }
      return { success: false, error: `OpenAI 兼容接口调用失败，已重试 ${RETRY_MAX} 次仍未成功：${lastError}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /**
   * 查看/修改 OpenAI 图像识别工具的本地配置（url / apiKey / model）
   * 传入要修改的字段即更新并持久化到本地配置文件；不传任何字段则返回当前配置（apiKey 脱敏显示）。
   * @param {{ url?: string, apiKey?: string, model?: string }} [newConfig] - 要更新的配置项，只更新传入的字段：
   *   url: OpenAI 兼容接口地址，如 http://xxx.com/v1
   *   apiKey: 接口密钥，如 sk-123
   *   model: 模型名称，如 MiMo_mimo-v2.5
   * @returns {Promise<{ success: boolean, config?: object, data?: string, error?: string }>}
   */
  async updateConfig(newConfig) {
    try {
      const stored = getConfigFromStore() || {};

      // 传了参数 → 更新配置
      if (newConfig && typeof newConfig === 'object') {
        const updates = {};
        if (newConfig.url !== undefined) {
          if (typeof newConfig.url !== 'string' || !newConfig.url.trim()) {
            return { success: false, error: 'url 必须是非空字符串' };
          }
          updates.url = newConfig.url.trim();
        }
        if (newConfig.apiKey !== undefined) {
          if (typeof newConfig.apiKey !== 'string' || !newConfig.apiKey.trim()) {
            return { success: false, error: 'apiKey 必须是非空字符串' };
          }
          updates.apiKey = newConfig.apiKey.trim();
        }
        if (newConfig.model !== undefined) {
          if (typeof newConfig.model !== 'string' || !newConfig.model.trim()) {
            return { success: false, error: 'model 必须是非空字符串' };
          }
          updates.model = newConfig.model.trim();
        }

        if (Object.keys(updates).length === 0) {
          return { success: false, error: '未提供任何有效配置项，请传入 url / apiKey / model 中至少一项' };
        }

        const merged = { ...stored, ...updates };
        saveConfigToStore(merged);

        return {
          success: true,
          data: `配置已更新：${Object.keys(updates).map((k) => k).join('、')}`,
          config: maskConfig(merged),
        };
      }

      // 未传参数 → 查看当前配置（apiKey 脱敏）
      if (!stored.url && !stored.apiKey && !stored.model) {
        return { success: true, data: '当前未配置任何内容，请调用 updateConfig({ url, apiKey, model }) 或直接调用 recognizeImage 引导输入', config: {} };
      }
      return { success: true, data: '当前配置如下（apiKey 已脱敏）', config: maskConfig(stored) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};

/**
 * 对配置中的 apiKey 做脱敏处理（保留前4后4，中间用 **** 代替），用于展示
 * @param {{ url?: string, apiKey?: string, model?: string }} config
 * @returns {{ url?: string, apiKey?: string, model?: string }}
 */
function maskConfig(config) {
  const masked = { ...config };
  if (masked.apiKey && typeof masked.apiKey === 'string') {
    const key = masked.apiKey;
    masked.apiKey = key.length <= 8 ? '****' : `${key.slice(0, 4)}****${key.slice(-4)}`;
  }
  return masked;
}

const descriptions = [
  {
    type: 'function',
    function: {
      name: 'recognizeImage',
      description:
        '使用 OpenAI 兼容接口的视觉模型识别本地图片。传入本地图片绝对路径和提示词，返回图像识别结果。支持通过 config 参数指定接口地址 url、密钥 apiKey、模型名 model（如 url: http://xxx.com/v1，apiKey: sk-123，model: MiMo_mimo-v2.5），也可通过环境变量 OPENAI_BASE_URL/OPENAI_API_KEY/OPENAI_MODEL 或本地配置文件配置。适用于图片内容描述、OCR 文字提取、图表解读、物体识别等场景。',
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
          config: {
            type: 'object',
            description:
              '可选配置，用于覆盖环境变量/本地配置。包含 url（OpenAI 兼容接口地址，如 http://xxx.com/v1）、apiKey（接口密钥，如 sk-123）、model（模型名称，如 MiMo_mimo-v2.5）',
            properties: {
              url: { type: 'string', description: 'OpenAI 兼容接口地址，例如 http://xxx.com/v1' },
              apiKey: { type: 'string', description: '接口密钥，例如 sk-123' },
              model: { type: 'string', description: '模型名称，例如 MiMo_mimo-v2.5' },
            },
          },
        },
        required: ['imagePath', 'prompt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateConfig',
      description:
        '查看或修改 OpenAI 图像识别工具的本地配置（url 接口地址 / apiKey 密钥 / model 模型名）。传入要修改的字段即更新并持久化保存，如 updateConfig({ url: "http://xxx.com/v1", apiKey: "sk-123", model: "MiMo_mimo-v2.5" })；不传任何字段则返回当前配置（apiKey 脱敏显示）。适用于更换接口地址、密钥或模型名的场景。',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: '要更新的 OpenAI 兼容接口地址，例如 http://xxx.com/v1',
          },
          apiKey: {
            type: 'string',
            description: '要更新的接口密钥，例如 sk-123',
          },
          model: {
            type: 'string',
            description: '要更新的模型名称，例如 MiMo_mimo-v2.5',
          },
        },
      },
    },
  },
];

module.exports = { functions, descriptions };

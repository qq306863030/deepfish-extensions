#!/usr/bin/env node
/**
 * deepseek-vision-mcp
 *
 * 使用 OpenAI 兼容接口的视觉模型进行图像识别的 MCP (Model Context Protocol) Server。
 * 基于 @modelcontextprotocol/server（MCP TypeScript SDK v2）构建，通过 stdio 与 MCP 客户端通信。
 *
 * 可对接任意 OpenAI 兼容的 Chat Completions 服务（如 one-api、new-api、各类 API 中转站、
 * 本地 vLLM/Ollama 网关等），使用其视觉模型进行图片理解。
 *
 * 功能：
 *   - MCP 工具 recognizeImage：输入本地图片文件的绝对路径 + 提示词，返回模型识别结果
 *   - 配置参数（url / apiKey / model）由 MCP 客户端通过环境变量注入，也可通过命令行参数传入：
 *       DEEPSEEK_OPENAI_BASE_URL（回退 OPENAI_BASE_URL）→ 接口地址
 *       DEEPSEEK_OPENAI_API_KEY（回退 OPENAI_API_KEY）  → 接口密钥
 *       DEEPSEEK_OPENAI_MODEL（回退 OPENAI_MODEL）      → 模型名称
 *   - 调用时可通过工具参数 config 临时覆盖（优先级：工具参数 > 命令行参数 > 环境变量）
 *   - 接口访问量过大/服务端异常时自动重试（间隔2秒，最多5次）
 *
 * 注意：MCP stdio 协议下 stdout 只能输出 JSON-RPC 消息，所有日志一律走 stderr。
 *
 * 依赖：Node.js 20+；npm 包 @modelcontextprotocol/server、zod。
 */

'use strict';

import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';

// 重试配置：接口访问量过大时（429/5xx/网络异常）自动重试
const RETRY_MAX = 5; // 最多重试次数
const RETRY_DELAY_MS = 2000; // 每次重试间隔（毫秒）

// 日志统一走 stderr，避免污染 MCP stdio 协议的 stdout 通道
const LOG_PREFIX = '[deepseek-vision-mcp]';
function log(message) {
  process.stderr.write(`${LOG_PREFIX} ${message}\n`);
}

/**
 * 解析命令行参数（--base-url / --api-key / --model）
 * MCP 客户端也可通过 args 配置项传入，作为环境变量的补充
 * @returns {{ baseUrl?: string, apiKey?: string, model?: string }}
 */
function parseCliArgs() {
  const cli = {};
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--base-url' && args[i + 1]) cli.baseUrl = args[++i];
    else if (args[i] === '--api-key' && args[i + 1]) cli.apiKey = args[++i];
    else if (args[i] === '--model' && args[i + 1]) cli.model = args[++i];
  }
  return cli;
}

/**
 * 解析服务级配置（命令行参数 > 环境变量）
 * 环境变量同时兼容 DEEPSEEK_ 前缀与标准 OPENAI_ 前缀
 * @returns {{ url: string, apiKey: string, model: string }}
 */
function resolveServerConfig() {
  const cli = parseCliArgs();
  return {
    url: cli.baseUrl || process.env.DEEPSEEK_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || '',
    apiKey: cli.apiKey || process.env.DEEPSEEK_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
    model: cli.model || process.env.DEEPSEEK_OPENAI_MODEL || process.env.OPENAI_MODEL || '',
  };
}

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

/**
 * 识别图片主逻辑：参数校验 → 合并配置 → 读取图片 → 调用接口（带重试）
 * @param {string} imagePath 本地图片绝对路径
 * @param {string} prompt 识别提示词
 * @param {{ url?: string, apiKey?: string, model?: string }} [paramConfig] 调用时临时覆盖的配置
 * @returns {Promise<{ success: boolean, data?: string, config?: object, error?: string }>}
 */
async function recognizeImage(imagePath, prompt, paramConfig) {
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

  // 3. 合并配置（工具参数 config > 命令行参数 > 环境变量）
  const serverCfg = resolveServerConfig();
  const url = (paramConfig && paramConfig.url) || serverCfg.url;
  const apiKey = (paramConfig && paramConfig.apiKey) || serverCfg.apiKey;
  const model = (paramConfig && paramConfig.model) || serverCfg.model;

  const missing = [];
  if (!url) missing.push('DEEPSEEK_OPENAI_BASE_URL(或 OPENAI_BASE_URL)');
  if (!apiKey) missing.push('DEEPSEEK_OPENAI_API_KEY(或 OPENAI_API_KEY)');
  if (!model) missing.push('DEEPSEEK_OPENAI_MODEL(或 OPENAI_MODEL)');
  if (missing.length > 0) {
    return {
      success: false,
      error:
        `缺少必要配置：${missing.join('、')}。请在 MCP 客户端中为该 server 配置对应环境变量，` +
        `或通过 --base-url / --api-key / --model 命令行参数传入，` +
        `也可在调用时传入 config 参数临时指定（url/apiKey/model）。`,
    };
  }

  const cfg = { url: buildChatCompletionsUrl(url), apiKey, model };

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
      log(`${retryInfo}，${RETRY_DELAY_MS / 1000}秒后进行第 ${attempt + 1}/${RETRY_MAX} 次重试...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
  return { success: false, error: `OpenAI 兼容接口调用失败，已重试 ${RETRY_MAX} 次仍未成功：${lastError}` };
}

// 创建 MCP server 并注册工具
const server = new McpServer(
  { name: 'deepseek-vision-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.registerTool(
  'recognizeImage',
  {
    title: '图像识别',
    description:
      '使用 OpenAI 兼容接口的视觉模型识别本地图片。传入本地图片绝对路径和提示词，返回图像识别结果。' +
      '接口地址/密钥/模型名由 MCP 客户端环境变量配置（DEEPSEEK_OPENAI_BASE_URL / DEEPSEEK_OPENAI_API_KEY / DEEPSEEK_OPENAI_MODEL，' +
      '或回退 OPENAI_BASE_URL / OPENAI_API_KEY / OPENAI_MODEL），也可在调用时通过 config 参数临时指定。' +
      '适用于图片内容描述、OCR 文字提取、图表解读、物体识别等场景。',
    inputSchema: z.object({
      imagePath: z
        .string()
        .describe('本地图片文件的绝对路径，例如 C:/Users/xxx/Desktop/photo.png'),
      prompt: z
        .string()
        .describe('图像识别提示词，例如"描述这张图片的内容"、"提取图片中的所有文字"'),
      config: z
        .object({
          url: z.string().describe('OpenAI 兼容接口地址，例如 http://xxx.com/v1'),
          apiKey: z.string().describe('接口密钥，例如 sk-123'),
          model: z.string().describe('模型名称，例如 MiMo_mimo-v2.5'),
        })
        .optional()
        .describe('可选配置，临时覆盖环境变量中的 url/apiKey/model'),
    }),
  },
  async ({ imagePath, prompt, config }) => {
    try {
      const result = await recognizeImage(imagePath, prompt, config);
      if (result.success) {
        return {
          content: [{ type: 'text', text: result.data }],
          structuredContent: {
            success: true,
            data: result.data,
            config: result.config,
          },
        };
      }
      return {
        content: [{ type: 'text', text: result.error }],
        structuredContent: { success: false, error: result.error },
        isError: true,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `识别失败：${err.message}` }],
        structuredContent: { success: false, error: err.message },
        isError: true,
      };
    }
  }
);

// 通过 stdio 提供 MCP 服务（serveStdio 自动处理协议版本协商）
serveStdio(() => server);

log('MCP server 已启动，通过 stdio 监听中...');

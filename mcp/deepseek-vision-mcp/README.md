<div align="center">

[🌏 **English**](README.en.md) &nbsp;|&nbsp; [🇨🇳 **中文**](README.md)

</div>

---

# DeepSeek Vision MCP

基于 **[OpenAI 兼容接口](https://www.npmjs.com/package/@modelcontextprotocol/server)** 构建的 MCP（Model Context Protocol）Server，用于视觉图像识别。对接任意 OpenAI 兼容的 Chat Completions 服务（one-api、new-api、各类 API 中转站、本地 vLLM/Ollama 网关等），使用其视觉模型进行图片理解。

> 可在任意支持 MCP 的客户端（Claude Desktop、Cursor、ZCode、Cherry Studio 等）中使用。

> **🚀 零依赖发布**：项目支持用 esbuild tree-shaking 打包成**单文件、零 npm 依赖**的可执行程序发布到 npm。

## 功能

- ✅ MCP 工具 `recognizeImage`：传入图片路径（本地绝对路径或网络 URL）+ 提示词，返回模型识别结果
- ✅ 支持 jpg/png/webp/bmp/gif/tiff/svg 等常见图片格式
- ✅ 配置参数（`url` / `apiKey` / `model`）由 **MCP 客户端通过环境变量注入**，无需改代码
- ✅ 支持命令行参数与工具调用时 `config` 参数临时覆盖
- ✅ 接口访问量过大（429）/服务端错误（5xx）/网络异常时自动重试：间隔 2 秒，最多 5 次
- ✅ 同时兼容普通 JSON 与 SSE 流式响应（深度思考模型的 `reasoning_content` 也一并处理）

## 配合 ai-models-manager 使用

可配合 **[ai-models-manager](https://www.npmjs.com/package/ai-models-manager)** 提供的模型代理服务使用：它能将请求中携带的 base64 图片自动转换为 MCP 可读取的网络 URL，从而让本 server 直接通过 URL 识别图片，无需手动准备本地文件或 base64 文本。

## MCP 客户端配置

MCP 客户端以 stdio 方式启动该 server，通过 **环境变量** 注入配置参数。配置共三项：

| 环境变量 | 说明 | 示例 |
|---------|------|------|
| `DEEPSEEK_OPENAI_BASE_URL` | OpenAI 兼容接口地址（base url，自动拼接 `/chat/completions`；也支持完整地址） | `http://xxx.com/v1` |
| `DEEPSEEK_OPENAI_API_KEY` | 接口密钥 | `sk-123` |
| `DEEPSEEK_OPENAI_MODEL` | 视觉模型名称 | `MiMo_mimo-v2.5` |

> 兼容回退：未设置 `DEEPSEEK_*` 时自动回退到标准 `OPENAI_BASE_URL` / `OPENAI_API_KEY` / `OPENAI_MODEL`。

### MCP 客户端直接引用 npx（无需安装）

无需安装，客户端 `command` 直接写 `npx`：

```json
{
  "mcpServers": {
    "deepseek-vision-mcp": {
      "command": "npx",
      "args": ["-y", "deepseek-vision-mcp"],
      "env": {
        "DEEPSEEK_OPENAI_BASE_URL": "http://xxx.com/v1",
        "DEEPSEEK_OPENAI_API_KEY": "sk-123",
        "DEEPSEEK_OPENAI_MODEL": "MiMo_mimo-v2.5"
      }
    }
  }
}
```

### 通用 MCP 配置（Claude Desktop / Cursor / Cherry Studio 等）

在 MCP 客户端配置文件中添加（stdio server + env）：

```json
{
  "mcpServers": {
    "deepseek-vision-mcp": {
      "command": "node",
      "args": ["D:/code/.../tools/deepseek-vision-mcp/index.js"],
      "env": {
        "DEEPSEEK_OPENAI_BASE_URL": "http://xxx.com/v1",
        "DEEPSEEK_OPENAI_API_KEY": "sk-123",
        "DEEPSEEK_OPENAI_MODEL": "MiMo_mimo-v2.5"
      }
    }
  }
}
```

### Claude Desktop（claude_desktop_config.json）

```json
{
  "mcpServers": {
    "deepseek-vision-mcp": {
      "command": "node",
      "args": ["D:/code/.../deepseek-vision-mcp/index.js"],
      "env": {
        "DEEPSEEK_OPENAI_BASE_URL": "http://xxx.com/v1",
        "DEEPSEEK_OPENAI_API_KEY": "sk-123",
        "DEEPSEEK_OPENAI_MODEL": "MiMo_mimo-v2.5"
      }
    }
  }
}
```

### Cursor（.cursor/mcp.json）

```json
{
  "mcpServers": {
    "deepseek-vision-mcp": {
      "command": "node",
      "args": ["D:/code/.../deepseek-vision-mcp/index.js"],
      "env": {
        "DEEPSEEK_OPENAI_BASE_URL": "http://xxx.com/v1",
        "DEEPSEEK_OPENAI_API_KEY": "sk-123",
        "DEEPSEEK_OPENAI_MODEL": "MiMo_mimo-v2.5"
      }
    }
  }
}
```

### 命令行参数（替代环境变量）

部分客户端也可通过 `args` 传参，适用于密钥不便写入 env 的场景：

```bash
node index.js --base-url http://xxx.com/v1 --api-key sk-123 --model MiMo_mimo-v2.5
```

## MCP 工具清单

| 工具名 | 描述 |
|--------|------|
| `recognizeImage` | 传入图片路径（本地绝对路径或网络 URL）和提示词，使用 OpenAI 兼容接口视觉模型识别图片并返回结果 |

### recognizeImage 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `imagePath` | string | ✅ | 图片路径：本地绝对路径（如 `C:/Users/xxx/Desktop/photo.png`）、网络图片 URL（如 `http://localhost:11888/base64-files/xxx.png`）、或网络 base64 文件 URL（如 `http://localhost:11888/base64-files/xxx.base64`） |
| `prompt` | string | ✅ | 识别提示词，如"描述这张图片的内容"、"提取图片中的所有文字" |
| `config` | object | ❌ | 临时覆盖环境变量配置：`{ url, apiKey, model }` |

## 使用示例

在任意 MCP 客户端对话中直接使用自然语言：

```
帮我识别图片 C:/Users/xxx/Desktop/photo.png 里有什么
提取图片 C:/pics/invoice.png 中的所有文字
分析图片 D:/workspace/chart.png 中折线图的走势
识别这张网络图片 http://localhost:11888/base64-files/xxx.png 的内容
识别这个网络 base64 文件 http://localhost:11888/base64-files/xxx.base64 里的图片
```

客户端会自动调用 `recognizeImage` 工具并返回识别结果。

### 全局安装

```bash
npm install -g deepseek-vision-mcp
```

## 常见问题

- **stdout 被污染？** 本 server 所有日志统一输出到 stderr，不干扰 MCP 的 JSON-RPC 通道。
- **接口地址要带 `/chat/completions` 吗？** 不需要，传 base url（如 `http://host/v1`）会自动拼接；传完整地址也能识别。
- **模型不返回内容？** 深度思考模型内容在 `reasoning_content` 字段，已自动回退收集。
- **429/5xx 怎么办？** 已内置自动重试（间隔 2 秒，最多 5 次），无需手动处理。
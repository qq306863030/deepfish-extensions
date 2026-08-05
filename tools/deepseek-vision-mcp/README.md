# DeepSeek Vision MCP

基于 **[OpenAI 兼容接口](https://www.npmjs.com/package/@modelcontextprotocol/server)** 构建的 MCP（Model Context Protocol）Server，用于视觉图像识别。对接任意 OpenAI 兼容的 Chat Completions 服务（one-api、new-api、各类 API 中转站、本地 vLLM/Ollama 网关等），使用其视觉模型进行图片理解。

> 可在任意支持 MCP 的客户端（Claude Desktop、Cursor、ZCode、Cherry Studio 等）中使用。

> **🚀 零依赖发布**：项目支持用 esbuild tree-shaking 打包成**单文件、零 npm 依赖**的可执行程序发布到 npm（详见下方「打包与发布」）。

## 功能

- ✅ MCP 工具 `recognizeImage`：传入本地图片绝对路径 + 提示词，返回模型识别结果
- ✅ 支持 jpg/png/webp/bmp/gif/tiff/svg 等常见图片格式
- ✅ 配置参数（`url` / `apiKey` / `model`）由 **MCP 客户端通过环境变量注入**，无需改代码
- ✅ 支持命令行参数与工具调用时 `config` 参数临时覆盖
- ✅ 接口访问量过大（429）/服务端错误（5xx）/网络异常时自动重试：间隔 2 秒，最多 5 次
- ✅ 同时兼容普通 JSON 与 SSE 流式响应（深度思考模型的 `reasoning_content` 也一并处理）
- ✅ 基于 `@modelcontextprotocol/server` v2（MCP SDK 稳定版），Node.js 20+

## 快速开始

```bash
cd deepseek-vision-mcp
npm install
```

本地验证（冒烟测试 + 端到端 mock 测试）：

```bash
node test.mjs        # MCP 协议握手 / tools/list / 错误分支
node test-e2e.mjs    # 完整链路：MCP client → server → mock OpenAI API
```

## MCP 客户端配置

MCP 客户端以 stdio 方式启动该 server，通过 **环境变量** 注入配置参数。配置共三项：

| 环境变量 | 说明 | 示例 |
|---------|------|------|
| `DEEPSEEK_OPENAI_BASE_URL` | OpenAI 兼容接口地址（base url，自动拼接 `/chat/completions`；也支持完整地址） | `http://xxx.com/v1` |
| `DEEPSEEK_OPENAI_API_KEY` | 接口密钥 | `sk-123` |
| `DEEPSEEK_OPENAI_MODEL` | 视觉模型名称 | `MiMo_mimo-v2.5` |

> 兼容回退：未设置 `DEEPSEEK_*` 时自动回退到标准 `OPENAI_BASE_URL` / `OPENAI_API_KEY` / `OPENAI_MODEL`。

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

## 配置优先级

`工具参数 config`（调用时临时指定） > `命令行参数` > `环境变量`

> 说明：MCP stdio 协议禁止控制台交互污染 stdout，因此配置一律由客户端注入。若调用时配置缺失，工具会返回明确的错误指引。

## MCP 工具清单

| 工具名 | 描述 |
|--------|------|
| `recognizeImage` | 传入本地图片绝对路径和提示词，使用 OpenAI 兼容接口视觉模型识别图片并返回结果 |

### recognizeImage 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `imagePath` | string | ✅ | 本地图片文件的绝对路径，如 `C:/Users/xxx/Desktop/photo.png` |
| `prompt` | string | ✅ | 识别提示词，如"描述这张图片的内容"、"提取图片中的所有文字" |
| `config` | object | ❌ | 临时覆盖环境变量配置：`{ url, apiKey, model }` |

## 使用示例

在任意 MCP 客户端对话中直接使用自然语言：

```
帮我识别图片 C:/Users/xxx/Desktop/photo.png 里有什么
提取图片 C:/pics/invoice.png 中的所有文字
分析图片 D:/workspace/chart.png 中折线图的走势
```

客户端会自动调用 `recognizeImage` 工具并返回识别结果。

## 打包与发布

本项目支持 tree-shaking 打包成**单文件、零 npm 依赖**的可执行程序发布到 npm。所有第三方代码（`@modelcontextprotocol/server`、`zod`）都被 esbuild 静态分析后打入一个 `dist/index.js`，发布产物不携带任何 `dependencies`。

### 打包

```bash
npm run build   # 生成 dist/index.js（单文件，约 600KB，零外部依赖）
```

### 零依赖验证

```bash
node verify-zero-dep.mjs   # 把 dist/index.js 复制到无 node_modules 的空目录，跑通完整识别链路
```

### 发布到 npm

```bash
npm login
npm publish    # 发布前自动执行 build + 零依赖验证（prepublishOnly）
```

发布物只包含：`dist/index.js`（打包产物）+ `index.js`（源码，仅作 main 引用）+ `package.json`。**不含任何运行时依赖**——用户 `npm install` 时不会拉取 `@modelcontextprotocol/server` / `zod`。

### 用户安装（全局）

```bash
npm install -g deepseek-vision-mcp
deepseek-vision-mcp   # 直接可用（bin 指向打包产物 dist/index.js）
```

### MCP 客户端直接引用 npx

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

## 项目结构

```
deepseek-vision-mcp/
├── index.js            # MCP server 源码（基于 @modelcontextprotocol/server v2）
├── package.json
├── test.mjs            # 冒烟测试：协议握手 / tools/list / 错误分支
├── test-e2e.mjs        # 端到端测试：完整调用链（含 mock OpenAI 接口）
├── verify-zero-dep.mjs # 零依赖验证：空目录跑通完整链路
└── README.md
```

## 常见问题

- **stdout 被污染？** 本 server 所有日志统一输出到 stderr，不干扰 MCP 的 JSON-RPC 通道。
- **接口地址要带 `/chat/completions` 吗？** 不需要，传 base url（如 `http://host/v1`）会自动拼接；传完整地址也能识别。
- **模型不返回内容？** 深度思考模型内容在 `reasoning_content` 字段，已自动回退收集。
- **429/5xx 怎么办？** 已内置自动重试（间隔 2 秒，最多 5 次），无需手动处理。

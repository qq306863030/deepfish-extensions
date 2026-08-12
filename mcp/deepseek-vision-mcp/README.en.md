<div align="center">

[🇨🇳 **中文**](README.md) &nbsp;|&nbsp; [🌏 **English**](README.md)

</div>

---

# DeepSeek Vision MCP

An MCP (Model Context Protocol) Server built on the **[OpenAI-compatible API](https://www.npmjs.com/package/@modelcontextprotocol/server)** for visual image recognition. Works with any OpenAI-compatible Chat Completions service (one-api, new-api, API proxies, local vLLM/Ollama gateways, etc.) using vision models for image understanding.

> Works with any MCP-compatible client (Claude Desktop, Cursor, ZCode, Cherry Studio, etc.).


## Features

- ✅ MCP tool `recognizeImage`: Pass an image path (local absolute path or network URL) + prompt, returns model recognition result
- ✅ Supports common image formats: jpg/png/webp/bmp/gif/tiff/svg
- ✅ Configuration (`url` / `apiKey` / `model`) injected via **environment variables** from MCP client — no code changes needed
- ✅ Supports CLI arguments and runtime `config` parameter override
- ✅ Automatic retry on 429 (rate limit) / 5xx (server errors) / network exceptions: 2s interval, up to 5 retries
- ✅ Compatible with both regular JSON and SSE streaming responses (handles `reasoning_content` from deep-thinking models)

## Working with ai-models-manager

Can be used together with the model proxy service provided by **[ai-models-manager](https://www.npmjs.com/package/ai-models-manager)**: it automatically converts base64 images carried in requests into network URLs that MCP can read, so this server can recognize images directly via URL — no need to manually prepare local files or base64 text.

## Quick Start

```bash
cd deepseek-vision-mcp
npm install
```

Local verification (smoke test + end-to-end mock test):

```bash
node test.mjs        # MCP handshake / tools/list / error branches
node test-e2e.mjs    # Full pipeline: MCP client → server → mock OpenAI API
```

## MCP Client Configuration

MCP clients start the server via stdio, injecting configuration through **environment variables**. Three configuration items:

| Environment Variable | Description | Example |
|---------|------|------|
| `OPENAI_BASE_URL` | OpenAI-compatible API base URL (auto-appends `/chat/completions`; full URL also accepted) | `http://xxx.com/v1` |
| `OPENAI_API_KEY` | API key | `sk-123` |
| `OPENAI_MODEL` | Vision model name | `MiMo_mimo-v2.5` |

### Using npx Directly (No Installation Required)

No installation needed — just use `npx` as the `command`:

```json
{
  "mcpServers": {
    "deepseek-vision-mcp": {
      "command": "npx",
      "args": ["-y", "deepseek-vision-mcp"],
      "env": {
        "OPENAI_BASE_URL": "http://xxx.com/v1",
        "OPENAI_API_KEY": "sk-123",
        "OPENAI_MODEL": "MiMo_mimo-v2.5"
      }
    }
  }
}
```

### Generic MCP Configuration (Claude Desktop / Cursor / Cherry Studio, etc.)

Add to your MCP client configuration file (stdio server + env):

```json
{
  "mcpServers": {
    "deepseek-vision-mcp": {
      "command": "node",
      "args": ["D:/code/.../tools/deepseek-vision-mcp/index.js"],
      "env": {
        "OPENAI_BASE_URL": "http://xxx.com/v1",
        "OPENAI_API_KEY": "sk-123",
        "OPENAI_MODEL": "MiMo_mimo-v2.5"
      }
    }
  }
}
```

### Claude Desktop (claude_desktop_config.json)

```json
{
  "mcpServers": {
    "deepseek-vision-mcp": {
      "command": "node",
      "args": ["D:/code/.../deepseek-vision-mcp/index.js"],
      "env": {
        "OPENAI_BASE_URL": "http://xxx.com/v1",
        "OPENAI_API_KEY": "sk-123",
        "OPENAI_MODEL": "MiMo_mimo-v2.5"
      }
    }
  }
}
```

### Cursor (.cursor/mcp.json)

```json
{
  "mcpServers": {
    "deepseek-vision-mcp": {
      "command": "node",
      "args": ["D:/code/.../deepseek-vision-mcp/index.js"],
      "env": {
        "OPENAI_BASE_URL": "http://xxx.com/v1",
        "OPENAI_API_KEY": "sk-123",
        "OPENAI_MODEL": "MiMo_mimo-v2.5"
      }
    }
  }
}
```

### CLI Arguments (Alternative to Environment Variables)

Some clients support passing arguments via `args` instead of env, useful when keys shouldn't be written to env:

```bash
node index.js --base-url http://xxx.com/v1 --api-key sk-123 --model MiMo_mimo-v2.5
```

## Configuration Priority

`Tool parameter config` (runtime override) > `CLI arguments` > `Environment variables`

> Note: The MCP stdio protocol prohibits console interaction from polluting stdout, so configuration must be injected by the client. If configuration is missing at runtime, the tool returns a clear error message.

## MCP Tools

| Tool | Description |
|------|-------------|
| `recognizeImage` | Pass an image path (local absolute path or network URL) and prompt, uses OpenAI-compatible vision model to recognize the image and return results |

### recognizeImage Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `imagePath` | string | ✅ | Image path: local absolute path (e.g. `C:/Users/xxx/Desktop/photo.png`), network image URL (e.g. `http://localhost:11888/base64-files/xxx.png`), or network base64 file URL (e.g. `http://localhost:11888/base64-files/xxx.base64`) |
| `prompt` | string | ✅ | Recognition prompt, e.g. "Describe this image" or "Extract all text from this image" |
| `config` | object | ❌ | Temporarily override environment config: `{ url, apiKey, model }` |

## Usage Examples

Use natural language in any MCP client:

```
What's in this image: C:/Users/xxx/Desktop/photo.png
Extract all text from C:/pics/invoice.png
Analyze the line chart trend in D:/workspace/chart.png
Describe this network image: http://localhost:11888/base64-files/xxx.png
Recognize the image in this network base64 file: http://localhost:11888/base64-files/xxx.base64
```

The client will automatically call the `recognizeImage` tool and return the recognition result.

### Global Installation

```bash
npm install -g deepseek-vision-mcp
```

## FAQ

- **stdout polluted?** All server logs are output to stderr, never interfering with the MCP JSON-RPC channel.
- **Does the API URL need `/chat/completions`?** No — just provide the base URL (e.g. `http://host/v1`); it's auto-appended. Full URLs are also accepted.
- **Model returns no content?** Deep-thinking models put content in the `reasoning_content` field — this is automatically handled.
- **429/5xx errors?** Built-in automatic retry (2s interval, up to 5 retries) — no manual handling needed.
# OpenAI 图像识别工具

## 功能介绍

基于 **OpenAI 兼容接口** 的图像识别工具。支持对接任意 OpenAI 兼容的 Chat Completions 服务（如 one-api、new-api、各类 API 中转站、本地 vLLM/Ollama 网关等），使用其视觉模型进行图片理解。传入本地图片文件的绝对路径和提示词，即可获取图像识别结果。

**适用场景**：
- 图片内容描述、物体识别
- OCR 文字提取（印刷体、手写体、复杂表格）
- 图表数据解读、文档理解与问答
- 图片分类、情感分析

**核心能力**：
- ✅ 支持 jpg/png/webp/bmp/gif/tiff/svg 等常见图片格式
- ✅ 三项配置：`url`（接口地址）、`apiKey`（密钥）、`model`（模型名），灵活对接任意 OpenAI 兼容服务
- ✅ 配置优先级：函数参数 config → 环境变量 → 本地配置文件 → 控制台交互输入（自动缓存复用）
- ✅ 未配置时自动在控制台引导输入，无需手动编辑文件
- ✅ 接口访问量过大（429）/服务端错误（5xx）/网络异常时自动重试：间隔 2 秒，最多 5 次
- ✅ 零第三方依赖，仅需 Node.js 18+

## 工具清单

| 函数名 | 描述 |
|--------|------|
| `recognizeImage` | 传入本地图片绝对路径和提示词，使用 OpenAI 兼容接口视觉模型识别图片并返回结果 |
| `updateConfig` | 查看或修改本地配置（url / apiKey / model），传入需要更新的字段即持久化保存；不传参数则查看当前配置（apiKey 脱敏显示） |

## 快速开始

### 安装 Deepfish

```bash
npm install -g deepfish-ai
```

### 添加工具

```bash
ai tools add deepfish-tool-openai-image-recognizer
```

### 使用示例

添加完成后，在 Deepfish 对话中直接使用自然语言调用：

```bash
ai "帮我识别图片 C:/Users/xxx/Desktop/photo.png 里有什么"
ai "提取图片 C:/pics/invoice.png 中的所有文字"
ai "分析图片 D:/workspace/chart.png 中折线图的走势"
```

AI 会自动识别你的意图并调用 `recognizeImage` 工具函数返回识别结果。

## 配置说明

工具需要三项配置：`url`、`apiKey`、`model`。可按以下优先级提供（高优先级覆盖低优先级）：

> **💡 懒人模式**：什么都不配置直接调用，工具会在控制台交互式引导你依次输入 `url`、`apiKey`、`model`，输入后自动缓存到本地配置文件，下次直接复用。

### 1. 函数参数 config（最高优先级）

调用时直接传入 config 对象：

```js
recognizeImage("C:/Users/xxx/Desktop/photo.png", "描述这张图片", {
  url: "http://xxx.com/v1",
  apiKey: "sk-123",
  model: "MiMo_mimo-v2.5",
})
```

### 2. 环境变量

```bash
# Windows (CMD)
set OPENAI_BASE_URL=http://xxx.com/v1
set OPENAI_API_KEY=sk-123
set OPENAI_MODEL=MiMo_mimo-v2.5

# Linux / macOS
export OPENAI_BASE_URL=http://xxx.com/v1
export OPENAI_API_KEY=sk-123
export OPENAI_MODEL=MiMo_mimo-v2.5
```

### 3. 本地配置文件

通过函数参数、环境变量或控制台交互输入配置后，工具会自动缓存到 `~/.deepfish-ai/external-tools/openai-image-recognizer-config.json`，下次直接复用。也可手动编辑该文件：

```json
{
  "url": "http://xxx.com/v1",
  "apiKey": "sk-123",
  "model": "MiMo_mimo-v2.5"
}
```

> **URL 兼容**：`url` 既支持传入 base 地址（如 `http://host/v1`，自动拼接 `/chat/completions`），也支持传入完整地址（如 `http://host/v1/chat/completions`）。

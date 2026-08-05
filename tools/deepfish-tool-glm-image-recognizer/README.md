# GLM 图像识别工具

## 功能介绍

基于智谱 AI 开放平台 **GLM-4.6V-Flash 免费视觉模型** 的图像识别工具。传入本地图片文件的绝对路径和提示词，即可获取图像识别结果。

**适用场景**：
- 图片内容描述、物体识别
- OCR 文字提取（印刷体、手写体、复杂表格）
- 图表数据解读、文档理解与问答
- 图片分类、情感分析

**核心能力**：
- ✅ 支持 jpg/png/webp/bmp/gif/tiff/svg 等常见图片格式
- ✅ 自动检查 API Key（环境变量 → 本地缓存 → 控制台交互输入）
- ✅ 交互输入的 API Key 自动缓存，下次直接复用
- ✅ 零第三方依赖，仅需 Node.js 18+

## 工具清单

| 函数名 | 描述 |
|--------|------|
| `recognizeImage` | 传入本地图片绝对路径和提示词，使用 GLM-4.6V-Flash 识别图片并返回结果 |

## 快速开始

### 安装 Deepfish

```bash
npm install -g deepfish-ai
```

### 添加工具

```bash
ai tools add deepfish-tool-glm-image-recognizer
```

### 使用示例

添加完成后，在 Deepfish 对话中直接使用自然语言调用：

```bash
ai "帮我识别图片 C:/Users/xxx/Desktop/photo.png 里有什么"
ai "提取图片 C:/pics/invoice.png 中的所有文字"
ai "分析图片 D:/workspace/chart.png 中折线图的走势"
```

AI 会自动识别你的意图并调用 `recognizeImage` 工具函数返回识别结果。

> **API Key 配置**：首次调用时若检测不到环境变量 `ZHIPU_API_KEY`，工具会在控制台交互式引导输入，并自动缓存到 `~/.deepfish-ai/glm-image-recognizer-key.json`。也可以提前设置：
>
> ```bash
> # Windows (CMD)
> set ZHIPU_API_KEY=你的API_KEY
> # Linux / macOS
> export ZHIPU_API_KEY=你的API_KEY
> ```

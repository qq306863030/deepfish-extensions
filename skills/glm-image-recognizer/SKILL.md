---
name: 'glm-image-recognizer'
description: '基于智谱 GLM-4.6V-Flash 免费视觉模型的图像识别工具，传入提示词与本地图片绝对路径，返回识别结果'
homepage: ''
---

# GLM 图像识别

## 概述

本 Skill 为 Agent 提供**图像识别能力**，底层调用智谱 AI 开放平台的 **GLM-4.6V-Flash** 免费视觉模型。Agent 只需给出**提示词**和**本地图片的绝对路径**，即可获得图片内容的识别与分析结果。

**适用场景**：
- 图片内容描述、物体识别与计数
- OCR 文字提取（印刷体、手写体、复杂表格）
- 图表数据解读、文档理解与问答
- 图片分类、情感分析、商品属性识别
- 需要视觉判断的 Agent 任务（如截图分析、质量检测）

**能力边界**：
- ✅ 能识别本地图片（jpg/jpeg/png/webp/bmp/gif/tiff/svg 等格式）
- ✅ 支持思考模式（--thinking），先推理再回答，适合复杂视觉任务
- ✅ 支持图片 + 文本的多模态对话式问答
- ❌ 不能生成/绘制图片（那是图像生成模型的能力）
- ❌ 不能直接识别视频或音频（GLM-4.6V-Flash 虽支持视频输入，但本 CLI 当前仅处理静态图片文件）
- ❌ 不能在没有 API Key 的情况下工作

## 环境依赖

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | 18 及以上 | 脚本使用内置全局 `fetch`，无需安装第三方 npm 包 |
| API Key | 必须 | 智谱开放平台（https://bigmodel.cn）注册后，在控制台「API Keys」页面创建，格式如 `xxxxxxxx.xxxxxxxx` |

**API Key 配置方式**（二选一）：

1. 环境变量（推荐）：
   ```bash
   # Windows (CMD)
   set ZHIPU_API_KEY=你的API_KEY
   # Windows (PowerShell)
   $env:ZHIPU_API_KEY = "你的API_KEY"
   # Linux / macOS
   export ZHIPU_API_KEY=你的API_KEY
   ```

2. 命令行参数：
   ```bash
   node recognize-image.js ./cat.jpg "这是什么？" --api-key 你的API_KEY
   ```

**验证环境**：
```bash
node --version   # 确认 Node.js 版本 >= 18
```

## 使用指令

### 核心命令格式

```bash
node recognize-image.js <图片绝对路径> <提示词> [选项]
```

### 标准使用流程（Agent 遵循此流程）

1. **确认图片存在**：先确认本地图片文件真实存在，获取其绝对路径（Windows 示例：`C:\Users\xxx\Desktop\photo.png`）。
2. **确认 API Key 可用**：检查环境变量 `ZHIPU_API_KEY` 是否已设置；未设置则提示用户通过 `--api-key` 传入。
3. **组装并执行命令**：按以下模板执行 CLI：
   ```bash
   node "D:/code/my_project/github/deepfish-extensions/skills/glm-image-recognizer/scripts/recognize-image.js" "C:/Users/xxx/Desktop/photo.png" "识别这张图片中的物体并简要描述"
   ```
   > 注意：Windows 下路径建议使用正斜杠 `/` 或对反斜杠加引号，避免被 shell 转义。
4. **解析输出**：命令输出即模型识别结果（纯文本），直接返回给用户。

### 常用命令示例

```bash
# 1. 基础图像描述
node recognize-image.js C:/pics/cat.jpg "描述这张图片的内容"

# 2. OCR 文字提取
node recognize-image.js C:/pics/invoice.png "提取图片中的所有文字，按原格式输出"

# 3. 图表解读
node recognize-image.js C:/pics/trend.png "分析这张折线图的走势并总结要点"

# 4. 思考模式（复杂推理任务）
node recognize-image.js C:/pics/geometry.png "请解决图中的数学题并给出详细过程" --thinking

# 5. 指定其他 GLM 视觉模型（如 GLM-4.1V-Thinking-Flash / GLM-4V-Flash）
node recognize-image.js C:/pics/table.png "解读这张表格" --model glm-4.1v-thinking-flash

# 6. 输出完整 JSON 响应（含 usage 用量等元数据）
node recognize-image.js C:/pics/logo.png "识别图片中的品牌" --json

# 7. 查看帮助
node recognize-image.js --help
```

### 典型 Agent 工作流示例

当用户说「帮我看看这张截图里的报错信息」时，Agent 应：
1. 找到截图文件（如 `D:/workspace/tmp_error.png`）
2. 执行：
   ```bash
   node recognize-image.js D:/workspace/tmp_error.png "提取图片中的报错信息，并说明可能的原因" --thinking
   ```
3. 将返回结果整理后回复用户

## 输入输出规范

### 输入

| 参数 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `imagePath`（位置参数1） | ✅ | string | 本地图片文件的绝对路径或相对路径 |
| `prompt`（位置参数2） | ✅ | string | 对图片执行的识别指令，支持中文，支持多词（自动用空格拼接） |
| `--api-key <key>` | ❌ | string | 智谱 API Key，未设置环境变量时必填 |
| `--model <name>` | ❌ | string | 模型名，默认 `glm-4.6v-flash` |
| `--thinking` | ❌ | flag | 开启思考模式（深度推理） |
| `--json` | ❌ | flag | 输出完整 JSON 响应 |

支持的图片格式：`.jpg` `.jpeg` `.png` `.gif` `.webp` `.bmp` `.svg` `.tif` `.tiff`

### 输出

**默认模式**（纯文本）：
```
【思考过程】           ← 仅 --thinking 模式下出现
（模型的推理过程）

（模型的识别结果内容）
```

**--json 模式**：输出智谱 API 的完整响应 JSON，包含 `choices[].message.content`（识别结果）、`choices[].message.reasoning_content`（思考过程）、`usage`（token 用量）等字段。

**退出码**：`0` 表示成功；`1` 表示参数错误、文件不存在或 API 调用失败。

### 输入输出示例

**输入命令**：
```bash
node recognize-image.js C:/pics/cat.jpg "这张图片里有什么？用中文回答"
```

**输出（示例）**：
```
图片中有一只橘色的猫，它正躺在一张灰色沙发上，眼睛看着镜头，看起来十分放松。
背景中可以看到一个木质的书架和一些绿植。
```

## 注意事项与限制

1. **免费但有速率限制**：GLM-4.6V-Flash 调用免费，但受账号等级（Tier）的 QPS/并发限制，高并发场景可能触发限流（HTTP 429）。可登录控制台 `usercenter/proj-mgmt/rate-limits` 查看配额。
2. **图片大小**：过大的图片（如 >10MB）会导致 base64 编码后请求体过大，可能被 API 拒绝或响应变慢。建议先压缩或裁剪大图。
3. **提示词质量**：识别精度与提示词明确度强相关，复杂任务建议给出具体指令（如「提取所有文字并转为 Markdown 表格」），必要时开启 `--thinking`。
4. **API Key 安全**：切勿将 API Key 硬编码到脚本中或提交到公开仓库，应使用环境变量管理。若 Key 泄露，立即到控制台删除重建。
5. **思考模式注意**：开启 `--thinking` 会显著增加响应耗时和 token 消耗（虽免费，但影响速度），简单任务不建议开启。
6. **网络要求**：脚本需能访问 `https://open.bigmodel.cn`，内网/离线环境无法使用。
7. **输出稳定性**：大模型输出为生成式文本，同一图片多次调用结果可能存在差异，关键场景建议校验结果。
8. **模型兼容**：`--model` 可切换为 `glm-4.1v-thinking-flash`、`glm-4v-flash` 等其他智谱视觉模型；不同模型上下文窗口与输出上限不同（GLM-4.6V-Flash 为 128K 上下文 / 32K 输出）。

### 常见问题处理

| 问题 | 处理方法 |
|------|---------|
| `未找到 API Key` | 设置环境变量 `ZHIPU_API_KEY` 或加 `--api-key` 参数 |
| `文件不存在` | 核对图片绝对路径，检查是否存在、有无权限 |
| `HTTP 401` | API Key 无效或已过期，重新生成 |
| `HTTP 429` | 触发速率限制，稍后重试或降低调用频率 |
| `HTTP 400` | 图片格式不支持或请求体过大，转换格式或压缩图片 |
| 输出为英文 | 提示词中显式要求「用中文回答」 |

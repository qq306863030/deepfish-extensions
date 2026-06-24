---
name: "audio-video-transcriber"
description: "提供音频转文字、音频内容总结、视频内容摘要功能，支持多种音视频格式的转录与智能总结，内置模型自动管理与下载能力"
---

# Audio-Video Transcriber Skill

## 概述

本 Skill 提供完整的音视频内容处理能力，核心功能包括：

- **音频转文字**：将音频/视频文件中的语音内容精准转录为文本（基于 FFmpeg whisper 滤镜）
- **音频内容总结**：对音频转录结果进行智能摘要，提取核心要点（基于子agent处理）
- **视频内容摘要**：提取视频音频轨道并生成内容摘要
- **模型自动管理**：自动检查本地模型，缺失时自动下载，无需手动配置

### 适用场景
- 会议录音转写与纪要生成
- 播客/访谈内容快速浏览
- 在线课程/讲座笔记整理
- 视频内容快速预览与摘要

### 能力边界
- 仅处理包含语音的音视频内容
- 转录质量依赖于音频清晰度与背景噪音
- 总结功能基于转录文本，非直接理解音视频画面内容

---

## 环境依赖

使用本 Skill 前，请确保系统已安装以下依赖：

| 依赖项 | 版本要求 | 用途 | 安装方式 |
|--------|----------|------|----------|
| FFmpeg | ≥ 7.0 (需编译 whisper 滤镜) | 音视频处理、语音识别 | 官网下载或包管理器 |
| Node.js | ≥ 16.0 | 运行环境 | 官网下载 |
| 磁盘空间 | ≥ 2GB | 模型存储与临时文件 | - |
| 网络连接 | 首次使用需联网 | 自动下载 Whisper 模型 | - |

### 模型说明
本 Skill 使用 `whisper.cpp` 格式的 GGML 模型。支持以下精度：
- `tiny` (75 MB) - 速度最快，精度最低
- `base` (142 MB) - 推荐默认，平衡速度与精度
- `small` (466 MB) - 较高精度
- `medium` (1.5 GB) - 高精度
- `large` (3.1 GB) - 最高精度，速度较慢

**模型存储路径**：`<Skill根目录>/assets/models/`
**自动下载**：首次执行转录时，若模型不存在，将自动从 HuggingFace 下载。

---

## 使用指令

### 1. 音频/视频转文字

```javascript
const { transcribe } = require('./scripts/transcribe');

// 基本用法
const result = await transcribe('audio.mp3', { 
  language: 'zh', 
  model: 'base' 
});

// 视频自动提取音频并转录
const videoResult = await transcribe('video.mp4', { 
  language: 'zh', 
  model: 'small' 
});
```

**参数说明**：
- `filePath`：输入音频/视频文件路径
- `options.language`：目标语言代码，如 `zh`（中文）、`en`（英文）
- `options.model`：Whisper 模型大小，可选 `tiny`/`base`/`small`/`medium`/`large`
- `options.skillDir`：Skill 根目录（用于定位模型，默认自动识别）
- `options.outputFormat`：输出格式，`txt`/`srt`/`vtt`

### 2. 音频内容总结（优化版）

```javascript
const { summarize } = require('./scripts/summarize');

// 基本用法：只需提供文本文件路径和提示词
const result = await summarize('./transcript.txt', '请总结会议的主要决策和待办事项');

// 指定输出路径
const result2 = await summarize('./transcript.txt', '提取关键技术要点', {
  outputPath: './tech_summary.md'
});
```

**参数说明**：
- `textFilePath`：音视频提取的文本文件路径（必需）
- `prompt`：总结提示词，指导子agent如何总结（必需）
- `options.outputPath`：输出markdown文件路径（可选，默认生成在输入文件同目录，命名为 `{原文件名}_summary.md`）

**输出**：
- 成功时生成markdown格式的总结文件
- 内部自动创建子agent进行智能总结处理

### 3. 视频完整处理（提取+转录+总结）

```javascript
const { processVideo } = require('./scripts/video-extract');

const result = await processVideo('lecture.mp4', {
  transcribeOptions: { model: 'base', language: 'zh' },
  summaryOptions: { prompt: '总结课程核心知识点' }
});
```

---

## 模型管理功能

### 检查模型状态
```javascript
const modelManager = require('./scripts/modelManager');
const status = modelManager.checkAllModels(skillDir);
// 返回各模型的 exists, path, size 信息
```

### 手动下载模型
```javascript
await modelManager.downloadModel('base', skillDir);
```

### 确保模型可用（检查+自动下载）
```javascript
const result = await modelManager.ensureModel('base', skillDir, true);
if (result.success) {
  console.log('模型路径:', result.path);
}
```

---

## 输入输出规范

### 输入格式

| 类型 | 支持格式 | 说明 |
|------|----------|------|
| 音频 | MP3, WAV, FLAC, AAC, OGG, M4A | 主流音频格式均支持 |
| 视频 | MP4, AVI, MKV, MOV, WEBM | 自动提取音频轨道处理 |
| 文本 | TXT | 用于总结功能的输入 |

### 输出格式

| 输出类型 | 格式 | 内容说明 |
|----------|------|----------|
| 转录文本 | `.txt` / `.srt` / `.vtt` | 纯文本或带时间轴字幕格式 |
| 总结文本 | `.md` | Markdown格式的结构化摘要 |

---

## 注意事项与限制

### 模型下载
- 首次使用需联网下载模型，请确保网络通畅
- 模型文件较大，下载时间取决于网络速度
- 下载完成后模型将缓存至 `assets/models/` 目录，后续无需重复下载

### 文件大小限制
- 推荐处理文件大小：≤ 500MB
- 最大支持文件大小：≤ 2GB（受内存限制）
- 超大文件建议先分割处理

### 语言支持
- **高准确度**：英语、中文（普通话）、日语、韩语、法语、德语、西班牙语
- 方言/口音识别准确度会有所下降

### 准确度说明
- 清晰录音（无背景噪音）：转录准确度 ≥ 95%
- 一般环境录音：转录准确度 80%-90%
- 嘈杂环境/多人同时说话：准确度显著下降

### FFmpeg 要求
- 必须使用编译了 `--enable-whisper` 的 FFmpeg 版本
- 日志显示当前环境 FFmpeg 版本为 8.1，已支持 whisper 滤镜

### 总结功能说明
- 总结功能依赖子agent执行，需确保运行环境支持子agent创建
- 提示词越具体，总结效果越好
- 输出为标准Markdown格式，可直接用于笔记或文档

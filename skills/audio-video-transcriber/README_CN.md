# Audio-Video Transcriber Skill

[English](./README.md) | 中文

## 概述

本 Skill 提供完整的音视频内容处理能力，核心功能包括：

- **音频转文字**：将音频文件中的语音内容精准转录为文本
- **音频内容总结**：对音频转录结果进行智能摘要，提取核心要点
- **视频内容摘要**：提取视频音频轨道并生成内容摘要

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

## 快速开始

### ① 全局安装 deepfish-ai

```bash
npm install deepfish-ai -g
```

### ② 安装并启用本 Skill

```bash
ai skill add audio-video-transcriber
ai skill ls
ai skill enable audio-video-transcriber
```

### ③ 使用示例

```bash
# 将音频转成文字
ai 将这段音频转成文字

# 总结音频内容
ai 总结这个音频的内容

# 提取视频摘要
ai 提取这个视频的摘要
```

---

## 环境依赖

使用本 Skill 前，请确保系统已安装以下依赖：

| 依赖项 | 版本要求 | 用途 | 安装方式 |
|--------|----------|------|----------|
| FFmpeg | ≥ 4.0 | 音视频格式转换、音频提取 | `apt install ffmpeg` 或官网下载 |
| Whisper / whisper.cpp | 最新稳定版 | 语音识别转录 | `pip install openai-whisper` 或编译 whisper.cpp |
| Node.js | ≥ 16.0 | 运行环境 | 官网下载 |
| 磁盘空间 | ≥ 2GB | 模型存储与临时文件 | - |

### 可选依赖
- **GPU 支持**：NVIDIA CUDA 环境可大幅提升转录速度
- **语言模型**：根据目标语言下载对应 Whisper 模型（tiny/base/small/medium/large）

---

## 功能特性

### 1. 音频转文字
- 支持多种音频格式（MP3, WAV, FLAC, AAC, OGG, M4A）
- 支持指定语言（中文、英文等 99+ 种语言）
- 支持多种模型精度选择（tiny/base/small/medium/large）
- 输出支持纯文本、SRT 字幕、VTT 字幕格式

### 2. 音频内容总结
- 自动转录后进行智能摘要
- 可自定义总结长度
- 输出结构化要点与关键信息

### 3. 视频内容摘要
- 自动提取视频音频轨道
- 转录并生成视频内容摘要
- 支持主流视频格式（MP4, AVI, MKV, MOV, WEBM）

---

## 目录结构

```
audio-video-transcriber/
├── SKILL.md          # Skill 定义文件（核心配置与指令说明）
├── README.md         # 英文说明文档
├── README_CN.md      # 中文说明文档
├── assets/           # 资源文件目录（图标、示例文件等）
└── scripts/          # 脚本文件目录（处理脚本、工具脚本等）
```

---

## 使用指令

### 1. 音频转文字

```bash
# 基本用法
audio-video-transcriber transcribe --input <音频文件路径> --output <输出文本路径>

# 指定语言
audio-video-transcriber transcribe --input audio.mp3 --output transcript.txt --language zh

# 指定模型精度
audio-video-transcriber transcribe --input audio.mp3 --output transcript.txt --model medium
```

**参数说明**：
- `--input`：输入音频文件路径（必填）
- `--output`：输出文本文件路径（必填）
- `--language`：目标语言代码，如 `zh`（中文）、`en`（英文）
- `--model`：Whisper 模型大小，可选 `tiny`/`base`/`small`/`medium`/`large`

### 2. 音频内容总结

```bash
# 基本用法
audio-video-transcriber summarize --input <音频文件路径> --output <总结输出路径>

# 指定总结长度
audio-video-transcriber summarize --input audio.mp3 --output summary.txt --max-length 500
```

**参数说明**：
- `--input`：输入音频文件路径（必填）
- `--output`：输出总结文件路径（必填）
- `--max-length`：总结最大字数，默认 1000

### 3. 视频内容摘要

```bash
# 基本用法
audio-video-transcriber video-summary --input <视频文件路径> --output <摘要输出路径>

# 提取音频后转写并总结
audio-video-transcriber video-summary --input video.mp4 --output summary.txt --extract-audio
```

**参数说明**：
- `--input`：输入视频文件路径（必填）
- `--output`：输出摘要文件路径（必填）
- `--extract-audio`：是否先提取音频轨道（默认开启）

---

## 输入输出规范

### 输入格式

| 类型 | 支持格式 | 说明 |
|------|----------|------|
| 音频 | MP3, WAV, FLAC, AAC, OGG, M4A | 主流音频格式均支持 |
| 视频 | MP4, AVI, MKV, MOV, WEBM | 自动提取音频轨道处理 |

**输入要求**：
- 文件路径必须为绝对路径或相对于工作目录的有效路径
- 音频采样率建议 ≥ 16kHz
- 单文件最大建议 ≤ 2GB

### 输出格式

| 输出类型 | 格式 | 内容说明 |
|----------|------|----------|
| 转录文本 | `.txt` / `.srt` / `.vtt` | 纯文本或带时间轴字幕格式 |
| 总结文本 | `.txt` / `.md` | 结构化摘要，包含关键要点 |

---

## 注意事项

### 文件大小限制
- 推荐处理文件大小：≤ 500MB
- 最大支持文件大小：≤ 2GB（受内存限制）
- 超大文件建议先分割处理

### 语言支持
- **高准确度**：英语、中文（普通话）、日语、韩语、法语、德语、西班牙语
- **中等准确度**：其他 Whisper 支持的 99+ 种语言
- 方言/口音识别准确度会有所下降

### 准确度说明
- 清晰录音（无背景噪音）：转录准确度 ≥ 95%
- 一般环境录音：转录准确度 80%-90%
- 嘈杂环境/多人同时说话：准确度显著下降

### 性能参考
| 模型 | 1分钟音频处理时间（CPU） | 1分钟音频处理时间（GPU） |
|------|--------------------------|--------------------------|
| tiny | ~5秒 | ~1秒 |
| base | ~10秒 | ~2秒 |
| small | ~20秒 | ~4秒 |
| medium | ~40秒 | ~8秒 |
| large | ~60秒 | ~12秒 |

### 其他限制
- 不支持实时流式转录
- 音乐/纯音乐内容无法有效转录
- 专业术语/人名可能需要后处理校正
- 总结质量依赖于转录文本的完整度

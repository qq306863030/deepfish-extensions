# @deepfish-ai/ffmpeg7-media-tools

[English](./README.md) | 中文

基于FFmpeg 7的音频视频处理工具函数集，包含24个媒体处理函数，支持视频格式转换、音频提取、视频编辑等常见媒体处理任务。

## ✨ 特性

- **全面覆盖**: 24个精心设计的FFmpeg函数，覆盖常见媒体处理需求
- **易于使用**: 统一的参数格式，清晰的错误处理
- **AI友好**: 包含完整的AI智能体描述信息
- **跨平台**: 支持Windows、macOS和Linux系统
- **TypeScript友好**: 完整的JSDoc注释和类型提示

## 🚀 快速开始

### 前提条件

首先，安装全局deepfish-ai库：

```bash
npm install deepfish-ai -g
```

### 安装

全局安装本包：

```bash
npm install @deepfish-ai/ffmpeg7-media-tools -g
```

### FFmpeg安装

本工具集需要FFmpeg 7或更高版本。使用前请先安装FFmpeg 7：

- **Windows**: 从 https://ffmpeg.org/download.html 下载FFmpeg 7并添加到系统PATH
- **macOS**: `brew install ffmpeg@7` 或 `brew install ffmpeg`
- **Linux**: 使用静态构建或发行版软件包

验证安装：`ffmpeg -version` 应显示版本7.0或更高。

## 📋 函数列表

工具集提供24个函数，分为以下类别：

### 安装检测 (1个函数)

| 函数名 | 描述 |
|--------|------|
| `ffmpeg_checkFfmpegInstallation` | 检测FFmpeg是否安装和版本检测 |

### 视频处理 (18个函数)

| 函数名 | 描述 |
|--------|------|
| `ffmpeg_convertVideoFormat` | 转换视频格式 |
| `ffmpeg_resizeVideo` | 调整视频尺寸 |
| `ffmpeg_trimVideo` | 剪切视频片段 |
| `ffmpeg_mergeVideos` | 合并多个视频文件 |
| `ffmpeg_adjustBitrate` | 调整视频比特率 |
| `ffmpeg_addWatermark` | 添加水印 |
| `ffmpeg_mergeVideoAudio` | 合并视频和音频 |
| `ffmpeg_videoToGif` | 将视频转换为GIF动图 |
| `ffmpeg_cropVideo` | 裁剪视频区域 |
| `ffmpeg_rotateVideo` | 旋转视频 |
| `ffmpeg_changeVideoSpeed` | 改变视频播放速度 |
| `ffmpeg_addSubtitles` | 添加字幕到视频 |
| `ffmpeg_addTextOverlay` | 添加文本叠加到视频 |
| `ffmpeg_adjustVideoVolume` | 调整视频音量 |
| `ffmpeg_extractVideoFrames` | 提取视频帧为图片序列 |
| `ffmpeg_extractVideoThumbnail` | 提取视频缩略图 |
| `ffmpeg_compressVideo` | 压缩视频（调整CRF） |
| `ffmpeg_concatVideos` | 拼接多个视频文件 |

### 音频处理 (5个函数)

| 函数名 | 描述 |
|--------|------|
| `ffmpeg_extractAudioFromVideo` | 从视频中提取音频 |
| `ffmpeg_convertAudioFormat` | 转换音频格式 |
| `ffmpeg_adjustAudioVolume` | 调整音频音量 |
| `ffmpeg_mixAudios` | 混合多个音频文件 |

### 媒体信息 (1个函数)

| 函数名 | 描述 |
|--------|------|
| `ffmpeg_getMediaInfo` | 获取媒体文件信息 |

## 🏗️ 项目结构

```
ffmpeg7-media-tools/
├── ffmpeg-functions.js     # 24个FFmpeg功能函数实现
├── ffmpeg-descriptions.js  # AI智能体描述信息
├── index.js                # 主入口文件，重新导出功能
├── package.json            # 项目配置
├── README.md               # 英文文档
└── README_CN.md           # 中文文档（本文档）
```

## ⚠️ 注意事项

1. **FFmpeg版本**: 本工具集基于FFmpeg 7设计，建议使用FFmpeg 7.0或更高版本
2. **文件路径**: 所有文件路径建议使用绝对路径，相对路径可能因工作目录不同而产生问题
3. **错误处理**: 所有函数都包含错误处理，执行失败时会抛出详细的错误信息
4. **资源消耗**: 视频处理是CPU密集型任务，大文件处理时请注意系统资源
5. **输出目录**: 请确保输出目录存在，否则某些函数可能无法正常创建输出文件

## 🔍 故障排除

### FFmpeg未找到
```
Error: FFmpeg is not installed or not in system PATH
```
**解决方案**: 
- 确认FFmpeg已正确安装
- 将FFmpeg添加到系统PATH环境变量
- 重启终端或IDE使环境变量生效

### 文件不存在
```
Error: Input file does not exist: /path/to/file.mp4
```
**解决方案**:
- 确认文件路径正确
- 使用绝对路径而非相对路径
- 检查文件权限

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目。在提交PR前，请确保：

1. 代码风格一致
2. 添加相应的测试
3. 更新文档（包括API文档和示例）
4. 函数参数格式统一

## 📄 许可证

MIT License - 详见LICENSE文件

## 📞 支持

如有问题或建议，请：
1. 查看本文档的故障排除部分
2. 提交GitHub Issue
3. 联系维护团队

---

**最后更新**: 2026  
**版本**: 1.0.0  
**FFmpeg版本**: 7.0+
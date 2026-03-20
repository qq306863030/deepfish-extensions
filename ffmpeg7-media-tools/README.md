# @deepfish-ai/ffmpeg7-media-tools

基于FFmpeg 7的音频视频处理工具函数集，包含23个媒体处理函数，支持视频格式转换、音频提取、视频编辑等常见媒体处理任务。

## ✨ 特性

- **全面覆盖**: 23个精心设计的FFmpeg函数，覆盖常见媒体处理需求
- **易于使用**: 统一的参数格式，清晰的错误处理
- **AI友好**: 包含完整的AI智能体描述信息
- **跨平台**: 支持Windows、macOS和Linux系统
- **TypeScript友好**: 完整的JSDoc注释和类型提示

## 📦 安装

### 前提条件

需要先安装FFmpeg 7或更高版本：

#### Windows
1. 下载FFmpeg：https://ffmpeg.org/download.html
2. 解压并添加到系统PATH环境变量
3. 验证安装：`ffmpeg -version`

#### macOS
```bash
brew install ffmpeg
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install ffmpeg
```

### 安装包
```bash
npm install @deepfish-ai/ffmpeg7-media-tools
```

## 🚀 快速开始

```javascript
const { functions } = require('@deepfish-ai/ffmpeg7-media-tools');

// 1. 检查FFmpeg安装
const checkResult = await functions.ffmpeg_checkFfmpegInstallation({
  minVersion: '7.0.0'
});

// 2. 转换视频格式
const convertResult = await functions.ffmpeg_convertVideoFormat({
  inputPath: '/path/to/input.avi',
  outputPath: '/path/to/output.mp4',
  format: 'mp4',
  quality: '-crf 23'
});

// 3. 从视频中提取音频
const audioResult = await functions.ffmpeg_extractAudioFromVideo({
  videoPath: '/path/to/video.mp4',
  audioPath: '/path/to/audio.mp3',
  audioFormat: 'mp3'
});
```

## 📋 API参考

### 安装检测 (1个)

| 函数名 | 描述 | 主要参数 |
|--------|------|----------|
| `ffmpeg_checkFfmpegInstallation` | 检测FFmpeg是否安装和版本检测 | `minVersion` |

### 视频处理 (17个)

| 函数名 | 描述 | 主要参数 |
|--------|------|----------|
| `ffmpeg_convertVideoFormat` | 转换视频格式 | `inputPath`, `outputPath`, `format`, `quality` |
| `ffmpeg_resizeVideo` | 调整视频尺寸 | `inputPath`, `outputPath`, `width`, `height`, `keepAspectRatio` |
| `ffmpeg_trimVideo` | 剪切视频片段 | `inputPath`, `outputPath`, `startTime`, `duration` |
| `ffmpeg_mergeVideos` | 合并多个视频文件 | `videoPaths`, `outputPath`, `method` |
| `ffmpeg_adjustBitrate` | 调整视频比特率 | `inputPath`, `outputPath`, `bitrate`, `audioBitrate` |
| `ffmpeg_addWatermark` | 添加水印 | `inputPath`, `outputPath`, `watermarkPath`, `position`, `opacity` |
| `ffmpeg_mergeVideoAudio` | 合并视频和音频 | `videoPath`, `audioPath`, `outputPath`, `sync` |
| `ffmpeg_videoToGif` | 将视频转换为GIF动图 | `videoPath`, `outputPath`, `startTime`, `duration`, `fps`, `width` |
| `ffmpeg_cropVideo` | 裁剪视频区域 | `videoPath`, `outputPath`, `x`, `y`, `width`, `height` |
| `ffmpeg_rotateVideo` | 旋转视频 | `videoPath`, `outputPath`, `angle` |
| `ffmpeg_changeVideoSpeed` | 改变视频播放速度 | `videoPath`, `outputPath`, `speed` |
| `ffmpeg_addSubtitles` | 添加字幕到视频 | `videoPath`, `subtitlePath`, `outputPath`, `encoding` |
| `ffmpeg_addTextOverlay` | 添加文本叠加到视频 | `videoPath`, `outputPath`, `text`, `x`, `y`, `fontSize`, `fontColor`, `startTime`, `duration` |
| `ffmpeg_extractVideoFrames` | 提取视频帧为图片序列 | `videoPath`, `outputDir`, `fps`, `format`, `startTime`, `duration` |
| `ffmpeg_extractVideoThumbnail` | 提取视频缩略图 | `videoPath`, `outputPath`, `time`, `size` |
| `ffmpeg_compressVideo` | 压缩视频（调整CRF） | `videoPath`, `outputPath`, `crf`, `preset` |
| `ffmpeg_concatVideos` | 拼接多个视频文件 | `videoPaths`, `outputPath`, `transition` |

### 音频处理 (5个)

| 函数名 | 描述 | 主要参数 |
|--------|------|----------|
| `ffmpeg_extractAudioFromVideo` | 从视频中提取音频 | `videoPath`, `audioPath`, `audioFormat` |
| `ffmpeg_convertAudioFormat` | 转换音频格式 | `inputPath`, `outputPath`, `format`, `bitrate` |
| `ffmpeg_adjustAudioVolume` | 调整音频音量 | `inputPath`, `outputPath`, `volume` |
| `ffmpeg_mixAudios` | 混合多个音频文件 | `audioPaths`, `outputPath`, `volumes` |

### 媒体信息 (1个)

| 函数名 | 描述 | 主要参数 |
|--------|------|----------|
| `ffmpeg_getMediaInfo` | 获取媒体文件信息 | `mediaPath` |

## 🔧 详细使用示例

### 视频格式转换
```javascript
const result = await functions.ffmpeg_convertVideoFormat({
  inputPath: 'input.avi',
  outputPath: 'output.mp4',
  format: 'mp4',
  quality: '-crf 23'
});
```

### 调整视频尺寸
```javascript
const result = await functions.ffmpeg_resizeVideo({
  inputPath: 'input.mp4',
  outputPath: 'output_720p.mp4',
  width: 1280,
  height: 720,
  keepAspectRatio: true
});
```

### 视频裁剪
```javascript
const result = await functions.ffmpeg_cropVideo({
  videoPath: 'input.mp4',
  outputPath: 'output_cropped.mp4',
  x: 100,
  y: 100,
  width: 800,
  height: 600
});
```

### 添加水印
```javascript
const result = await functions.ffmpeg_addWatermark({
  inputPath: 'video.mp4',
  outputPath: 'video_with_logo.mp4',
  watermarkPath: 'logo.png',
  position: 'top-right',
  opacity: 0.7
});
```

### 从视频中提取音频
```javascript
const result = await functions.ffmpeg_extractAudioFromVideo({
  videoPath: 'video.mp4',
  audioPath: 'audio.mp3',
  audioFormat: 'mp3'
});
```

### 批量处理示例
```javascript
// 批量压缩视频
const videos = ['video1.mp4', 'video2.mp4', 'video3.mp4'];

for (const video of videos) {
  await functions.ffmpeg_compressVideo({
    videoPath: video,
    outputPath: `compressed_${video}`,
    crf: 28, // 更高的CRF值表示更强的压缩
    preset: 'slow'
  });
}
```

## 🏗️ 项目结构

```
ffmpeg7-media-tools/
├── ffmpeg-functions.js     # 23个FFmpeg功能函数实现
├── ffmpeg-descriptions.js  # AI智能体描述信息
├── index.js                # 主入口文件，重新导出功能
├── package.json            # 项目配置
└── README.md               # 本文档
```

### 文件说明

- **ffmpeg-functions.js**: 包含所有23个FFmpeg媒体处理函数的实现，每个函数都有完整的错误处理和参数验证
- **ffmpeg-descriptions.js**: 为AI智能体提供的函数描述信息，包含详细的参数说明和功能描述
- **index.js**: 统一导出接口，便于模块化使用

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

### 格式不支持
```
Error: Unsupported video format: .xyz
```
**解决方案**:
- 检查输入文件格式是否被FFmpeg支持
- 尝试使用`ffmpeg_convertVideoFormat`先转换格式

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

**最后更新**: 2026年  
**版本**: 1.0.0  
**FFmpeg版本**: 7.0+
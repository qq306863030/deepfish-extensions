# FFmpeg 7 媒体工具集成文件

## 概述

此文件是 `ffmpegTools.js` 和 `index.js` 的集成版本，合并了两个文件的功能并删除了重复部分。

## 集成结果

### 文件信息
- **集成文件**: `ffmpeg-integrated.js`
- **文件大小**: ~23KB
- **总函数数**: 13个
- **总描述数**: 13个
- **命名规范**: `ffmpeg_` 前缀

### 功能分类

#### 1. 安装检测 (1个)
- `ffmpeg_checkFfmpegInstallation` - 检测FFmpeg是否安装和版本检测

#### 2. 视频处理 (7个)
- `ffmpeg_convertVideoFormat` - 转换视频格式
- `ffmpeg_resizeVideo` - 调整视频尺寸
- `ffmpeg_trimVideo` - 剪切视频片段
- `ffmpeg_mergeVideos` - 合并多个视频文件
- `ffmpeg_adjustBitrate` - 调整视频比特率
- `ffmpeg_addWatermark` - 添加水印
- `ffmpeg_mergeVideoAudio` - 合并视频和音频

#### 3. 音频处理 (3个)
- `ffmpeg_extractAudioFromVideo` - 从视频中提取音频
- `ffmpeg_convertAudioFormat` - 转换音频格式
- `ffmpeg_adjustAudioVolume` - 调整音频音量

#### 4. 媒体信息 (2个)
- `ffmpeg_extractVideoThumbnail` - 提取视频缩略图
- `ffmpeg_getMediaInfo` - 获取媒体文件信息

## 源文件对比

| 源文件 | 原函数数 | 说明 |
|--------|----------|------|
| `ffmpegTools.js` | 10个 | 使用 `ffmpeg_` 前缀 |
| `index.js` | 10个 | 使用 `ffmpegMediaTools_` 前缀 |
| **集成文件** | **13个** | **去重后全部功能** |

## 重复功能处理

### 完全合并的功能
1. **FFmpeg安装检测** - 采用 `ffmpegTools.js` 的实现（平台检测更详细）
2. **视频格式转换** - 采用 `index.js` 的实现（扩展名自动处理）
3. **音频提取** - 采用 `index.js` 的实现（参数更清晰）
4. **视频尺寸调整** - 采用 `index.js` 的实现（宽高比保持选项）
5. **缩略图生成** - 采用 `index.js` 的实现（参数更完整）
6. **媒体信息获取** - 采用 `index.js` 的实现（使用ffprobe更专业）

### 保留的独特功能
#### 来自 `ffmpegTools.js`:
- `ffmpeg_adjustBitrate` - 调整视频比特率
- `ffmpeg_addWatermark` - 添加水印
- `ffmpeg_mergeVideoAudio` - 合并视频和音频

#### 来自 `index.js`:
- `ffmpeg_convertAudioFormat` - 转换音频格式
- `ffmpeg_adjustAudioVolume` - 调整音频音量
- `ffmpeg_mergeVideos` - 合并多个视频（与上面的mergeVideoAudio不同）

### 参数标准化
所有函数统一使用对象参数格式，例如：
```javascript
// 旧格式（不一致）
await ffmpeg_convertVideoFormat(inputPath, outputPath, format, quality);

// 新格式（统一）
await ffmpeg_convertVideoFormat({
  inputPath: inputPath,
  outputPath: outputPath,
  format: format,
  quality: quality
});
```

## 使用示例

```javascript
// 1. 检查FFmpeg安装
const checkResult = await ffmpeg_checkFfmpegInstallation({
  minVersion: '7.0.0'
});

// 2. 转换视频格式
const convertResult = await ffmpeg_convertVideoFormat({
  inputPath: '/path/to/input.avi',
  outputPath: '/path/to/output.mp4',
  format: 'mp4',
  quality: '-crf 23'
});

// 3. 提取音频
const audioResult = await ffmpeg_extractAudioFromVideo({
  videoPath: '/path/to/video.mp4',
  audioPath: '/path/to/audio.mp3',
  audioFormat: 'mp3'
});
```

## 向后兼容性考虑

由于命名规范从 `ffmpegMediaTools_` 前缀改为 `ffmpeg_` 前缀，如果需要保持向后兼容，可以创建别名：

```javascript
// 在集成文件中添加以下代码可实现向后兼容
functions.ffmpegMediaTools_checkFFmpegInstallation = functions.ffmpeg_checkFfmpegInstallation;
functions.ffmpegMediaTools_convertVideoFormat = functions.ffmpeg_convertVideoFormat;
// ... 其他函数类似
```

## 建议

1. **直接使用集成文件**: 将 `ffmpeg-integrated.js` 重命名为 `index.js` 并更新 `package.json`
2. **创建别名文件**: 创建新的 `index.js` 重新导出集成文件的功能
3. **更新示例**: 更新 `example.js` 使用新的函数名

## 校验结果

✓ 所有13个函数都有对应的描述
✓ 没有重复的函数定义
✓ 模块导出正确
✓ 内部辅助函数完整
✓ 参数格式统一

集成完成时间: 2024年
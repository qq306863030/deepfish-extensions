# @deepfish-ai/ffmpeg7-media-tools

English | [中文](https://github.com/qq306863030/deepfish-extensions/blob/master/deepfish-ffmpeg7-media-tools/README_CN.md)

A comprehensive FFmpeg 7 based audio and video processing toolkit with 24 media processing functions, supporting video format conversion, audio extraction, video editing, and other common media processing tasks.

## ✨ Features

- **Comprehensive Coverage**: 24 carefully designed FFmpeg functions covering common media processing needs
- **Easy to Use**: Unified parameter format, clear error handling
- **AI Friendly**: Complete AI agent description information included
- **Cross-Platform**: Supports Windows, macOS, and Linux systems
- **TypeScript Friendly**: Complete JSDoc comments and type hints

## 🚀 Quick Start

Follow these three steps to install and use this extension:

### Step 1: Install DeepFish AI
First, install the global deepfish-ai library (if not already installed):

```bash
npm install deepfish-ai -g
```

### Step 2: Install This Extension
Install this package globally:

```bash
npm install @deepfish-ai/ffmpeg7-media-tools -g
```

### Step 3: Use in DeepFish AI
Once installed, you can use the extension functions in DeepFish AI by simply asking the AI to perform media processing tasks. For example:

```bash
ai convert video.mp4 to avi format
```

or

```bash
ai extract audio from video.mp4
```

The AI will automatically use the appropriate FFmpeg functions from this extension.

### FFmpeg Installation

This toolkit requires FFmpeg 7 or higher. Please install FFmpeg 7 before using:

- **Windows**: Download FFmpeg 7 from https://ffmpeg.org/download.html and add to system PATH
- **macOS**: `brew install ffmpeg@7` or `brew install ffmpeg`
- **Linux**: Use static builds or distribution packages

Verify installation: `ffmpeg -version` should show version 7.0 or higher.

## 📋 Function List

The toolkit provides 24 functions divided into the following categories:

### Installation Detection (1 function)

| Function Name | Description |
|---------------|-------------|
| `ffmpeg_checkFfmpegInstallation` | Check FFmpeg installation and version detection |

### Video Processing (18 functions)

| Function Name | Description |
|---------------|-------------|
| `ffmpeg_convertVideoFormat` | Convert video format |
| `ffmpeg_resizeVideo` | Resize video dimensions |
| `ffmpeg_trimVideo` | Trim video segment |
| `ffmpeg_mergeVideos` | Merge multiple video files |
| `ffmpeg_adjustBitrate` | Adjust video bitrate |
| `ffmpeg_addWatermark` | Add watermark to video |
| `ffmpeg_mergeVideoAudio` | Merge video and audio |
| `ffmpeg_videoToGif` | Convert video to animated GIF |
| `ffmpeg_cropVideo` | Crop video region |
| `ffmpeg_rotateVideo` | Rotate video |
| `ffmpeg_changeVideoSpeed` | Change video playback speed |
| `ffmpeg_addSubtitles` | Add subtitles to video |
| `ffmpeg_addTextOverlay` | Add text overlay to video |
| `ffmpeg_adjustVideoVolume` | Adjust video volume |
| `ffmpeg_extractVideoFrames` | Extract video frames as image sequence |
| `ffmpeg_extractVideoThumbnail` | Extract video thumbnail |
| `ffmpeg_compressVideo` | Compress video (adjust CRF) |
| `ffmpeg_concatVideos` | Concatenate multiple video files |

### Audio Processing (5 functions)

| Function Name | Description |
|---------------|-------------|
| `ffmpeg_extractAudioFromVideo` | Extract audio from video |
| `ffmpeg_convertAudioFormat` | Convert audio format |
| `ffmpeg_adjustAudioVolume` | Adjust audio volume |
| `ffmpeg_mixAudios` | Mix multiple audio files |

### Media Information (1 function)

| Function Name | Description |
|---------------|-------------|
| `ffmpeg_getMediaInfo` | Get media file information |

## 🏗️ Project Structure

```
ffmpeg7-media-tools/
├── ffmpeg-functions.js     # 24 FFmpeg function implementations
├── ffmpeg-descriptions.js  # AI agent description information
├── index.js                # Main entry file, re-exports functions
├── package.json            # Project configuration
├── README.md               # English documentation (this file)
└── README_CN.md           # Chinese documentation
```

## ⚠️ Notes

1. **FFmpeg Version**: This toolkit is designed for FFmpeg 7, recommended to use FFmpeg 7.0 or higher
2. **File Paths**: Use absolute paths for all file operations
3. **Error Handling**: All functions include error handling with detailed error messages
4. **Resource Consumption**: Video processing is CPU-intensive, monitor system resources when processing large files
5. **Output Directory**: Ensure output directories exist before processing

## 🔍 Troubleshooting

### FFmpeg Not Found
```
Error: FFmpeg is not installed or not in system PATH
```
**Solution**: 
- Confirm FFmpeg is correctly installed
- Add FFmpeg to system PATH environment variable
- Restart terminal or IDE for environment variables to take effect

### File Does Not Exist
```
Error: Input file does not exist: /path/to/file.mp4
```
**Solution**:
- Confirm file path is correct
- Use absolute paths instead of relative paths
- Check file permissions

## 🤝 Contributing

Welcome to submit Issues and Pull Requests to improve this project. Before submitting a PR, please ensure:

1. Code style is consistent
2. Add appropriate tests
3. Update documentation (including API docs and examples)
4. Function parameter formats are unified

## 📄 License

MIT License - See LICENSE file

## 📞 Support

For questions or suggestions, please:

1. Check the Troubleshooting section in this documentation
2. Submit a GitHub Issue
3. Contact the maintenance team

---

**Last Updated**: 2026  
**Version**: 1.0.0  
**FFmpeg Version**: 7.0+
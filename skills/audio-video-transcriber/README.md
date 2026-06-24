# Audio-Video Transcriber Skill

English | [中文](./README_CN.md)

## Overall Description

This Skill provides comprehensive audio-video content processing capabilities, with core functions including:

- **Audio-to-Text Transcription**: Accurately transcribe speech content from audio files into text
- **Audio Content Summarization**: Intelligently summarize audio transcription results and extract key points
- **Video Content Abstraction**: Extract video audio tracks and generate content summaries

### Use Cases
- Meeting recording transcription and minutes generation
- Quick browsing of podcast/interview content
- Online course/lecture note organization
- Quick preview and summarization of video content

### Capability Boundaries
- Only processes audio-video content containing speech
- Transcription quality depends on audio clarity and background noise
- Summarization is based on transcribed text, not direct understanding of audio-video visual content

---

## Quick Start

### ① Install deepfish-ai globally

```bash
npm install deepfish-ai -g
```

### ② Install and enable this Skill

```bash
ai skill add audio-video-transcriber
ai skill ls
ai skill enable audio-video-transcriber
```

### ③ Usage Examples

```bash
# Transcribe audio to text
ai transcribe this audio

# Summarize audio content
ai summarize this audio

# Extract video summary
ai extract summary from this video
```

---

## Environment Dependencies

Before using this Skill, ensure the following dependencies are installed on your system:

| Dependency | Version Requirement | Purpose | Installation |
|------------|---------------------|---------|--------------|
| FFmpeg | ≥ 4.0 | Audio-video format conversion, audio extraction | `apt install ffmpeg` or download from official website |
| Whisper / whisper.cpp | Latest stable release | Speech recognition transcription | `pip install openai-whisper` or compile whisper.cpp |
| Node.js | ≥ 16.0 | Runtime environment | Download from official website |
| Disk Space | ≥ 2GB | Model storage and temporary files | - |

### Optional Dependencies
- **GPU Support**: NVIDIA CUDA environment can significantly improve transcription speed
- **Language Models**: Download corresponding Whisper models (tiny/base/small/medium/large) based on target language

---

## Features

### 1. Audio-to-Text Transcription
- Supports multiple audio formats (MP3, WAV, FLAC, AAC, OGG, M4A)
- Supports language specification (Chinese, English, and 99+ languages)
- Supports multiple model precision options (tiny/base/small/medium/large)
- Output supports plain text, SRT subtitle, and VTT subtitle formats

### 2. Audio Content Summarization
- Intelligent summarization after automatic transcription
- Customizable summary length
- Outputs structured key points and critical information

### 3. Video Content Abstraction
- Automatically extracts video audio tracks
- Transcribes and generates video content summaries
- Supports mainstream video formats (MP4, AVI, MKV, MOV, WEBM)

---

## Directory Structure

```
audio-video-transcriber/
├── SKILL.md          # Skill definition file (core configuration and instruction guide)
├── README.md         # English documentation
├── README_CN.md      # Chinese documentation
├── assets/           # Resource files directory (icons, sample files, etc.)
└── scripts/          # Scripts directory (processing scripts, utility scripts, etc.)
```

---

## Usage Commands

### 1. Audio-to-Text Transcription

```bash
# Basic usage
audio-video-transcriber transcribe --input <audio_file_path> --output <output_text_path>

# Specify language
audio-video-transcriber transcribe --input audio.mp3 --output transcript.txt --language zh

# Specify model precision
audio-video-transcriber transcribe --input audio.mp3 --output transcript.txt --model medium
```

**Parameters**:
- `--input`: Input audio file path (required)
- `--output`: Output text file path (required)
- `--language`: Target language code, e.g., `zh` (Chinese), `en` (English)
- `--model`: Whisper model size, options: `tiny`/`base`/`small`/`medium`/`large`

### 2. Audio Content Summarization

```bash
# Basic usage
audio-video-transcriber summarize --input <audio_file_path> --output <summary_output_path>

# Specify summary length
audio-video-transcriber summarize --input audio.mp3 --output summary.txt --max-length 500
```

**Parameters**:
- `--input`: Input audio file path (required)
- `--output`: Output summary file path (required)
- `--max-length`: Maximum summary word count, default 1000

### 3. Video Content Abstraction

```bash
# Basic usage
audio-video-transcriber video-summary --input <video_file_path> --output <summary_output_path>

# Extract audio then transcribe and summarize
audio-video-transcriber video-summary --input video.mp4 --output summary.txt --extract-audio
```

**Parameters**:
- `--input`: Input video file path (required)
- `--output`: Output summary file path (required)
- `--extract-audio`: Whether to extract audio track first (enabled by default)

---

## Input/Output Specifications

### Input Formats

| Type | Supported Formats | Description |
|------|-------------------|-------------|
| Audio | MP3, WAV, FLAC, AAC, OGG, M4A | All mainstream audio formats supported |
| Video | MP4, AVI, MKV, MOV, WEBM | Audio track automatically extracted for processing |

**Input Requirements**:
- File path must be an absolute path or a valid path relative to the working directory
- Recommended audio sample rate ≥ 16kHz
- Maximum recommended single file size ≤ 2GB

### Output Formats

| Output Type | Format | Content Description |
|-------------|--------|---------------------|
| Transcription Text | `.txt` / `.srt` / `.vtt` | Plain text or time-coded subtitle format |
| Summary Text | `.txt` / `.md` | Structured summary with key points |

---

## Notes and Limitations

### File Size Limits
- Recommended processing file size: ≤ 500MB
- Maximum supported file size: ≤ 2GB (memory-dependent)
- For oversized files, consider splitting before processing

### Language Support
- **High Accuracy**: English, Chinese (Mandarin), Japanese, Korean, French, German, Spanish
- **Medium Accuracy**: 99+ other languages supported by Whisper
- Dialect/accent recognition accuracy may decrease

### Accuracy Guidelines
- Clear recording (no background noise): transcription accuracy ≥ 95%
- General environment recording: transcription accuracy 80%-90%
- Noisy environment / multiple speakers: accuracy drops significantly

### Performance Reference
| Model | 1-min Audio Processing Time (CPU) | 1-min Audio Processing Time (GPU) |
|-------|-----------------------------------|-----------------------------------|
| tiny | ~5 seconds | ~1 second |
| base | ~10 seconds | ~2 seconds |
| small | ~20 seconds | ~4 seconds |
| medium | ~40 seconds | ~8 seconds |
| large | ~60 seconds | ~12 seconds |

### Other Limitations
- Real-time streaming transcription is not supported
- Music/instrumental content cannot be effectively transcribed
- Technical terms/names may require post-processing correction
- Summary quality depends on the completeness of the transcribed text

[English](README.md)|[中文](README_CN.md)

## Quick Start

```bash
npm install -g deepfish-ai

ai config add # Select the Deepseek option and input your DeepSeek API key
ai use deepseek
```

```bash
# Add extensions automatically
npm install pdf-to-long-img -g
```

```bash
# Add extensions manually
cd ./
npm install
ai ext add ./pdf-to-long-img/index.js

# Add extensions in batch manually
cd ./
ai "Run npm install in each subdirectory respectively"
ai ext add .
```

## Extension Description

- `novel-generate` Novel generation

- `pdf-to-long-img` PDF to long image conversion

- `ffmpeg7-media-tools` Audio and video processing (based on ffmpeg7)

## Extension Publishing

```bash
  npm init --scope=deepfish-ai
  npm publish --access=public # After using the --access=public parameter, this setting will be saved, and subsequent publications of this package will no longer require this parameter
```
[中文](README_CN.md)|[English](README.md)

## Quick Start

```bash
npm install -g ai-cmd-tool

ai config add # Select the Deepseek option and enter your DeepSeek API key
ai use deepseek
# Open the current directory and add all files
cd ./
ai "Execute npm install in each subdirectory respectively"
ai ext add .
# Add only a specific extension
cd ./
npm install
ai ext add ./pdf-to-long-img/index.js
```

## Extension Instructions

- `novel-generate` Novel Generation
- `pdf-to-long-img` PDF to Long Image Conversion
[English](README.md)|[中文](README_CN.md)

## Quick Start

```bash
npm install -g deepfish-ai

ai config add # Select the Deepseek option and input your DeepSeek API key
ai use deepseek
```

```bash
# Open the current directory, add all extensions
cd ./
ai "execute npm install in each subdirectory"
ai ext add .
```

```bash
# Add only a specific extension
cd ./
npm install
ai ext add ./deepfish-pdf-to-long-img/index.js
```

```bash
# Install via npm
npm install deepfish-pdf-to-long-img -g
```

## Extension Description

- `deepfish-novel-generate` Novel Generation
- `deepfish-pdf-to-long-img` PDF to Long Image
[English](README.md)|[中文](README_CN.md)

## Quick Start

```bash
npm install -g deepfish-ai

ai config add # Select the Deepseek option and enter your DeepSeek API key
ai use deepseek
```

```bash
# Auto-add extensions
npm install @deepfish-ai/pdf-to-long-img -g
```

```bash
# Manually add extensions
cd ./
npm install
ai ext add ./deepfish-pdf-to-long-img/index.js

# Manually add extensions in batch
cd ./
ai "Execute npm install in each subdirectory respectively"
ai ext add .
```

## Scanning Rules
```
Rules for automatically scanning extension modules when the program starts:
1. Scan locations:
    - node_modules in the npm root directory
    - node_modules in the command execution directory
    - The command execution directory
2. Scan files:
    - Extension packages under the @deepfish-ai directory
    - Extension packages prefixed with 'deepfish-'
    - JS extension files in the command execution directory. A JS file is automatically loaded as an extension if it contains the strings 'module.exports', 'descriptions', and 'functions'.
Manual addition:
1. Manually add a file path.
2. Manually add a directory. Automatically scan all JS files in the current directory and its subdirectories. A JS file is considered an extension file if it contains the strings 'module.exports', 'descriptions', and 'functions'.
3. Manual additions are automatically written to the configuration file.
```

## Extension Descriptions

- `deepfish-novel-generate` Novel Generation

- `deepfish-pdf-to-long-img` PDF to Long Image

- `deepfish-ffmpeg7-media-tools` Audio/Video Processing (based on ffmpeg7)

- `deepfish-sftp-downloader` SFTP Downloader

## Custom Extension Instructions

```
1. Directly use "ai generate extension tool xxxx".
2. Directory names must start with "deepfish-" to be automatically scanned. If the created extension tool exists in the program's execution directory, it can be called directly.
3. Use "ai what functions can you use now" to view extensions and check if your created extension functions are available.
4. When publishing, ensure the package name starts with "deepfish-". After successful publication, execute "npm install deepfish-xxx -g" to use it directly.
5. Note: The aiCli variable is automatically injected into the 'this' context of functions, so arrow functions cannot be used within the 'functions' object.
```

## Extension Publishing

```bash
  npm init --scope=deepfish-ai
  npm publish --access=public # After using the --access=public parameter once, this setting is saved, and subsequent publishes for this package will not require this parameter.
```
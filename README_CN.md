[English](README.md)|[中文](README_CN.md)

## 快速开始

```bash
npm install -g deepfish-ai

ai config add # 选择Deepseek选项,输入你的DeepSeek API key
ai use deepseek
```

```bash
# 自动添加扩展
npm install pdf-to-long-img -g
```

```bash
# 手动添加扩展
cd ./
npm install
ai ext add ./pdf-to-long-img/index.js

# 手动批量添加扩展
cd ./
ai "分别在每个子目录中执行npm install"
ai ext add .
```

## 扩展说明

- `novel-generate` 小说生成

- `pdf-to-long-img` PDF转长图

- `ffmpeg7-media-tools` 音视频处理（基于ffmpeg7）

## 扩展发布

```bash
  npm init --scope=deepfish-ai
  npm publish --access=public # 使用了--access=public参数后，这个设置会被保存，以后对该包的所有后续发布就无需再加这个参数了
```


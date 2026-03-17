[English](README.md)|[中文](README_CN.md)

## 快速开始

```bash
npm install -g deepfish-ai

ai config add # 选择Deepseek选项,输入你的DeepSeek API key
ai use deepseek
```

```bash
# 打开当前目录，全部添加
cd ./
ai "分别在每个子目录中执行npm install"
ai ext add .
```

```bash
# 只添加某一个扩展
cd ./
npm install
ai ext add ./deepfish-pdf-to-long-img/index.js
```

```bash
# 使用npm添加
npm install deepfish-pdf-to-long-img -g
```



## 扩展说明

- `novel-generate` 小说生成
- `pdf-to-long-img` PDF转长图


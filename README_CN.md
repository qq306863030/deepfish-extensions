[English](README.md)|[中文](README_CN.md)

## 快速开始

```bash
npm install -g deepfish-ai

ai config add # 选择Deepseek选项,输入你的DeepSeek API key
ai use deepseek
```

```bash
# 自动添加扩展
npm install @deepfish-ai/pdf-to-long-img -g
```

```bash
# 手动添加扩展
cd ./
npm install
ai ext add ./deepfish-pdf-to-long-img/index.js

# 手动批量添加扩展
cd ./
ai "分别在每个子目录中执行npm install"
ai ext add .
```

## 扫描规则
```
程序启动时自动扫描扩展模块的规则:
1. 扫描位置:
    - npm根目录的node_modules
    - 命令执行目录的node_modules
    - 命令执行目录
2. 扫描文件:
    - @deepfish-ai目录下的扩展包
    - deepfish-开头的扩展包
    - 命令执行目录的js扩展文件，js文件内包含'module.exports'、'descriptions'和'functions'字符串则视为扩展文件自动加载
手动添加：
1.手动添加文件路径
2.手动添加目录，自动扫描当前目录和子目录所有js文件，js文件内包含'module.exports'、'descriptions'和'functions'字符串则视为扩展文件
3.手动添加会自动写入配置文件中
```

## 扩展说明

- `deepfish-novel-generate` 小说生成

- `deepfish-pdf-to-long-img` PDF转长图

- `deepfish-ffmpeg7-media-tools` 音视频处理（基于ffmpeg7）

- `deepfish-sftp-downloader ` sftp下载

## 自定义扩展说明

```
1.直接使用"ai 生成扩展工具xxxx"
2.目录需要以"deepfish-"开头才会被自动扫描，如果程序执行目录中存在创建的扩展工具可直接调用
3.使用"ai 你现在可以使用哪些函数"查看扩展，是否有自己创建的扩展函数
4.发布时注意包名称以"deepfish-"开头，发布成功后执行"npm install deepfish-xxx -g"即可直接使用
5.注意：在函数的this上会自动注入aiCli变量，因此functions对象中不能使用箭头函数
```

## 扩展发布

```bash
  npm init --scope=deepfish-ai
  npm publish --access=public # 使用了--access=public参数后，这个设置会被保存，以后对该包的所有后续发布就无需再加这个参数了
```


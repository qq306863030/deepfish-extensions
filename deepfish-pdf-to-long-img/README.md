# DeepFish PDF转长图工具

一个基于DeepFish框架的扩展工具，用于将PDF文件转换为垂直拼接的长图（PNG格式）。支持单文件转换和批量处理。

## 功能特性

- **PDF转长图**：将PDF的每一页垂直拼接成一个PNG格式的长图
- **批量处理**：支持将目录中的所有PDF文件批量转换为长图
- **高质量输出**：使用scale=2提高图片清晰度
- **自动居中**：每页图片在长图中水平居中显示
- **白色背景**：使用纯白色背景填充页面间的空隙

## 快速开始

```bash
npm install deepfish-ai -g
npm install deepfish-pdf-to-long-img -g

# 需要先配置deepfish
ai 将当前目录下的所有pdf文件转换为长图
```

## 依赖项

- `pdf-to-img`: 用于PDF页面提取
- `sharp`: 用于图片处理和合成
- `fs-extra`: 用于文件系统操作

## 使用方法

### 作为DeepFish扩展工具使用

该工具提供了DeepFish AI工作流扩展所需的接口：

```bash
npm install deepfish-ai -g
npm install deepfish-pdf-to-long-img -g

cd "控制台进入在pdf所在目录的"
ai 将目录中的pdf转换为长图
```

### 直接调用API

#### 1. 转换单个PDF文件

```javascript
const { pdfToLongImage } = require('deepfish-pdf-to-long-img');

// 将单个PDF转换为长图
await pdfToLongImage('input.pdf', 'output.png');
```

#### 2. 批量转换目录中的所有PDF文件

```javascript
const { convertAllPdfsInDirectory } = require('deepfish-pdf-to-long-img');

// 转换指定目录中的所有PDF文件
await convertAllPdfsInDirectory('./pdfs', './output');

// 默认参数：输入目录为当前目录，输出目录为当前目录
await convertAllPdfsInDirectory();
```

### 参数说明

#### pdfToLongImage(pdfPath, outputImagePath)
- `pdfPath`: PDF文件的路径（相对或绝对路径）
- `outputImagePath`: 输出PNG长图的路径（相对或绝对路径）

#### convertAllPdfsInDirectory(inputDir, outputDir)
- `inputDir`: 输入目录路径，默认为当前目录
- `outputDir`: 输出目录路径，默认为当前目录


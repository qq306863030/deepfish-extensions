# 长篇小说网文生成扩展工具使用说明

## 概述

`novelGeneratorTools.js` 是一个专为生成长篇小说设计的扩展工具模块，旨在通过本地文件存储机制规避AI API的上下文长度限制。该模块提供了从大纲创作、章节生成到最终合并成书的完整工作流支持。

## 快速开始

```bash
npm install deepfish-ai -g
npm install deepfish-novel-generate -g

# 需要先配置deepfish
ai 在当前目录中生成一个科幻小说
```

## 核心功能

### 1. `generateNovelChapter` - 生成小说章节
根据章节标题、大纲、风格和字数生成小说章节内容，并保存为本地文件。

**参数：**
- `chapterTitle`: 章节标题
- `outline`: 小说大纲
- `writingStyle`: 写作风格
- `targetWordCount`: 目标字数
- `outputFilePath`: 输出文件路径（可选）

**返回值：** 章节内容字符串

### 2. `createNovelOutline` - 创建小说大纲
生成整个小说的总体大纲，包括情节结构、人物设定、世界观等核心要素。

**参数：**
- `novelTheme`: 小说主题/类型
- `mainCharacters`: 主要角色设定
- `targetTotalChapters`: 总章节数
- `outputFilePath`: 输出文件路径（可选）

**返回值：** 大纲对象（包含情节、人物、章节规划）

### 3. `summarizeChapter` - 生成章节摘要
对已生成的章节内容进行摘要提取，用于后续章节的上下文参考。

**参数：**
- `chapterContent`: 章节内容
- `summaryLength`: 摘要长度（可选）

**返回值：** 章节摘要字符串

### 4. `getNovelContext` - 获取小说上下文
读取指定章节范围的内容，返回摘要或关键信息，用于保持情节连贯性。

**参数：**
- `chapterRange`: 章节范围 [start, end]
- `contextType`: 上下文类型（'summary' | 'keyPoints' | 'full'）
- `novelDirectory`: 小说目录路径

**返回值：** 上下文信息对象

### 5. `mergeNovelChapters` - 合并小说章节
将所有生成的章节合并为一个完整的电子书文件（支持多种格式）。

**参数：**
- `chaptersDirectory`: 章节文件目录
- `outputFormat`: 输出格式（'txt' | 'md' | 'html' | 'epub'）
- `outputFilePath`: 输出文件路径

**返回值：** 合并状态信息

### 6. `analyzeNovelStructure` - 分析小说结构
分析已生成章节的结构，确保情节连贯性和人物一致性。

**参数：**
- `chaptersDirectory`: 章节文件目录
- `outlineFilePath`: 大纲文件路径
- `analysisType`: 分析类型（'consistency' | 'pacing' | 'character'）

**返回值：** 分析报告对象

### 7. `getNovelProgress` - 获取小说进度
统计已生成章节的数量、总字数、完成比例等进度信息。

**参数：**
- `chaptersDirectory`: 章节文件目录
- `totalChapters`: 总章节数（可选）

**返回值：** 进度报告对象

## 使用步骤

### 第1步：环境准备
1. 将 `novelGeneratorTools.js` 文件放置在您的工作流可访问的目录中
2. 确保Node.js环境已安装
3. 确保AI API访问权限已配置

### 第2步：创建小说大纲
```javascript
const outline = await this.Tools.novelGeneratorTools.createNovelOutline({
  novelTheme: "修仙玄幻",
  mainCharacters: "主角：林风，天赋异禀但出身平凡；女主角：云瑶，神秘宗派传人",
  targetTotalChapters: 200,
  outputFilePath: "./novel/outline.json"
});
```

### 第3步：生成章节内容
```javascript
// 循环生成200个章节
for (let i = 1; i <= 200; i++) {
  const chapter = await this.Tools.novelGeneratorTools.generateNovelChapter({
    chapterTitle: `第${i}章 修行之路`,
    outline: outline,
    writingStyle: "古典仙侠风格，文笔优美",
    targetWordCount: 10000,
    outputFilePath: `./novel/chapters/chapter_${i}.txt`
  });
  
  // 每生成10章进行一次总结分析
  if (i % 10 === 0) {
    const context = await this.Tools.novelGeneratorTools.getNovelContext({
      chapterRange: [Math.max(1, i-10), i],
      contextType: "summary",
      novelDirectory: "./novel/chapters"
    });
    
    const analysis = await this.Tools.novelGeneratorTools.analyzeNovelStructure({
      chaptersDirectory: "./novel/chapters",
      outlineFilePath: "./novel/outline.json",
      analysisType: "consistency"
    });
  }
}
```

### 第4步：监控生成进度
```javascript
const progress = await this.Tools.novelGeneratorTools.getNovelProgress({
  chaptersDirectory: "./novel/chapters",
  totalChapters: 200
});

console.log(`已完成 ${progress.completedChapters} 章，共 ${progress.totalWords} 字，完成度 ${progress.completionPercentage}%`);
```

### 第5步：合并成书
```javascript
const mergeResult = await this.Tools.novelGeneratorTools.mergeNovelChapters({
  chaptersDirectory: "./novel/chapters",
  outputFormat: "epub",
  outputFilePath: "./novel/complete/我的小说.epub"
});
```

## 避免API上下文限制的技巧

### 1. 本地文件存储
- 所有章节内容均以`.txt`文件形式存储在本地
- 每次API调用只传递必要的上下文摘要而非完整内容
- 利用文件系统作为"外部记忆"扩展AI的上下文容量

### 2. 智能上下文提取
- 使用`getNovelContext`函数提取关键情节节点
- 根据章节重要性选择摘要粒度
- 保持角色关键信息和情节转折点

### 3. 分批次处理
- 将200章分成20个批次，每批10章
- 每批完成后进行结构分析和上下文更新
- 避免一次性传递过多历史信息

### 4. 进度检查点
- 每完成10章保存一次进度快照
- 记录已生成章节的摘要和关键点
- 便于中断后恢复生成过程

## 文件存储结构

推荐的文件组织方式：
```
./novel/
├── outline.json              # 小说大纲
├── chapters/                 # 章节文件目录
│   ├── chapter_1.txt        # 第1章
│   ├── chapter_2.txt        # 第2章
│   └── ...
├── summaries/               # 章节摘要目录（可选）
│   ├── summary_1-10.json
│   ├── summary_11-20.json
│   └── ...
├── analysis/                # 分析报告目录（可选）
│   ├── analysis_batch1.json
│   └── ...
└── complete/                # 合并后的完整小说
    ├── novel.txt
    └── novel.epub
```

## 注意事项

### 1. API调用频率
- 合理控制API调用频率，避免触发限制
- 考虑使用批处理减少调用次数
- 实现错误重试机制

### 2. 内容一致性
- 定期使用`analyzeNovelStructure`检查一致性
- 保持角色性格、世界观设定的统一
- 注意时间线和情节逻辑的连贯

### 3. 资源管理
- 监控磁盘空间使用情况
- 定期备份重要文件
- 清理临时文件避免空间浪费

### 4. 质量控制
- 设置章节字数下限确保内容充实
- 关键情节章节可进行多次优化
- 读者反馈机制（如需要）

## 故障排除

### 常见问题1：API上下文超限
**症状：** AI返回内容不完整或出错
**解决：** 减少单次传递的上下文内容，使用更精细的摘要

### 常见问题2：情节不连贯
**症状：** 前后章节出现矛盾
**解决：** 增加`analyzeNovelStructure`的调用频率，强化上下文传递

### 常见问题3：生成速度慢
**症状：** 章节生成耗时过长
**解决：** 调整目标字数，优化提示词，考虑并行生成独立支线情节

### 常见问题4：文件管理混乱
**症状：** 找不到特定章节或文件
**解决：** 严格遵循推荐的目录结构，使用进度跟踪功能

## 性能优化建议

1. **缓存机制：** 对频繁使用的大纲、人物设定进行缓存
2. **并行处理：** 独立支线情节可尝试并行生成
3. **增量更新：** 仅更新发生变化的部分内容
4. **压缩存储：** 对历史章节使用压缩格式保存

## 扩展建议

如需进一步扩展功能，可考虑：

1. **多语言支持：** 添加多语言生成和翻译功能
2. **风格迁移：** 实现不同写作风格间的转换
3. **互动生成：** 支持读者选择影响情节走向
4. **自动校对：** 集成语法检查和润色功能

---

通过合理利用本扩展工具，您可以高效地生成长达200万字的长篇小说，同时避免API上下文限制带来的问题。建议在实际使用前先进行小规模测试，熟悉各函数的参数和返回格式。
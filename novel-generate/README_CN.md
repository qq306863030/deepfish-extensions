# 小说生成扩展工具

中文 | [English](README.md)

## 概述

`@deepfish-ai/novel-generate` 是一个专为生成长篇小说设计的AI工作流扩展工具，旨在通过本地文件存储机制规避AI API的上下文长度限制。该模块提供了从大纲创作、章节生成到最终合并成书的完整工作流支持。

## 快速开始

1. 安装deepfish-ai全局库：
   ```bash
   npm install deepfish-ai -g
   ```

2. 安装小说生成扩展工具：
   ```bash
   npm install @deepfish-ai/novel-generate -g
   ```

3. 在AI工作流中调用相关函数生成小说

## 函数列表及功能描述

| 函数名称 | 核心功能 |
|---------|---------|
| `generateNovelChapter` | 根据章节标题、大纲、风格和字数生成小说章节内容，保存为本地文件 |
| `createNovelOutline` | 生成整个小说的总体大纲，包括情节结构、人物设定、主题思想等 |
| `summarizeChapter` | 生成章节摘要，提取关键情节、人物发展和伏笔，用于后续上下文 |
| `getNovelContext` | 读取指定章节范围的内容，返回摘要或关键信息，用于生成后续章节时提供上下文 |
| `mergeNovelChapters` | 将所有章节合并为一个完整小说文件，可添加目录、封面和章节标题 |
| `analyzeNovelStructure` | 分析已生成章节，确保情节连贯性，检查人物发展和情节逻辑 |
| `getNovelProgress` | 获取小说生成进度信息，包括已生成章节数、字数统计等 |

## 使用步骤

### 第1步：环境准备
1. 确保Node.js环境已安装
2. 确保AI API访问权限已配置

### 第2步：创建小说大纲
```javascript
const outline = await this.Tools.novelGenerate.createNovelOutline({
  genre: "修仙玄幻",
  mainCharacters: "主角：林风，天赋异禀但出身平凡；女主角：云瑶，神秘宗派传人",
  targetWordCount: 2000000
});
```

### 第3步：生成章节内容
```javascript
// 循环生成多个章节
for (let i = 1; i <= 100; i++) {
  const chapter = await this.Tools.novelGenerate.generateNovelChapter({
    chapterNumber: i,
    chapterTitle: `第${i}章 修行之路`,
    outline: outline,
    style: "古典仙侠",
    wordCount: 2000
  });
}
```

### 第4步：监控生成进度
```javascript
const progress = await this.Tools.novelGenerate.getNovelProgress({
  includeDetails: true
});

console.log(`已完成 ${progress.completedChapters} 章，共 ${progress.totalWords} 字`);
```

### 第5步：合并成书
```javascript
const mergeResult = await this.Tools.novelGenerate.mergeNovelChapters({
  startChapter: 1,
  endChapter: 100,
  format: "txt",
  includeToc: true
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
- 将长篇小说分成多个批次处理
- 每批完成后进行结构分析和上下文更新
- 避免一次性传递过多历史信息

### 4. 进度检查点
- 定期保存进度快照
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
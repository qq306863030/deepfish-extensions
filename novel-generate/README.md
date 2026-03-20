# Novel Generation Extension Tool

[中文](README_CN.md) | English

## Overview

`@deepfish-ai/novel-generate` is an AI workflow extension tool designed for generating long novels, aiming to bypass AI API context length limitations through local file storage mechanisms. This module provides complete workflow support from outline creation, chapter generation to final book merging.

## Quick Start

1. Install deepfish-ai global library:
   ```bash
   npm install deepfish-ai -g
   ```

2. Install novel generation extension tool:
   ```bash
   npm install @deepfish-ai/novel-generate -g
   ```

3. Call relevant functions in AI workflow to generate novels

## Function List and Description

| Function Name | Core Function |
|--------------|---------------|
| `generateNovelChapter` | Generate novel chapter content based on chapter title, outline, style and word count, save as local file |
| `createNovelOutline` | Generate overall novel outline including plot structure, character settings, theme ideas, etc. |
| `summarizeChapter` | Generate chapter summary, extract key plots, character development and foreshadowing for subsequent context |
| `getNovelContext` | Read content of specified chapter range, return summary or key information for providing context when generating subsequent chapters |
| `mergeNovelChapters` | Merge all chapters into a complete novel file, can add table of contents, cover and chapter titles |
| `analyzeNovelStructure` | Analyze generated chapters to ensure plot coherence, check character development and plot logic |
| `getNovelProgress` | Get novel generation progress information, including number of generated chapters, word count statistics, etc. |

## Usage Steps

### Step 1: Environment Preparation
1. Ensure Node.js environment is installed
2. Ensure AI API access permissions are configured

### Step 2: Create Novel Outline
```javascript
const outline = await this.Tools.novelGenerate.createNovelOutline({
  genre: "Fantasy Cultivation",
  mainCharacters: "Protagonist: Lin Feng, talented but humble origins; Heroine: Yun Yao, mysterious sect heir",
  targetWordCount: 2000000
});
```

### Step 3: Generate Chapter Content
```javascript
// Loop to generate multiple chapters
for (let i = 1; i <= 100; i++) {
  const chapter = await this.Tools.novelGenerate.generateNovelChapter({
    chapterNumber: i,
    chapterTitle: `Chapter ${i}: The Path of Cultivation`,
    outline: outline,
    style: "Classical Xianxia",
    wordCount: 2000
  });
}
```

### Step 4: Monitor Generation Progress
```javascript
const progress = await this.Tools.novelGenerate.getNovelProgress({
  includeDetails: true
});

console.log(`Completed ${progress.completedChapters} chapters, total ${progress.totalWords} words`);
```

### Step 5: Merge into Book
```javascript
const mergeResult = await this.Tools.novelGenerate.mergeNovelChapters({
  startChapter: 1,
  endChapter: 100,
  format: "txt",
  includeToc: true
});
```

## Techniques to Avoid API Context Limitations

### 1. Local File Storage
- All chapter content is stored locally as `.txt` files
- Each API call only passes necessary context summaries rather than complete content
- Use file system as "external memory" to extend AI context capacity

### 2. Intelligent Context Extraction
- Use `getNovelContext` function to extract key plot nodes
- Select summary granularity based on chapter importance
- Maintain key character information and plot twists

### 3. Batch Processing
- Split long novels into multiple batches for processing
- Perform structural analysis and context update after each batch completion
- Avoid passing too much historical information at once

### 4. Progress Checkpoints
- Regularly save progress snapshots
- Record summaries and key points of generated chapters
- Facilitate recovery after interruption

## File Storage Structure

Recommended file organization:
```
./novel/
├── outline.json              # Novel outline
├── chapters/                 # Chapter files directory
│   ├── chapter_1.txt        # Chapter 1
│   ├── chapter_2.txt        # Chapter 2
│   └── ...
├── summaries/               # Chapter summaries directory (optional)
│   ├── summary_1-10.json
│   ├── summary_11-20.json
│   └── ...
├── analysis/                # Analysis reports directory (optional)
│   ├── analysis_batch1.json
│   └── ...
└── complete/                # Merged complete novel
    ├── novel.txt
    └── novel.epub
```

## Precautions

### 1. API Call Frequency
- Reasonably control API call frequency to avoid triggering limits
- Consider using batch processing to reduce call times
- Implement error retry mechanism

### 2. Content Consistency
- Regularly use `analyzeNovelStructure` to check consistency
- Maintain uniformity in character personality and world view settings
- Pay attention to timeline and plot logic coherence

### 3. Resource Management
- Monitor disk space usage
- Regularly backup important files
- Clean temporary files to avoid space waste

### 4. Quality Control
- Set minimum chapter word count to ensure substantial content
- Key plot chapters can be optimized multiple times
- Reader feedback mechanism (if needed)

## Troubleshooting

### Common Issue 1: API Context Limit Exceeded
**Symptoms:** AI returns incomplete content or errors
**Solution:** Reduce context content passed at once, use more refined summaries

### Common Issue 2: Incoherent Plot
**Symptoms:** Contradictions between previous and subsequent chapters
**Solution:** Increase frequency of `analyzeNovelStructure` calls, strengthen context passing

### Common Issue 3: Slow Generation Speed
**Symptoms:** Chapter generation takes too long
**Solution:** Adjust target word count, optimize prompts, consider parallel generation of independent subplots

### Common Issue 4: File Management Confusion
**Symptoms:** Unable to find specific chapters or files
**Solution:** Strictly follow recommended directory structure, use progress tracking functions

## Performance Optimization Suggestions

1. **Caching Mechanism:** Cache frequently used outlines and character settings
2. **Parallel Processing:** Try parallel generation of independent subplots
3. **Incremental Updates:** Only update changed content
4. **Compressed Storage:** Use compressed format for historical chapters

## Extension Suggestions

For further functional expansion, consider:

1. **Multi-language Support:** Add multi-language generation and translation functions
2. **Style Transfer:** Implement conversion between different writing styles
3. **Interactive Generation:** Support reader choices affecting plot direction
4. **Automatic Proofreading:** Integrate grammar checking and polishing functions

---

By rationally using this extension tool, you can efficiently generate long novels up to 2 million words while avoiding problems caused by API context limitations. It is recommended to conduct small-scale tests before actual use to familiarize yourself with the parameters and return formats of each function.
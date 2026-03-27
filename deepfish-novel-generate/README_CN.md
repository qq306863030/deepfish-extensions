# DeepFish 小说创作扩展工具

[English](https://github.com/qq306863030/deepfish-extensions/blob/master/deepfish-novel-generate/README.md) | 中文

## 概述

DeepFish 小说创作扩展工具是一个强大的AI辅助创作工具，专为长篇小说的全流程创作设计。本工具利用AI技术，帮助作者从概念到成品完成完整的小说创作，包括大纲生成、章节规划、内容创作、进度管理和断点续写等功能。

## 核心功能

### 1. 智能大纲生成
- 根据主题思想、小说类型和背景自动生成详细的小说大纲
- 包含核心冲突、主要人物、故事结构等完整要素
- 确保大纲符合目标字数和类型要求

### 2. 章节规划系统
- 基于大纲和目标字数智能规划章节结构
- 为每个章节生成标题、摘要、关键情节和出场人物
- 支持自定义章节数和字数分配

### 3. AI内容创作
- 逐章生成高质量的小说正文内容
- 内置上下文管理机制，保持剧情连贯和人设统一
- 支持长篇创作，自动处理大篇幅文本

### 4. 进度管理与跟踪
- 实时统计写作进度、章节完成情况和字数统计
- 可视化进度报告，了解创作状态
- 支持断点续写，随时继续创作

### 5. 项目管理系统
- 完整的项目文件结构管理
- 自动保存所有创作数据
- 支持多项目同时管理

## 快速开始

### 安装步骤

1. **全局安装 deepfish-ai**
   ```bash
   npm install deepfish-ai -g
   ```

2. **全局安装小说创作扩展**
   ```bash
   npm install deepfish-novel-generate -g
   ```

3. **开始使用**
   在DeepFish AI环境中调用小说创作功能：
   ```
   ai 帮我写一部奇幻小说
   ```

### 基础使用流程

1. **初始化小说项目**
   ```javascript
   const result = await novelCreator_initializeNovel(
     "魔法的旅程",
     "勇气与成长的冒险故事",
     50000,
     "奇幻",
     "中世纪魔法世界"
   );
   ```

2. **生成小说大纲**
   ```javascript
   const result = await novelCreator_generateOutline("novel_data.json");
   ```

3. **生成章节规划**
   ```javascript
   const result = await novelCreator_generateChapterPlan("novel_data.json");
   ```

4. **开始创作**
   ```javascript
   // 生成第1章
   const result = await novelCreator_generateChapterContent("novel_data.json", 0);
   
   // 批量生成3章
   const result = await novelCreator_generateChapterContent("novel_data.json", 1, 3);
   ```

5. **查看进度**
   ```javascript
   const result = await novelCreator_getProgress("novel_data.json");
   ```

6. **断点续写**
   ```javascript
   const result = await novelCreator_resumeWriting("novel_data.json");
   ```

## 函数列表

| 函数名称 | 功能描述 |
|---------|----------|
| `novelCreator_initializeNovel` | 初始化小说项目，创建项目结构和数据文件 |
| `novelCreator_generateOutline` | 基于输入信息生成详细的小说大纲 |
| `novelCreator_generateChapterPlan` | 根据大纲生成章节规划 |
| `novelCreator_generateChapterContent` | 生成指定章节的小说内容 |
| `novelCreator_resumeWriting` | 从断点处继续创作未完成的章节 |
| `novelCreator_getProgress` | 获取当前的写作进度和统计信息 |
| `novelCreator_extensionRule` | 获取扩展工具的使用说明文档 |

## 项目结构

创建的小说项目包含以下文件结构：

```
novel_小说标题/
├── novel_data.json          # 小说核心数据文件
├── outline.md               # 小说大纲文档
├── chapter_plan.md          # 章节规划文档
├── progress.json            # 进度统计文件
├── chapters/                # 章节内容目录
│   ├── chapter_1.md        # 第1章内容
│   ├── chapter_2.md        # 第2章内容
│   └── ...
└── metadata/               # 元数据目录（可选）
```

## 技术特点

### 1. 上下文管理机制
- **记忆系统**：记录关键情节、人物特征和故事设定
- **一致性检查**：确保人物性格、情节发展的连贯性
- **前文摘要**：生成新章节时自动提供前文摘要

### 2. 大篇幅处理能力
- **分章处理**：将长篇小说拆分为可管理的章节
- **进度跟踪**：实时监控写作进度和字数统计
- **断点续写**：支持随时暂停和继续创作

### 3. 智能创作辅助
- **类型适应**：根据不同小说类型调整创作风格
- **主题保持**：确保内容始终围绕核心主题
- **质量控制**：通过多次迭代优化内容质量

## 使用场景

### 1. 新手作家
- 缺乏写作经验，需要AI辅助完成完整作品
- 需要结构化指导和大纲支持
- 希望学习专业创作流程

### 2. 专业作家
- 寻求创作灵感和新思路
- 需要高效处理长篇创作
- 希望减轻写作压力，专注于创意

### 3. 内容创作者
- 需要批量产出小说内容
- 管理多个创作项目
- 保持创作质量和效率

## 最佳实践

### 1. 规划阶段
- 仔细定义主题思想和故事背景
- 设定合理的目标字数
- 选择适合的小说类型

### 2. 创作阶段
- 分批次生成内容，避免一次性生成过多
- 定期检查进度，确保创作方向正确
- 使用断点续写功能保持创作连续性

### 3. 后期处理
- 审核AI生成的内容，进行必要修改
- 保持人物性格和情节的一致性
- 添加个人风格和创意元素

## 常见问题

### Q1: AI生成的内容质量如何保证？
A: 本工具通过以下方式保证质量：
- 详细的大纲和章节规划指导
- 上下文管理确保连贯性
- 多次迭代优化机制
- 用户可以随时审核和修改

### Q2: 支持哪些小说类型？
A: 支持主流小说类型，包括但不限于：
- 奇幻、科幻、悬疑、言情
- 历史、都市、武侠、玄幻
- 其他自定义类型

### Q3: 如何处理长篇小说？
A: 采用分章处理策略：
- 将长篇小说拆分为多个章节
- 每个章节独立生成和保存
- 通过上下文管理保持整体连贯

### Q4: 支持中文和英文创作吗？
A: 目前主要支持中文创作，但也可用于英文创作。字数统计功能同时支持中英文。

### Q5: 数据安全如何保障？
A: 所有创作数据保存在本地，不上传至任何服务器。用户可以完全控制自己的创作内容。

## 技术支持

如有问题或建议，请通过以下方式联系我们：

- GitHub Issues: [deepfish-extensions](https://github.com/qq306863030/deepfish-extensions)
- 文档: [DeepFish AI 文档](https://deepfish.ai/docs)
- 邮箱: support@deepfish.ai

## 版本历史

- v1.0.0 (初始版本)
  - 基础小说创作功能
  - 大纲生成和章节规划
  - 内容生成和进度管理
  - 断点续写支持

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](./LICENSE) 文件。

---

**开始你的创作之旅吧！让AI成为你的创作伙伴，共同打造精彩的小说世界。**
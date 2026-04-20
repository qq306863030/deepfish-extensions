// 小说创作扩展工具 - DeepFish AI Extension
// 提供完整的小说创作功能，包括大纲生成、章节规划、内容生成、进度管理和断点续写

const path = require('path');

// 工具函数：计算中文字数
function countChineseCharacters(text) {
  if (!text) return 0;
  // 匹配中文字符（包括中文标点）
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
  return chineseChars ? chineseChars.length : 0;
}

// 工具函数：计算英文单词数
function countEnglishWords(text) {
  if (!text) return 0;
  // 匹配英文单词
  const words = text.match(/\b[a-zA-Z]+\b/g);
  return words ? words.length : 0;
}

// 工具函数：获取总字数
function getWordCount(text) {
  if (!text) return 0;
  const chineseCount = countChineseCharacters(text);
  const englishCount = countEnglishWords(text);
  // 中文字数 + 英文单词数（近似处理）
  return chineseCount + englishCount;
}

// 工具函数：格式化进度信息
function formatProgress(novelData) {
  const totalChapters = novelData.chapters?.length || 0;
  const completedChapters = novelData.chapters?.filter(ch => ch.content && ch.content.trim()).length || 0;
  const totalWordCount = novelData.chapters?.reduce((sum, ch) => sum + getWordCount(ch.content || ''), 0) || 0;
  const targetWordCount = novelData.targetWordCount || 0;
  const progressPercent = targetWordCount > 0 ? Math.round((totalWordCount / targetWordCount) * 100) : 0;
  
  return {
    novelTitle: novelData.title || '未命名小说',
    totalChapters,
    completedChapters,
    totalWordCount,
    targetWordCount,
    progressPercent,
    completionRate: totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0
  };
}

// 函数描述数组
const descriptions = [
  {
    name: 'novelCreator_initializeNovel',
    description: '小说创作:初始化小说项目',
    parameters: {
      type: 'object',
      properties: {
        novelTitle: { type: 'string', description: '小说标题' },
        theme: { type: 'string', description: '主题思想/核心概念' },
        targetWordCount: { type: 'number', description: '目标字数' },
        novelType: { type: 'string', description: '小说类型（如：奇幻、科幻、言情、悬疑等）' },
        background: { type: 'string', description: '故事背景/世界观' },
        outputDir: { type: 'string', description: '输出目录路径（可选，默认为当前目录）' }
      },
      required: ['novelTitle', 'theme', 'targetWordCount', 'novelType', 'background']
    }
  },
  {
    name: 'novelCreator_generateOutline',
    description: '小说创作:生成小说大纲',
    parameters: {
      type: 'object',
      properties: {
        novelDataPath: { type: 'string', description: '小说数据文件路径' }
      },
      required: ['novelDataPath']
    }
  },
  {
    name: 'novelCreator_generateChapterPlan',
    description: '小说创作:生成章节规划',
    parameters: {
      type: 'object',
      properties: {
        novelDataPath: { type: 'string', description: '小说数据文件路径' }
      },
      required: ['novelDataPath']
    }
  },
  {
    name: 'novelCreator_generateChapterContent',
    description: '小说创作:生成章节内容',
    parameters: {
      type: 'object',
      properties: {
        novelDataPath: { type: 'string', description: '小说数据文件路径' },
        chapterIndex: { type: 'number', description: '章节索引（从0开始）' },
        chapterCount: { type: 'number', description: '一次生成的章节数量（可选，默认为1）' }
      },
      required: ['novelDataPath', 'chapterIndex']
    }
  },
  {
    name: 'novelCreator_resumeWriting',
    description: '小说创作:断点续写',
    parameters: {
      type: 'object',
      properties: {
        novelDataPath: { type: 'string', description: '小说数据文件路径' }
      },
      required: ['novelDataPath']
    }
  },
  {
    name: 'novelCreator_getProgress',
    description: '小说创作:获取写作进度',
    parameters: {
      type: 'object',
      properties: {
        novelDataPath: { type: 'string', description: '小说数据文件路径' }
      },
      required: ['novelDataPath']
    }
  },
  {
    name: 'novelCreator_exportNovel',
    description: '小说创作:导出小说为txt和markdown格式。合并各章节内容生成完整的小说文件',
    parameters: {
      type: 'object',
      properties: {
        novelDataPath: { type: 'string', description: '小说数据文件路径' }
      },
      required: ['novelDataPath']
    }
  },
  {
    name: 'novelCreator_extensionRule',
    description: '小说创作:扩展工具使用说明。调用小说创作模块前一定要查看',
    parameters: {
      type: 'object',
      properties: {}
    }
  }
];

// 函数实现
const functions = {
  // 初始化小说项目
  novelCreator_initializeNovel: async function(
    novelTitle,
    theme,
    targetWordCount,
    novelType,
    background,
    outputDir = '.'
  ) {
    try {
      // 创建输出目录
      const projectDir = path.resolve(outputDir, `novel_${novelTitle.replace(/[^\w\u4e00-\u9fa5]/g, '_')}`);
      await this.aiCli.Tools.createDirectory(projectDir);
      
      // 创建小说数据结构
      const novelData = {
        title: novelTitle,
        theme,
        targetWordCount,
        type: novelType,
        background,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'initialized',
        chapters: [],
        outline: null,
        chapterPlan: null,
        characters: [],
        settings: [],
        contextMemory: {
          plotPoints: [],
          characterTraits: {},
          keyEvents: []
        }
      };
      
      // 保存小说数据
      const dataFilePath = path.join(projectDir, 'novel_data.json');
      await this.aiCli.Tools.createFile(dataFilePath, JSON.stringify(novelData, null, 2));
      
      // 创建章节目录
      const chaptersDir = path.join(projectDir, 'chapters');
      await this.aiCli.Tools.createDirectory(chaptersDir);
      
      // 创建进度文件
      const progressFilePath = path.join(projectDir, 'progress.json');
      await this.aiCli.Tools.createFile(progressFilePath, JSON.stringify({
        initialized: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        totalChapters: 0,
        completedChapters: 0,
        totalWords: 0
      }, null, 2));
      
      return {
        success: true,
        message: `小说项目初始化成功: ${novelTitle}`,
        projectDir,
        dataFilePath,
        chaptersDir,
        progressFilePath
      };
    } catch (error) {
      return {
        success: false,
        message: `小说项目初始化失败: ${error.message}`,
        error: error.toString()
      };
    }
  },
  
  // 生成小说大纲
  novelCreator_generateOutline: async function(novelDataPath) {
    try {
      // 读取小说数据
      const dataContent = await this.aiCli.Tools.readFile(novelDataPath);
      if (!dataContent) {
        return { success: false, message: '无法读取小说数据文件' };
      }
      
      const novelData = JSON.parse(dataContent);
      
      // 使用AI生成大纲
      const systemPrompt = `你是一个专业的小说创作助手。请根据以下小说信息生成一个详细的小说大纲：

小说标题: ${novelData.title}
主题思想: ${novelData.theme}
小说类型: ${novelData.type}
故事背景: ${novelData.background}
目标字数: ${novelData.targetWordCount}

请生成一个包含以下部分的小说大纲：
1. 核心冲突
2. 主要人物介绍
3. 故事结构（开端、发展、高潮、结局）
4. 主题表达
5. 关键情节节点

大纲需要详细、有创意，并且符合小说的类型和主题。`;
      
      const outline = await this.aiCli.Tools.requestAI(
        '小说创作助手',
        systemPrompt,
        0.7
      );
      
      // 更新小说数据
      novelData.outline = outline;
      novelData.status = 'outline_generated';
      novelData.updatedAt = new Date().toISOString();
      
      // 保存更新
      await this.aiCli.Tools.modifyFile(novelDataPath, JSON.stringify(novelData, null, 2));
      
      // 保存大纲到独立文件
      const projectDir = path.dirname(novelDataPath);
      const outlineFilePath = path.join(projectDir, 'outline.md');
      await this.aiCli.Tools.createFile(outlineFilePath, `# ${novelData.title} - 小说大纲\n\n${outline}`);
      
      return {
        success: true,
        message: '小说大纲生成成功',
        outline,
        outlineFilePath
      };
    } catch (error) {
      return {
        success: false,
        message: `小说大纲生成失败: ${error.message}`,
        error: error.toString()
      };
    }
  },
  
  // 生成章节规划
  novelCreator_generateChapterPlan: async function(novelDataPath) {
    try {
      // 读取小说数据
      const dataContent = await this.aiCli.Tools.readFile(novelDataPath);
      if (!dataContent) {
        return { success: false, message: '无法读取小说数据文件' };
      }
      
      const novelData = JSON.parse(dataContent);
      
      if (!novelData.outline) {
        return { success: false, message: '请先生成小说大纲' };
      }
      
      // 计算建议章节数（基于目标字数，假设每章约3000字）
      const targetChapters = Math.max(5, Math.ceil(novelData.targetWordCount / 3000));
      
      // 使用AI生成章节规划
      const systemPrompt = `你是一个专业的小说创作助手。请根据以下小说信息和大纲，生成详细的章节规划：

小说标题: ${novelData.title}
主题思想: ${novelData.theme}
小说类型: ${novelData.type}
故事背景: ${novelData.background}
目标字数: ${novelData.targetWordCount}
建议章节数: ${targetChapters}

小说大纲:
${novelData.outline}

请生成一个包含${targetChapters}章的章节规划。每章需要包括：
1. 章节标题
2. 章节摘要（50-100字）
3. 关键情节
4. 出场人物
5. 字数目标

请按JSON数组格式返回，每个元素是一个章节对象。`;
      
      const chapterPlanText = await this.aiCli.Tools.requestAI(
        '小说创作助手',
        systemPrompt,
        0.7
      );
      
      // 尝试解析JSON
      let chapters;
      try {
        // 尝试从响应中提取JSON
        const jsonMatch = chapterPlanText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          chapters = JSON.parse(jsonMatch[0]);
        } else {
          chapters = JSON.parse(chapterPlanText);
        }
      } catch (parseError) {
        // 如果解析失败，手动创建章节结构
        chapters = [];
        const lines = chapterPlanText.split('\n').filter(line => line.trim());
        let currentChapter = null;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // 检测章节标题（包含"第X章"或"Chapter X"）
          if (line.match(/第[一二三四五六七八九十百千万\d]+章|Chapter\s+\d+/)) {
            if (currentChapter) {
              chapters.push(currentChapter);
            }
            currentChapter = {
              title: line.trim(),
              summary: '',
              keyPoints: [],
              characters: [],
              wordTarget: 3000,
              content: '',
              status: 'planned'
            };
          } else if (currentChapter) {
            // 填充章节信息
            if (line.includes('摘要') || line.includes('summary')) {
              currentChapter.summary = lines[i + 1] || '';
              i++;
            }
          }
        }
        
        if (currentChapter && !chapters.includes(currentChapter)) {
          chapters.push(currentChapter);
        }
        
        // 如果章节数不足，补充
        if (chapters.length < targetChapters) {
          for (let i = chapters.length; i < targetChapters; i++) {
            chapters.push({
              title: `第${i + 1}章`,
              summary: `待补充的章节摘要`,
              keyPoints: ['待补充关键情节'],
              characters: ['待补充出场人物'],
              wordTarget: 3000,
              content: '',
              status: 'planned'
            });
          }
        }
      }
      
      // 更新小说数据
      novelData.chapters = chapters;
      novelData.chapterPlan = chapterPlanText;
      novelData.status = 'chapter_planned';
      novelData.updatedAt = new Date().toISOString();
      
      // 保存更新
      await this.aiCli.Tools.modifyFile(novelDataPath, JSON.stringify(novelData, null, 2));
      
      // 保存章节规划到独立文件
      const projectDir = path.dirname(novelDataPath);
      const chapterPlanFilePath = path.join(projectDir, 'chapter_plan.md');
      let chapterPlanMarkdown = `# ${novelData.title} - 章节规划\n\n`;
      chapterPlanMarkdown += `总章节数: ${chapters.length}\n\n`;
      
      chapters.forEach((chapter, index) => {
        chapterPlanMarkdown += `## ${chapter.title || `第${index + 1}章`}\n`;
        chapterPlanMarkdown += `**摘要**: ${chapter.summary || '暂无摘要'}\n\n`;
        chapterPlanMarkdown += `**关键情节**:\n`;
        if (Array.isArray(chapter.keyPoints)) {
          chapter.keyPoints.forEach(point => {
            chapterPlanMarkdown += `- ${point}\n`;
          });
        }
        chapterPlanMarkdown += `\n**出场人物**: ${Array.isArray(chapter.characters) ? chapter.characters.join('、') : chapter.characters || '待补充'}\n`;
        chapterPlanMarkdown += `**字数目标**: ${chapter.wordTarget || 3000}字\n\n`;
      });
      
      await this.aiCli.Tools.createFile(chapterPlanFilePath, chapterPlanMarkdown);
      
      return {
        success: true,
        message: `章节规划生成成功，共${chapters.length}章`,
        chapterCount: chapters.length,
        chapterPlanFilePath
      };
    } catch (error) {
      return {
        success: false,
        message: `章节规划生成失败: ${error.message}`,
        error: error.toString()
      };
    }
  },
  
  // 生成章节内容
  novelCreator_generateChapterContent: async function(novelDataPath, chapterIndex, chapterCount = 1) {
    try {
      // 读取小说数据
      const dataContent = await this.aiCli.Tools.readFile(novelDataPath);
      if (!dataContent) {
        return { success: false, message: '无法读取小说数据文件' };
      }
      
      const novelData = JSON.parse(dataContent);
      
      if (!novelData.chapters || novelData.chapters.length === 0) {
        return { success: false, message: '请先生成章节规划' };
      }
      
      if (chapterIndex < 0 || chapterIndex >= novelData.chapters.length) {
        return { success: false, message: `章节索引无效，有效范围: 0-${novelData.chapters.length - 1}` };
      }
      
      const endIndex = Math.min(chapterIndex + chapterCount, novelData.chapters.length);
      const chaptersToGenerate = novelData.chapters.slice(chapterIndex, endIndex);
      const results = [];
      
      // 生成每个章节的内容
      for (let i = 0; i < chaptersToGenerate.length; i++) {
        const currentIndex = chapterIndex + i;
        const chapter = novelData.chapters[currentIndex];
        
        // 构建上下文记忆
        const previousChapters = novelData.chapters.slice(0, currentIndex);
        const previousContent = previousChapters
          .filter(ch => ch.content)
          .map((ch, idx) => `第${idx + 1}章 ${ch.title}:\n${ch.content.substring(0, 500)}...`)
          .join('\n\n');
        
        // 构建关键上下文信息
        const contextSummary = `
小说主题: ${novelData.theme}
故事背景: ${novelData.background}
主要人物: ${novelData.characters?.join('、') || '待补充'}
${previousContent ? `\n前文摘要:\n${previousContent}` : ''}
`;
        
        // 使用AI生成章节内容
        const systemPrompt = `你是一个专业的小说作家。请根据以下信息创作小说章节内容：

小说标题: ${novelData.title}
小说类型: ${novelData.type}

${contextSummary}

当前章节: ${chapter.title || `第${currentIndex + 1}章`}
章节摘要: ${chapter.summary || '暂无摘要'}
关键情节: ${Array.isArray(chapter.keyPoints) ? chapter.keyPoints.join('，') : chapter.keyPoints || '待补充'}
出场人物: ${Array.isArray(chapter.characters) ? chapter.characters.join('、') : chapter.characters || '待补充'}

请创作完整的章节内容，要求:
1. 符合小说类型和风格
2. 情节连贯，符合章节摘要和关键情节
3. 人物性格一致
4. 语言生动，有感染力
5. 字数控制在${chapter.wordTarget || 3000}字左右
6. 以章节标题开始

请直接输出章节正文内容，不需要额外的说明。`;
        
        const chapterContent = await this.aiCli.Tools.requestAI(
          '专业小说作家',
          systemPrompt,
          0.8
        );
        
        // 更新章节数据
        chapter.content = chapterContent;
        chapter.status = 'completed';
        chapter.completedAt = new Date().toISOString();
        chapter.wordCount = getWordCount(chapterContent);
        
        // 保存章节到独立文件
        const projectDir = path.dirname(novelDataPath);
        const chapterFilePath = path.join(projectDir, 'chapters', `chapter_${currentIndex + 1}.md`);
        await this.aiCli.Tools.createFile(chapterFilePath, `# ${chapter.title || `第${currentIndex + 1}章`}\n\n${chapterContent}`);
        
        results.push({
          chapterIndex: currentIndex,
          title: chapter.title,
          wordCount: chapter.wordCount,
          filePath: chapterFilePath,
          status: 'completed'
        });
        
        // 更新上下文记忆
        if (!novelData.contextMemory.keyEvents) {
          novelData.contextMemory.keyEvents = [];
        }
        
        // 提取关键事件（简单提取前几句话）
        const firstSentence = chapterContent.split(/[。.!?]/)[0];
        if (firstSentence) {
          novelData.contextMemory.keyEvents.push({
            chapter: currentIndex + 1,
            event: firstSentence
          });
        }
        
        // 每完成一章后保存一次进度
        novelData.updatedAt = new Date().toISOString();
        await this.aiCli.Tools.modifyFile(novelDataPath, JSON.stringify(novelData, null, 2));
      }
      
      // 更新进度文件
      const projectDir = path.dirname(novelDataPath);
      const progressFilePath = path.join(projectDir, 'progress.json');
      const progressData = {
        updatedAt: new Date().toISOString(),
        totalChapters: novelData.chapters.length,
        completedChapters: novelData.chapters.filter(ch => ch.content && ch.content.trim()).length,
        totalWords: novelData.chapters.reduce((sum, ch) => sum + getWordCount(ch.content || ''), 0)
      };
      
      await this.aiCli.Tools.modifyFile(progressFilePath, JSON.stringify(progressData, null, 2));
      
      return {
        success: true,
        message: `成功生成${results.length}章内容`,
        results,
        progress: formatProgress(novelData)
      };
    } catch (error) {
      return {
        success: false,
        message: `章节内容生成失败: ${error.message}`,
        error: error.toString()
      };
    }
  },
  
  // 断点续写
  novelCreator_resumeWriting: async function(novelDataPath) {
    try {
      // 读取小说数据
      const dataContent = await this.aiCli.Tools.readFile(novelDataPath);
      if (!dataContent) {
        return { success: false, message: '无法读取小说数据文件' };
      }
      
      const novelData = JSON.parse(dataContent);
      
      if (!novelData.chapters || novelData.chapters.length === 0) {
        return { success: false, message: '没有找到章节规划，无法续写' };
      }
      
      // 找到第一个未完成的章节
      const firstIncompleteIndex = novelData.chapters.findIndex(ch => 
        !ch.content || !ch.content.trim() || ch.status !== 'completed'
      );
      
      if (firstIncompleteIndex === -1) {
        return {
          success: true,
          message: '所有章节已完成，无需续写',
          progress: formatProgress(novelData)
        };
      }
      
      // 继续生成内容
      const result = await this.novelCreator_generateChapterContent(
        novelDataPath,
        firstIncompleteIndex,
        1
      );
      
      return {
        success: true,
        message: `续写完成第${firstIncompleteIndex + 1}章`,
        nextChapter: firstIncompleteIndex + 1,
        result,
        progress: formatProgress(novelData)
      };
    } catch (error) {
      return {
        success: false,
        message: `断点续写失败: ${error.message}`,
        error: error.toString()
      };
    }
  },
  
  // 获取写作进度
  novelCreator_getProgress: async function(novelDataPath) {
    try {
      // 读取小说数据
      const dataContent = await this.aiCli.Tools.readFile(novelDataPath);
      if (!dataContent) {
        return { success: false, message: '无法读取小说数据文件' };
      }
      
      const novelData = JSON.parse(dataContent);
      
      // 读取进度文件
      const projectDir = path.dirname(novelDataPath);
      const progressFilePath = path.join(projectDir, 'progress.json');
      let progressData = {};
      
      if (await this.aiCli.Tools.fileExists(progressFilePath)) {
        const progressContent = await this.aiCli.Tools.readFile(progressFilePath);
        if (progressContent) {
          progressData = JSON.parse(progressContent);
        }
      }
      
      // 计算当前进度
      const progress = formatProgress(novelData);
      
      // 获取章节状态统计
      const chapterStatus = {
        total: novelData.chapters?.length || 0,
        completed: novelData.chapters?.filter(ch => ch.content && ch.content.trim()).length || 0,
        planned: novelData.chapters?.filter(ch => ch.status === 'planned').length || 0,
        inProgress: novelData.chapters?.filter(ch => ch.status === 'in_progress').length || 0
      };
      
      // 获取最近活动
      const recentActivity = novelData.chapters
        ?.filter(ch => ch.completedAt)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
        .slice(0, 3)
        .map(ch => ({
          title: ch.title || `第${novelData.chapters.indexOf(ch) + 1}章`,
          completedAt: ch.completedAt,
          wordCount: ch.wordCount
        })) || [];
      
      return {
        success: true,
        progress,
        chapterStatus,
        recentActivity,
        novelInfo: {
          title: novelData.title,
          type: novelData.type,
          theme: novelData.theme,
          targetWordCount: novelData.targetWordCount,
          createdAt: novelData.createdAt,
          updatedAt: novelData.updatedAt,
          status: novelData.status
        },
        projectDir
      };
    } catch (error) {
      return {
        success: false,
        message: `获取进度失败: ${error.message}`,
        error: error.toString()
      };
    }
  },
  
  // 导出小说为txt和markdown格式
  novelCreator_exportNovel: async function(novelDataPath) {
    try {
      // 读取小说数据
      const dataContent = await this.aiCli.Tools.readFile(novelDataPath);
      if (!dataContent) {
        return { success: false, message: '无法读取小说数据文件' };
      }
      
      const novelData = JSON.parse(dataContent);
      
      if (!novelData.chapters || novelData.chapters.length === 0) {
        return { success: false, message: '没有找到章节内容，无法导出' };
      }
      
      // 检查是否有完成的章节
      const completedChapters = novelData.chapters.filter(ch => ch.content && ch.content.trim());
      if (completedChapters.length === 0) {
        return { success: false, message: '没有已完成的章节内容可导出' };
      }
      
      const projectDir = path.dirname(novelDataPath);
      const novelTitle = novelData.title || '未命名小说';
      const safeTitle = novelTitle.replace(/[\\/:*?"<>|]/g, '_'); // 替换文件名中的非法字符
      
      // 读取各章节文件内容
      const chaptersDir = path.join(projectDir, 'chapters');
      let allContent = [];
      let toc = []; // 目录
      
      // 按顺序处理每个章节
      for (let i = 0; i < novelData.chapters.length; i++) {
        const chapter = novelData.chapters[i];
        if (chapter.content && chapter.content.trim()) {
          // 读取章节文件
          const chapterFilePath = path.join(chaptersDir, `chapter_${i + 1}.md`);
          let chapterContent = '';
          
          if (await this.aiCli.Tools.fileExists(chapterFilePath)) {
            const fileContent = await this.aiCli.Tools.readFile(chapterFilePath);
            // 去除markdown标题（# 章节标题）
            chapterContent = fileContent.replace(/^#\s+.*\n/, '').trim();
          } else {
            // 如果文件不存在，使用内存中的内容
            chapterContent = chapter.content;
          }
          
          if (chapterContent) {
            toc.push({
              index: i + 1,
              title: chapter.title || `第${i + 1}章`,
              wordCount: getWordCount(chapterContent)
            });
            allContent.push({
              index: i + 1,
              title: chapter.title || `第${i + 1}章`,
              content: chapterContent
            });
          }
        }
      }
      
      if (allContent.length === 0) {
        return { success: false, message: '没有可导出的章节内容' };
      }
      
      // 生成txt文件内容
      let txtContent = `${novelTitle}\n`;
      txtContent += `作者：${novelData.author || 'DeepFish AI'}\n`;
      txtContent += `类型：${novelData.type || '未知'}\n`;
      txtContent += `主题：${novelData.theme || '待补充'}\n`;
      txtContent += `=`.repeat(30) + '\n\n';
      
      for (const chapter of allContent) {
        txtContent += `\n\n${chapter.title}\n`;
        txtContent += `-`.repeat(20) + '\n\n';
        txtContent += chapter.content + '\n\n';
      }
      
      // 生成markdown文件内容（带目录）
      let mdContent = `# ${novelTitle}\n\n`;
      mdContent += `> 作者：${novelData.author || 'DeepFish AI'}  |  类型：${novelData.type || '未知'}  |  主题：${novelData.theme || '待补充'}\n\n`;
      mdContent += `---\n\n`;
      
      // 添加目录
      mdContent += `## 目录\n\n`;
      for (const item of toc) {
        mdContent += `- [${item.title}](#${item.index}-chapter) (${item.wordCount}字)\n`;
      }
      mdContent += `\n\n---\n\n`;
      
      // 添加章节内容
      for (const chapter of allContent) {
        mdContent += `## ${chapter.title} {#${chapter.index}-chapter}\n\n`;
        mdContent += chapter.content + '\n\n';
        mdContent += `\n---\n\n`;
      }
      
      // 添加结尾
      mdContent += `\n---\n\n`;
      mdContent += `*本小说由DeepFish AI创作完成*\n`;
      
      // 保存txt文件
      const txtFilePath = path.join(projectDir, `${safeTitle}.txt`);
      await this.aiCli.Tools.createFile(txtFilePath, txtContent);
      
      // 保存markdown文件
      const mdFilePath = path.join(projectDir, `${safeTitle}.md`);
      await this.aiCli.Tools.createFile(mdFilePath, mdContent);
      
      // 统计信息
      const totalWords = allContent.reduce((sum, ch) => sum + getWordCount(ch.content), 0);
      
      return {
        success: true,
        message: `小说导出成功！已生成txt和markdown格式文件`,
        outputFiles: {
          txt: txtFilePath,
          md: mdFilePath
        },
        summary: {
          novelTitle,
          chapterCount: allContent.length,
          totalWords,
          author: novelData.author || 'DeepFish AI'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `小说导出失败: ${error.message}`,
        error: error.toString()
      };
    }
  },
  
  // 扩展工具使用说明
  novelCreator_extensionRule: function() {
    return `# 小说创作扩展工具使用说明

## 概述
本扩展工具提供完整的小说创作功能，帮助用户基于AI生成完整的小说作品。支持从概念到成品的全流程创作。

## 功能列表
1. **初始化小说项目** - 创建小说项目结构和数据文件
2. **生成小说大纲** - 基于主题、类型和背景生成详细大纲
3. **生成章节规划** - 根据大纲和目标字数生成章节规划
4. **生成章节内容** - 逐章生成小说正文内容
5. **断点续写** - 从上次中断处继续创作
6. **获取写作进度** - 查看创作进度和统计信息
7. **导出小说** - 导出完整小说为txt和markdown格式

## 使用流程
推荐按以下顺序使用本扩展工具：

### 第一步：初始化项目
\`\`\`
const result = await novelCreator_initializeNovel(
  "我的小说标题",      // 小说标题
  "爱与牺牲的主题",     // 主题思想
  50000,              // 目标字数
  "奇幻",             // 小说类型
  "中世纪魔法世界",    // 故事背景
  "./output"          // 输出目录（可选）
);
\`\`\`

### 第二步：生成大纲
\`\`\`
const result = await novelCreator_generateOutline("novel_data.json路径");
\`\`\`

### 第三步：生成章节规划
\`\`\`
const result = await novelCreator_generateChapterPlan("novel_data.json路径");
\`\`\`

### 第四步：生成章节内容
\`\`\`
// 生成单个章节
const result = await novelCreator_generateChapterContent(
  "novel_data.json路径",
  0  // 章节索引（从0开始）
);

// 批量生成多个章节
const result = await novelCreator_generateChapterContent(
  "novel_data.json路径",
  0,  // 起始章节索引
  3   // 生成章节数量
);
\`\`\`

### 第五步：断点续写
\`\`\`
const result = await novelCreator_resumeWriting("novel_data.json路径");
\`\`\`

### 第六步：查看进度
\`\`\`
const result = await novelCreator_getProgress("novel_data.json路径");
\`\`\`

### 第七步：导出小说
\`\`\`
const result = await novelCreator_exportNovel("novel_data.json路径");
\`\`\`

## 输出文件结构
项目目录包含以下文件：
- \`novel_data.json\` - 小说核心数据
- \`outline.md\` - 小说大纲
- \`chapter_plan.md\` - 章节规划
- \`progress.json\` - 进度统计
- \`chapters/\` - 章节内容目录
  - \`chapter_1.md\` - 第1章内容
  - \`chapter_2.md\` - 第2章内容
  - ...
- \`小说标题.txt\` - 导出的纯文本小说文件
- \`小说标题.md\` - 导出的markdown格式小说文件（含目录）

## 上下文管理机制
1. **记忆机制**：记录关键情节和人物特征
2. **前文摘要**：生成新章节时提供前文摘要
3. **一致性检查**：保持人物性格和情节连贯
4. **进度跟踪**：实时统计字数、章节完成情况

## 注意事项
1. 使用前请确保AI配置正确
2. 大篇幅创作时建议分批次进行
3. 可随时使用断点续写功能继续创作
4. 定期检查进度确保创作方向正确。
5. 小说默认作者：DeepFish AI

## 技术支持
如有问题，请参考DeepFish AI文档或联系开发者。`;
  }
};

// 导出模块
module.exports = {
  name: 'novelCreator',
  description: '提供完整的小说创作功能，包括大纲生成、章节规划、内容生成、进度管理和断点续写。支持长篇小说创作，内置上下文管理机制确保剧情连贯和人设统一。',
  descriptions,
  functions,
};
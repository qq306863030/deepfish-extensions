/**
 * 书籍创作工具 - 基于任务列表与文档匹配的长篇书籍创作
 * 
 * 核心功能：
 * 1. 严格遵循 SKILL.md 目录结构与数据规范
 * 2. 以小节为基本创作单元，逐节推进
 * 3. 创作时强制参考：大纲、章节规划、前两小节摘要、相关参考文档
 * 4. 自动生成并维护 book_summary 摘要目录
 * 5. 完整断点续写与进度管理
 */

const path = require('path');
const { CozeAPI } = require('@coze/api')
const axios = require('axios')

const COZE_BASE_URL = 'https://api.coze.cn'
const WORKFLOW_TOKEN = 'pat_EzQSfh3PrrfscApEMv8iqnM7A6shQ0eu7mYzZTkMmFCLGfGyQFf2SeKfH4Ab26bS'
const KNOWLEDGE_DATASET_ID = '7632245890909323273'


async function _getMatchedDocumentIdList(searchInput) {
  const apiClient = new CozeAPI({
    token: WORKFLOW_TOKEN,
    baseURL: COZE_BASE_URL,
  })
  const res = await apiClient.workflows.runs.create({
    workflow_id: '7632249703397621794',
    parameters: {
      input: searchInput,
    },
  })
  const data = JSON.parse(res.data, null, 2)
  return data?.outputList?.map(item => item.documentId) || []
}

async function _getMatchedDocumentPathList(searchInput) {
    try {
      const documentIdList = await _getMatchedDocumentIdList(searchInput)
      // documentIdList去重
      const uniqueDocumentIdList = [...new Set(documentIdList)]
      const res = await axios.post(
        `${COZE_BASE_URL}/open_api/knowledge/document/list`,
        {
          dataset_id: KNOWLEDGE_DATASET_ID,
          page: 1,
          size: 100,
        },
        {
          headers: {
            Authorization: `Bearer ${WORKFLOW_TOKEN}`,
            'Content-Type': 'application/json',
            'Agw-Js-Conv': 'str',
          },
        },
      )
      const list = res?.data?.document_infos || []
      const result = []
      uniqueDocumentIdList.forEach(documentId => {
        const matched = list.find(doc => doc.document_id === documentId)
        if (matched) {
          const absolutePath = path.join(__dirname, 'resources', matched.name)
          result.push(absolutePath)
        }
      })
      return result
    } catch (error) {
      console.error('Error in getMatchedDocumentPathList:', error)
      console.error(error)
      return []
    }
  }

// async function getMatchedContent(searchInput) {
//   const documentPathList = await _getMatchedDocumentPathList(searchInput)
//   const result = await this.Tools.extractFileContent(searchInput, documentPathList)
//   return result
// }

async function getMatchedContent(searchInput) {
  const apiClient = new CozeAPI({
    token: WORKFLOW_TOKEN,
    baseURL: COZE_BASE_URL,
  })
  const res = await apiClient.workflows.runs.create({
    workflow_id: '7632249703397621794',
    parameters: {
      input: searchInput,
    },
  })
  const data = JSON.parse(res.data, null, 2)
  return data?.outputList?.map(item => {
    return {
      documentId: item.documentId,
      content: item.output,
    }
  }) || []
}

// ==================== 工具函数 ====================

function countChineseCharacters(text) {
  if (!text) return 0;
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
  return chineseChars ? chineseChars.length : 0;
}

function countEnglishWords(text) {
  if (!text) return 0;
  const words = text.match(/\b[a-zA-Z]+\b/g);
  return words ? words.length : 0;
}

function getWordCount(text) {
  if (!text) return 0;
  return countChineseCharacters(text) + countEnglishWords(text);
}

function formatDateTime() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// ==================== 函数描述 ====================

const descriptions = [
  {
    name: 'getMatchedContent',
    description: '根据给定提示词获取相关文件的内容。参数：searchInput 为查询提示词，返回值为包含文件内容的对象列表，每个对象包含 { documentId, content }',
    parameters: {
      type: 'object',
      properties: {
        searchInput: {
          type: 'string',
          description: '查询提示词，用于匹配相关文档',
        },
      },
      required: ['searchInput'],
    },
  },
  {
    name: 'initializeBook',
    description: '初始化书籍项目结构。创建 book_progress.json、book_outline.json、book_chapter_plan.json 及目录',
    parameters: {
      type: 'object',
      properties: {
        projectName: { type: 'string', description: '项目名称' },
        theme: { type: 'string', description: '书籍主题' },
        outputDir: { type: 'string', description: '输出目录路径（可选，默认为当前目录）' }
      },
      required: ['projectName', 'theme']
    }
  },
  {
    name: 'generateOutline',
    description: '生成书籍大纲并输出 book_outline.json（以小节为单元）。支持传入用户自定义目录以约束 AI 生成',
    parameters: {
      type: 'object',
      properties: {
        bookDataDir: { type: 'string', description: '书籍项目根目录' },
        totalWordCount: { type: 'number', description: '全书目标总字数' },
        userOutline: { type: 'string', description: '用户指定的目录结构文本（可选，若提供则 AI 必须严格遵循此结构）' }
      },
      required: ['bookDataDir', 'totalWordCount']
    }
  },
  {
    name: 'generateChapterPlan',
    description: '生成章节规划并输出 book_chapter_plan.json（以小节为单元）',
    parameters: {
      type: 'object',
      properties: {
        bookDataDir: { type: 'string', description: '书籍项目根目录' }
      },
      required: ['bookDataDir']
    }
  },
  {
    name: 'writeSection',
    description: '按小节生成内容。参考大纲、规划、前两节摘要及参考文档，输出至 book_chapters 并生成摘要至 book_summary',
    parameters: {
      type: 'object',
      properties: {
        bookDataDir: { type: 'string', description: '书籍项目根目录' },
        sectionIndex: { type: 'number', description: '目标小节索引（从0开始，-1表示自动续写下一节）' }
      },
      required: ['bookDataDir']
    }
  },
  {
    name: 'queryDocuments',
    description: '使用 getMatchedContent 匹配相关参考文档内容',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '查询关键词或提示词' }
      },
      required: ['query']
    }
  },
  {
    name: 'resumeWriting',
    description: '断点续写：自动查找未完成的小节并调用 writeSection 继续创作',
    parameters: {
      type: 'object',
      properties: {
        bookDataDir: { type: 'string', description: '书籍项目根目录' }
      },
      required: ['bookDataDir']
    }
  },
  {
    name: 'getProgress',
    description: '读取并返回 book_progress.json 进度状态',
    parameters: {
      type: 'object',
      properties: {
        bookDataDir: { type: 'string', description: '书籍项目根目录' }
      },
      required: ['bookDataDir']
    }
  },
  {
    name: 'exportBook',
    description: '合并 book_chapters 下所有小节为完整文档（支持 md/txt）',
    parameters: {
      type: 'object',
      properties: {
        bookDataDir: { type: 'string', description: '书籍项目根目录' },
        format: { type: 'string', description: '导出格式：md 或 txt，默认 md' }
      },
      required: ['bookDataDir']
    }
  },
  {
    name: 'extensionRule',
    description: '扩展工具使用说明。调用书籍创作模块前一定要查看',
    parameters: { type: 'object', properties: {} }
  }
];

// ==================== 函数实现 ====================

const functions = {
  getMatchedContent,
  initializeBook: async function(projectName, theme, outputDir = '.') {
    try {
      const projectDir = path.resolve(outputDir, `book_${projectName.replace(/[^\w\u4e00-\u9fa5]/g, '_')}`);
      await this.Tools.createDirectory(projectDir);
      await this.Tools.createDirectory(path.join(projectDir, 'book_chapters'));
      await this.Tools.createDirectory(path.join(projectDir, 'book_summary'));

      const progressData = {
        projectName,
        theme,
        status: 'init',
        currentSectionIndex: 0,
        totalSections: 0,
        completedSections: [],
        updatedAt: formatDateTime()
      };
      await this.Tools.createFile(path.join(projectDir, 'book_progress.json'), JSON.stringify(progressData, null, 2));
      await this.Tools.createFile(path.join(projectDir, 'book_outline.json'), JSON.stringify({ title: theme, theme, introduction: '', sections: [] }, null, 2));
      await this.Tools.createFile(path.join(projectDir, 'book_chapter_plan.json'), JSON.stringify({ sections: [] }, null, 2));

      return {
        success: true,
        message: '项目初始化完成',
        projectDir,
        structure: ['book_progress.json', 'book_outline.json', 'book_chapter_plan.json', 'book_chapters/', 'book_summary/']
      };
    } catch (error) {
      console.error(error)
      return { success: false, message: `初始化失败: ${error.message}` };
    }
  },

  generateOutline: async function(bookDataDir, totalWordCount = 50000, userOutline = '') {
    try {
      const outlinePath = path.join(bookDataDir, 'book_outline.json');
      const outlineRaw = await this.Tools.readFile(outlinePath);
      if (!outlineRaw || !outlineRaw.success) return { success: false, message: '未找到 book_outline.json' };
      
      const outlineBase = JSON.parse(outlineRaw.data.content);
      
      const outlineConstraint = userOutline 
        ? `\n【用户指定目录结构】\n${userOutline}\n注意：必须严格遵循上述目录结构，不得自行增删或修改章节标题。` 
        : '';
      
      const prompt = `请为书籍《${outlineBase.theme}》生成详细大纲（以小节为单元）。
目标总字数：${totalWordCount}${outlineConstraint}
要求：
1. 必须包含 chapterNumber=0 的绪论（除非用户目录中明确排除了绪论）
2. 每个小节包含：chapterNumber, chapterTitle, sectionNumber, title, summary, keyPoints[], estimatedWordCount
3. 按写作顺序平铺在 sections 数组中
4. 预估字数总和接近 ${totalWordCount}
${userOutline ? '5. 【强制】严格按照用户提供的目录结构生成，标题和顺序必须与用户输入一致' : ''}
请直接返回合法 JSON，不要包含 markdown 代码块标记。`;
      const aiResult = await this.Tools.requestAI('大纲规划专家', prompt, 0.7);
      const aiResultStr = typeof aiResult === 'string' ? aiResult : JSON.stringify(aiResult);
      let jsonMatch = aiResultStr.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiResultStr;
      const newOutline = JSON.parse(jsonStr);

      // 补充缺失字段
      if (!newOutline.title) newOutline.title = outlineBase.theme;
      if (!newOutline.theme) newOutline.theme = outlineBase.theme;

      await this.Tools.modifyFile(outlinePath, JSON.stringify(newOutline, null, 2));
      
      // 更新进度
      const progressPath = path.join(bookDataDir, 'book_progress.json');
      const progressRaw = await this.Tools.readFile(progressPath);
      const progress = JSON.parse(progressRaw.data.content);
      progress.totalSections = newOutline.sections.length;
      progress.status = 'outline';
      progress.updatedAt = formatDateTime();
      await this.Tools.modifyFile(progressPath, JSON.stringify(progress, null, 2));

      return { success: true, message: '大纲生成成功', sectionCount: newOutline.sections.length };
    } catch (error) {
      console.error(error);
      return { success: false, message: `大纲生成失败: ${error.message}`, debug: { stack: error.stack, name: error.name } };
    }
  },

  generateChapterPlan: async function(bookDataDir) {
    try {
      const outlinePath = path.join(bookDataDir, 'book_outline.json');
      const outlineRaw = await this.Tools.readFile(outlinePath);
      const outline = JSON.parse(outlineRaw.data.content);
      if (!outline.sections || outline.sections.length === 0) return { success: false, message: '请先生成大纲' };

      const prompt = `基于以下大纲，生成详细的章节规划（以小节为单元）。
大纲：${JSON.stringify(outline.sections, null, 2)}
要求：
1. 每个小节包含：chapterNumber, chapterTitle, sectionNumber, title, contentOutline, targetWordCount, writingOrder
2. writingOrder 从 1 开始递增
3. 直接返回合法 JSON，包含 sections 数组，不要包含 markdown 代码块标记。`;

      const aiResult = await this.Tools.requestAI('章节规划专家', prompt, 0.7);
      const aiResultStr = typeof aiResult === 'string' ? aiResult : String(aiResult);
      let jsonMatch = aiResultStr.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiResultStr;
      const plan = JSON.parse(jsonStr);

      const planPath = path.join(bookDataDir, 'book_chapter_plan.json');
      await this.Tools.modifyFile(planPath, JSON.stringify(plan, null, 2));

      const progressPath = path.join(bookDataDir, 'book_progress.json');
      const progressRaw = await this.Tools.readFile(progressPath);
      const progress = JSON.parse(progressRaw.data.content);
      progress.status = 'chapter_plan';
      progress.updatedAt = formatDateTime();
      await this.Tools.modifyFile(progressPath, JSON.stringify(progress, null, 2));

      return { success: true, message: '章节规划生成成功', sectionCount: plan.sections.length };
    } catch (error) {
      console.error(error)
      return { success: false, message: `规划生成失败: ${error.message}` };
    }
  },

  queryDocuments: async function(query) {
    try {
      // 调用 getMatchedContent 进行文档匹配
      const result = await this.Tools.getMatchedContent(query);
      console.log('***匹配结果***', result)
      return result;
    } catch (error) {
      console.error(error)
      return { success: false, message: `文档查询失败: ${error.message}` };
    }
  },

  writeSection: async function(bookDataDir, sectionIndex = -1) {
    try {
      console.log(`####开始生成小节####，bookDataDir=${bookDataDir}, sectionIndex=${sectionIndex}`);
      const progressPath = path.join(bookDataDir, 'book_progress.json');
      const progressRaw = await this.Tools.readFile(progressPath);
      const progress = JSON.parse(progressRaw.data.content);
      if (progress.status !== 'chapter_plan' && progress.status !== 'writing') {
        return { success: false, message: '请先生成大纲与章节规划' };
      }

      const planPath = path.join(bookDataDir, 'book_chapter_plan.json');
      const outlinePath = path.join(bookDataDir, 'book_outline.json');
      const planRaw = await this.Tools.readFile(planPath);
      const outlineRaw2 = await this.Tools.readFile(outlinePath);
      const plan = JSON.parse(planRaw.data.content);
      const outline = JSON.parse(outlineRaw2.data.content);

      const targetIdx = sectionIndex >= 0 ? sectionIndex : progress.currentSectionIndex;
      if (targetIdx >= plan.sections.length) return { success: true, message: '所有章节已完成', status: 'completed' };

      const sectionPlan = plan.sections[targetIdx];
      const sectionOutline = outline.sections.find(s => s.sectionNumber === sectionPlan.sectionNumber) || {};

      // 1. 获取前两小节摘要
      let prevSummaries = '';
      for (let i = Math.max(0, targetIdx - 2); i < targetIdx; i++) {
        const prevSec = plan.sections[i];
        const summaryPath = path.join(bookDataDir, 'book_summary', `chapter_${prevSec.chapterNumber}`, `chapter_${prevSec.chapterNumber}_${prevSec.sectionNumber}_summary.md`);
        if (await this.Tools.fileExists(summaryPath)) {
          const summaryRaw = await this.Tools.readFile(summaryPath);
          prevSummaries += `【${prevSec.chapterTitle} 第${prevSec.sectionNumber}节摘要】\n${summaryRaw.data.content}\n\n`;
        }
      }

      // 2. 查询参考文档
      const docQuery = `${sectionPlan.title} ${sectionPlan.contentOutline}`;
      const docResult = await this.Tools.queryDocuments(docQuery);
      const refDocs = docResult.success ? docResult.data : '';
      // 3. 构建提示词
      const prompt = `请撰写书籍《${outline.title}》中【${sectionPlan.chapterTitle}】的【第${sectionPlan.sectionNumber}节：${sectionPlan.title}】。
要求严格参考以下四部分内容：
【1. 大纲信息】
标题：${sectionOutline.title || sectionPlan.title}
摘要：${sectionOutline.summary || ''}
关键点：${Array.isArray(sectionOutline.keyPoints) ? sectionOutline.keyPoints.join('、') : ''}

【2. 本章节规划】
内容要点：${sectionPlan.contentOutline}
目标字数：${sectionPlan.targetWordCount}字

【3. 前两小节摘要（用于保持连贯性）】
${prevSummaries || '无（当前为首节）'}

【4. 相关参考文档】
${refDocs || '无额外参考文档'}

请输出完整的 Markdown 格式正文，结构清晰，语言专业，紧扣规划要点，字数控制在 ${sectionPlan.targetWordCount} 左右。不要包含标题以外的额外说明。`;

      const content = await this.Tools.requestAI('专业书籍作家', prompt, 0.8);

      // 4. 保存内容
      const chapterDir = path.join(bookDataDir, 'book_chapters', `chapter_${sectionPlan.chapterNumber}`);
      await this.Tools.createDirectory(chapterDir);
      const contentPath = path.join(chapterDir, `chapter_${sectionPlan.chapterNumber}_${sectionPlan.sectionNumber}.md`);
      await this.Tools.createFile(contentPath, content);

      // 5. 生成并保存摘要
      const summaryPrompt = `请为以下章节内容生成精炼摘要（150-300字），提取核心知识点/情节：\n${content}`;
      const summary = await this.Tools.requestAI('文本摘要专家', summaryPrompt, 0.5);
      
      const summaryDir = path.join(bookDataDir, 'book_summary', `chapter_${sectionPlan.chapterNumber}`);
      await this.Tools.createDirectory(summaryDir);
      const summaryPath = path.join(summaryDir, `chapter_${sectionPlan.chapterNumber}_${sectionPlan.sectionNumber}_summary.md`);
      await this.Tools.createFile(summaryPath, summary);

      // 6. 更新进度
      progress.status = 'writing';
      progress.currentSectionIndex = targetIdx + 1;
      progress.completedSections.push(targetIdx);
      progress.updatedAt = formatDateTime();
      await this.Tools.modifyFile(progressPath, JSON.stringify(progress, null, 2));

      return {
        success: true,
        message: `第 ${sectionPlan.chapterNumber} 章第 ${sectionPlan.sectionNumber} 节生成完成`,
        contentPath,
        summaryPath,
        wordCount: getWordCount(content)
      };
    } catch (error) {
      console.error(error)
      return { success: false, message: `小节生成失败: ${error.message}` };
    }
  },

  resumeWriting: async function(bookDataDir) {
    return await this.writeSection(bookDataDir, -1);
  },

  getProgress: async function(bookDataDir) {
    try {
      const progressPath = path.join(bookDataDir, 'book_progress.json');
      if (!(await this.Tools.fileExists(progressPath))) return { success: false, message: '未找到进度文件' };
      const progressRaw = await this.Tools.readFile(progressPath);
      return { success: true, progress: JSON.parse(progressRaw.data.content) };
    } catch (error) {
      console.error(error)
      return { success: false, message: `读取进度失败: ${error.message}` };
    }
  },

  exportBook: async function(bookDataDir, format = 'md') {
    try {
      const chaptersDir = path.join(bookDataDir, 'book_chapters');
      const outlineRaw = await this.Tools.readFile(path.join(bookDataDir, 'book_outline.json'));
      const outline = JSON.parse(outlineRaw.data.content);
      let fullContent = `# ${outline.title}\n\n> ${outline.introduction || outline.theme}\n\n---\n\n`;

      // 按顺序读取所有章节文件
      const planRaw = await this.Tools.readFile(path.join(bookDataDir, 'book_chapter_plan.json'));
      const plan = JSON.parse(planRaw.data.content);
      for (const sec of plan.sections) {
        const filePath = path.join(chaptersDir, `chapter_${sec.chapterNumber}`, `chapter_${sec.chapterNumber}_${sec.sectionNumber}.md`);
        if (await this.Tools.fileExists(filePath)) {
          fullContent += `## ${sec.chapterTitle} - 第${sec.sectionNumber}节 ${sec.title}\n\n`;
          const chapterRaw = await this.Tools.readFile(filePath);
          fullContent += chapterRaw.data.content;
          fullContent += '\n\n---\n\n';
        }
      }

      const exportPath = path.join(bookDataDir, `book.${format}`);
      await this.Tools.createFile(exportPath, fullContent);
      return { success: true, message: `导出成功`, filePath: exportPath, totalWords: getWordCount(fullContent) };
    } catch (error) {
      console.error(error)
      return { success: false, message: `导出失败: ${error.message}` };
    }
  },

  extensionRule: function() {
    return `# 书籍创作扩展工具使用说明

## 核心流程
1. 初始化项目：\`initializeBook\`
2. 生成大纲：\`generateOutline\` (输出 book_outline.json，可传入 userOutline 参数约束 AI)
3. 生成规划：\`generateChapterPlan\` (输出 book_chapter_plan.json)
4. 逐节创作：\`writeSection\` (自动参考4要素，输出内容+摘要)
5. 断点续写：\`resumeWriting\`
6. 导出成书：\`exportBook\`

## 目录结构规范
\`\`\`
├── book_progress.json
├── book_outline.json
├── book_chapter_plan.json
├── book_chapters/
│   ├── chapter_0/
│   │   ├── chapter_0_0.1.md
│   │   └── ...
│   └── chapter_1/
│       └── ...
└── book_summary/
    ├── chapter_0/
    │   ├── chapter_0_0.1_summary.md
    │   └── ...
    └── chapter_1/
        └── ...
\`\`\`

## 创作参考四要素
每小节生成时自动注入：
1. 大纲对应小节信息
2. 章节规划内容要点
3. 前两小节摘要（保障上下文连贯）
4. getMatchedContent 匹配的参考文档

## 注意事项
- 严格按顺序执行，禁止跳过大纲/规划直接创作
- 进度由 book_progress.json 自动维护，支持随时中断续写
- 所有操作以小节为最小单元
- **若需固定目录结构，请在调用 generateOutline 时传入 userOutline 参数**
`;
  }
};

module.exports = {
  name: 'bookCreator',
  description: '基于文档匹配的长篇书籍创作工具。严格遵循 SKILL.md 规范，支持分小节生成、四要素参考、摘要同步输出与断点续写。',
  descriptions,
  functions,
};
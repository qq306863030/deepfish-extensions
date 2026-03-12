/**
 * 长篇小说网文生成工具
 * 使用本地文件存储来避免API上下文限制
 */

const path = require('path');
const fs = require('fs-extra');

// 工具函数：调用AI接口
async function callAI(systemDescription, prompt) {
    try {
        // 注意：这里使用this.Tools.requestAI，在实际工作流中会自动注入
        const result = await this.Tools.requestAI(systemDescription, prompt);
        return result;
    } catch (error) {
        console.error('AI调用失败:', error);
        throw new Error(`AI调用失败: ${error.message}`);
    }
}

// 工具函数：确保目录存在
function ensureDirectory(dirPath) {
    const fullPath = path.resolve(process.cwd(), dirPath);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
    return fullPath;
}

// 工具函数：获取章节文件路径
function getChapterFilePath(chapterNumber, chapterTitle = '') {
    const safeTitle = chapterTitle.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);
    const fileName = `chapter_${String(chapterNumber).padStart(4, '0')}_${safeTitle || 'chapter'}.txt`;
    return path.join('novel_chapters', fileName);
}

// 工具函数：获取摘要文件路径
function getSummaryFilePath(chapterNumber) {
    return path.join('novel_summaries', `summary_${String(chapterNumber).padStart(4, '0')}.txt`);
}

// 工具函数：获取大纲文件路径
function getOutlineFilePath() {
    return path.join('novel_data', 'outline.txt');
}

// 工具函数：获取合并文件路径
function getMergedFilePath() {
    return 'novel_complete.txt';
}

const toolDescriptions = [
    {
        name: 'generateNovelChapter',
        description: '小说生成工具：根据章节标题、大纲、风格和字数生成小说章节内容，保存为本地文件',
        parameters: {
            type: 'object',
            properties: {
                chapterNumber: {
                    type: 'integer',
                    description: '章节编号',
                },
                chapterTitle: {
                    type: 'string',
                    description: '章节标题',
                },
                outline: {
                    type: 'string',
                    description: '小说大纲或情节概要',
                },
                style: {
                    type: 'string',
                    description: '写作风格（如：悬疑、言情、玄幻等）',
                },
                wordCount: {
                    type: 'integer',
                    description: '目标字数（默认2000字）',
                },
                previousChapterSummary: {
                    type: 'string',
                    description: '前一章节的摘要，用于保持情节连贯性',
                }
            },
            required: ['chapterNumber', 'chapterTitle'],
        },
    },
    {
        name: 'createNovelOutline',
        description: '小说生成工具：生成整个小说的总体大纲，包括情节结构、人物设定、主题思想等',
        parameters: {
            type: 'object',
            properties: {
                genre: {
                    type: 'string',
                    description: '小说类型（如：玄幻、言情、科幻、悬疑等）',
                },
                theme: {
                    type: 'string',
                    description: '主题或核心思想',
                },
                targetWordCount: {
                    type: 'integer',
                    description: '目标总字数',
                },
                mainCharacters: {
                    type: 'string',
                    description: '主要人物设定（可选）',
                }
            },
            required: ['genre'],
        },
    },
    {
        name: 'summarizeChapter',
        description: '小说生成工具：生成章节摘要，提取关键情节、人物发展和伏笔，用于后续上下文',
        parameters: {
            type: 'object',
            properties: {
                chapterNumber: {
                    type: 'integer',
                    description: '章节编号',
                },
                chapterContent: {
                    type: 'string',
                    description: '章节内容（如果为空则从文件读取）',
                },
                detailLevel: {
                    type: 'string',
                    description: '摘要详细程度：brief（简要）、standard（标准）、detailed（详细）',
                }
            },
            required: ['chapterNumber'],
        },
    },
    {
        name: 'getNovelContext',
        description: '小说生成工具：读取指定章节范围的内容，返回摘要或关键信息，用于生成后续章节时提供上下文',
        parameters: {
            type: 'object',
            properties: {
                startChapter: {
                    type: 'integer',
                    description: '起始章节编号',
                },
                endChapter: {
                    type: 'integer',
                    description: '结束章节编号（可选，默认为最新章节）',
                },
                contextType: {
                    type: 'string',
                    description: '上下文类型：summary（摘要）、key_events（关键事件）、character_development（人物发展）',
                },
                maxLength: {
                    type: 'integer',
                    description: '最大返回长度（字符数）',
                }
            },
            required: ['startChapter'],
        },
    },
    {
        name: 'mergeNovelChapters',
        description: '小说生成工具：将所有章节合并为一个完整小说文件，可添加目录、封面和章节标题',
        parameters: {
            type: 'object',
            properties: {
                startChapter: {
                    type: 'integer',
                    description: '起始章节编号（默认从第1章开始）',
                },
                endChapter: {
                    type: 'integer',
                    description: '结束章节编号（默认到最新章节）',
                },
                format: {
                    type: 'string',
                    description: '输出格式：txt（纯文本）、md（Markdown）、html（HTML格式）',
                },
                includeToc: {
                    type: 'boolean',
                    description: '是否包含目录',
                }
            },
        },
    },
    {
        name: 'analyzeNovelStructure',
        description: '小说生成工具：分析已生成章节，确保情节连贯性，检查人物发展和情节逻辑',
        parameters: {
            type: 'object',
            properties: {
                startChapter: {
                    type: 'integer',
                    description: '起始章节编号',
                },
                endChapter: {
                    type: 'integer',
                    description: '结束章节编号',
                },
                analysisType: {
                    type: 'string',
                    description: '分析类型：coherence（连贯性）、character（人物一致性）、plot（情节逻辑）',
                }
            },
            required: ['startChapter'],
        },
    },
    {
        name: 'getNovelProgress',
        description: '小说生成工具：获取小说生成进度信息，包括已生成章节数、字数统计等',
        parameters: {
            type: 'object',
            properties: {
                includeDetails: {
                    type: 'boolean',
                    description: '是否包含详细章节列表',
                }
            },
        },
    }
];

const toolFunctions = {
    // 生成小说章节
    generateNovelChapter: async function(chapterNumber, chapterTitle, outline = '', style = '玄幻', wordCount = 2000, previousChapterSummary = '') {
        try {
            // 确保目录存在
            ensureDirectory('novel_chapters');
            ensureDirectory('novel_summaries');
            
            const chapterFilePath = getChapterFilePath(chapterNumber, chapterTitle);
            const fullPath = path.resolve(process.cwd(), chapterFilePath);
            
            // 构建AI提示
            const systemDesc = `你是一位专业的网络小说作家，擅长创作${style}类型的小说。请根据提供的信息创作一个小说章节。`;
            
            let prompt = `创作小说章节：\n`;
            prompt += `章节编号：第${chapterNumber}章\n`;
            prompt += `章节标题：${chapterTitle}\n`;
            prompt += `目标字数：约${wordCount}字\n`;
            prompt += `写作风格：${style}\n\n`;
            
            if (outline) {
                prompt += `小说大纲：${outline}\n\n`;
            }
            
            if (previousChapterSummary) {
                prompt += `前一章节摘要：${previousChapterSummary}\n\n`;
            }
            
            prompt += `请创作这一章节的内容，要求：\n`;
            prompt += `1. 情节推进合理，符合故事发展逻辑\n`;
            prompt += `2. 人物性格和行为保持一致\n`;
            prompt += `3. 语言生动，描写细腻\n`;
            prompt += `4. 为后续情节埋下伏笔\n`;
            prompt += `5. 章节结尾要有悬念或转折，吸引读者继续阅读\n\n`;
            prompt += `现在开始创作：\n`;
            
            // 调用AI生成章节内容
            const chapterContent = await callAI.call(this, systemDesc, prompt);
            
            // 保存章节内容
            const header = `第${chapterNumber}章 ${chapterTitle}\n\n`;
            const footer = `\n\n字数：约${wordCount}字\n生成时间：${new Date().toLocaleString()}\n`;
            const fullContent = header + chapterContent + footer;
            
            fs.writeFileSync(fullPath, fullContent, 'utf8');
            
            // 自动生成章节摘要
            try {
                await this.summarizeChapter(chapterNumber, chapterContent, 'standard');
            } catch (error) {
                console.warn(`章节摘要生成失败: ${error.message}`);
            }
            
            return {
                success: true,
                chapterNumber,
                chapterTitle,
                filePath: chapterFilePath,
                wordCount: chapterContent.length,
                message: `第${chapterNumber}章生成成功`
            };
        } catch (error) {
            console.error('生成章节失败:', error);
            return {
                success: false,
                chapterNumber,
                error: error.message
            };
        }
    },
    
    // 创建小说大纲
    createNovelOutline: async function(genre, theme = '', targetWordCount = 2000000, mainCharacters = '') {
        try {
            ensureDirectory('novel_data');
            
            const outlineFilePath = getOutlineFilePath();
            const fullPath = path.resolve(process.cwd(), outlineFilePath);
            
            const systemDesc = `你是一位专业的网络小说策划编辑，擅长${genre}类型小说的整体规划和结构设计。`;
            
            let prompt = `创作一部${genre}类型的小说大纲：\n`;
            prompt += `目标字数：${targetWordCount}字（约${Math.ceil(targetWordCount/2000)}章）\n\n`;
            
            if (theme) {
                prompt += `主题思想：${theme}\n`;
            }
            
            if (mainCharacters) {
                prompt += `主要人物：${mainCharacters}\n`;
            }
            
            prompt += `\n请提供以下内容：\n`;
            prompt += `1. 作品名称（建议3-5个备选）\n`;
            prompt += `2. 核心主题和思想内涵\n`;
            prompt += `3. 主要人物设定（主角、配角、反派）\n`;
            prompt += `4. 世界观设定（如为玄幻/科幻类型）\n`;
            prompt += `5. 整体情节结构（开端、发展、高潮、结局）\n`;
            prompt += `6. 分卷/分篇章规划（每卷约20-50章）\n`;
            prompt += `7. 关键情节节点和转折点\n`;
            prompt += `8. 伏笔和悬念设置\n`;
            prompt += `9. 预期读者群体和市场定位\n\n`;
            prompt += `请创作一个完整、详细的小说大纲：\n`;
            
            const outlineContent = await callAI.call(this, systemDesc, prompt);
            
            let header = `《${genre}小说大纲》\n`;
            header += `生成时间：${new Date().toLocaleString()}\n`;
            header += `目标字数：${targetWordCount}字\n\n`;
            
            const fullContent = header + outlineContent;
            fs.writeFileSync(fullPath, fullContent, 'utf8');
            
            return {
                success: true,
                filePath: outlineFilePath,
                wordCount: outlineContent.length,
                message: '小说大纲生成成功'
            };
        } catch (error) {
            console.error('生成大纲失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // 生成章节摘要
    summarizeChapter: async function(chapterNumber, chapterContent = '', detailLevel = 'standard') {
        try {
            ensureDirectory('novel_summaries');
            
            const summaryFilePath = getSummaryFilePath(chapterNumber);
            const fullPath = path.resolve(process.cwd(), summaryFilePath);
            
            // 如果未提供内容，则尝试从文件读取
            if (!chapterContent) {
                const chapterFile = getChapterFilePath(chapterNumber);
                const chapterFullPath = path.resolve(process.cwd(), chapterFile);
                
                if (fs.existsSync(chapterFullPath)) {
                    chapterContent = fs.readFileSync(chapterFullPath, 'utf8');
                } else {
                    throw new Error(`第${chapterNumber}章文件不存在`);
                }
            }
            
            // 截取内容，避免过长
            const contentForSummary = chapterContent.substring(0, 5000);
            
            const systemDesc = '你是一位专业的文学编辑，擅长提取小说章节的核心内容和关键信息。';
            
            let prompt = `提取第${chapterNumber}章的摘要：\n\n`;
            prompt += `章节内容（部分）：${contentForSummary}\n\n`;
            prompt += `请提供${detailLevel === 'brief' ? '简要' : detailLevel === 'detailed' ? '详细' : '标准'}摘要，包括：\n`;
            
            if (detailLevel === 'brief') {
                prompt += `1. 核心情节（50字以内）\n`;
                prompt += `2. 关键事件（1-2个）\n`;
            } else if (detailLevel === 'detailed') {
                prompt += `1. 情节概要（100-200字）\n`;
                prompt += `2. 关键事件和转折点\n`;
                prompt += `3. 人物发展和关系变化\n`;
                prompt += `4. 伏笔和悬念设置\n`;
                prompt += `5. 对后续情节的影响\n`;
            } else {
                prompt += `1. 情节概要（80-150字）\n`;
                prompt += `2. 关键事件\n`;
                prompt += `3. 人物发展\n`;
                prompt += `4. 重要伏笔\n`;
            }
            
            prompt += `\n请提供摘要：\n`;
            
            const summaryContent = await callAI.call(this, systemDesc, prompt);
            
            let header = `第${chapterNumber}章摘要\n`;
            header += `生成时间：${new Date().toLocaleString()}\n`;
            header += `详细程度：${detailLevel}\n\n`;
            
            const fullContent = header + summaryContent;
            fs.writeFileSync(fullPath, fullContent, 'utf8');
            
            return {
                success: true,
                chapterNumber,
                filePath: summaryFilePath,
                summaryLength: summaryContent.length,
                message: `第${chapterNumber}章摘要生成成功`
            };
        } catch (error) {
            console.error('生成摘要失败:', error);
            return {
                success: false,
                chapterNumber,
                error: error.message
            };
        }
    },
    
    // 获取小说上下文
    getNovelContext: async function(startChapter, endChapter = null, contextType = 'summary', maxLength = 2000) {
        try {
            ensureDirectory('novel_summaries');
            ensureDirectory('novel_chapters');
            
            // 确定结束章节
            if (!endChapter) {
                // 查找最新的章节文件
                const chaptersDir = path.resolve(process.cwd(), 'novel_chapters');
                if (fs.existsSync(chaptersDir)) {
                    const files = fs.readdirSync(chaptersDir);
                    const chapterFiles = files.filter(f => f.startsWith('chapter_'));
                    if (chapterFiles.length > 0) {
                        const chapterNumbers = chapterFiles.map(f => {
                            const match = f.match(/chapter_(\d+)/);
                            return match ? parseInt(match[1]) : 0;
                        }).filter(n => !isNaN(n));
                        
                        if (chapterNumbers.length > 0) {
                            endChapter = Math.max(...chapterNumbers);
                        } else {
                            endChapter = startChapter;
                        }
                    } else {
                        endChapter = startChapter;
                    }
                } else {
                    endChapter = startChapter;
                }
            }
            
            if (endChapter < startChapter) {
                throw new Error('结束章节不能小于起始章节');
            }
            
            let contextContent = '';
            
            if (contextType === 'summary') {
                // 使用摘要文件
                for (let i = startChapter; i <= endChapter; i++) {
                    const summaryFile = getSummaryFilePath(i);
                    const fullPath = path.resolve(process.cwd(), summaryFile);
                    
                    if (fs.existsSync(fullPath)) {
                        const summary = fs.readFileSync(fullPath, 'utf8');
                        contextContent += `第${i}章：\n${summary}\n\n`;
                    }
                }
            } else if (contextType === 'key_events') {
                // 提取关键事件
                const systemDesc = '你是一位专业的文学分析师，擅长从小说章节中提取关键事件和转折点。';
                
                let prompt = `从第${startChapter}章到第${endChapter}章中提取关键事件：\n\n`;
                
                // 收集章节内容
                for (let i = startChapter; i <= endChapter; i++) {
                    const chapterFile = getChapterFilePath(i);
                    const fullPath = path.resolve(process.cwd(), chapterFile);
                    
                    if (fs.existsSync(fullPath)) {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        // 只取前1000字符避免过长
                        prompt += `第${i}章（部分内容）：${content.substring(0, 1000)}...\n\n`;
                    }
                }
                
                prompt += `请提取这些章节中的关键事件、转折点和重要发展，按时间顺序排列。\n`;
                
                contextContent = await callAI.call(this, systemDesc, prompt);
            } else if (contextType === 'character_development') {
                // 提取人物发展
                const systemDesc = '你是一位专业的文学分析师，擅长分析小说人物的发展和变化。';
                
                let prompt = `分析第${startChapter}章到第${endChapter}章中的人物发展：\n\n`;
                
                for (let i = startChapter; i <= endChapter; i++) {
                    const summaryFile = getSummaryFilePath(i);
                    const fullPath = path.resolve(process.cwd(), summaryFile);
                    
                    if (fs.existsSync(fullPath)) {
                        const summary = fs.readFileSync(fullPath, 'utf8');
                        prompt += `第${i}章摘要：${summary}\n\n`;
                    }
                }
                
                prompt += `请分析这些章节中主要人物的发展变化，包括：\n`;
                prompt += `1. 性格变化\n2. 关系变化\n3. 重要抉择\n4. 成长轨迹\n`;
                
                contextContent = await callAI.call(this, systemDesc, prompt);
            }
            
            // 如果内容过长，进行截断
            if (contextContent.length > maxLength) {
                contextContent = contextContent.substring(0, maxLength) + '...（内容已截断）';
            }
            
            return {
                success: true,
                startChapter,
                endChapter,
                contextType,
                content: contextContent,
                length: contextContent.length,
                message: `成功获取第${startChapter}-${endChapter}章的${contextType}上下文`
            };
        } catch (error) {
            console.error('获取上下文失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // 合并小说章节
    mergeNovelChapters: async function(startChapter = 1, endChapter = null, format = 'txt', includeToc = true) {
        try {
            ensureDirectory('novel_chapters');
            
            // 确定结束章节
            if (!endChapter) {
                const chaptersDir = path.resolve(process.cwd(), 'novel_chapters');
                if (fs.existsSync(chaptersDir)) {
                    const files = fs.readdirSync(chaptersDir);
                    const chapterFiles = files.filter(f => f.startsWith('chapter_'));
                    if (chapterFiles.length > 0) {
                        const chapterNumbers = chapterFiles.map(f => {
                            const match = f.match(/chapter_(\d+)/);
                            return match ? parseInt(match[1]) : 0;
                        }).filter(n => !isNaN(n));
                        
                        if (chapterNumbers.length > 0) {
                            endChapter = Math.max(...chapterNumbers);
                        } else {
                            endChapter = startChapter;
                        }
                    } else {
                        throw new Error('没有找到章节文件');
                    }
                } else {
                    throw new Error('章节目录不存在');
                }
            }
            
            const mergedFilePath = getMergedFilePath();
            const fullPath = path.resolve(process.cwd(), mergedFilePath);
            
            let mergedContent = '';
            const toc = [];
            
            // 收集章节
            for (let i = startChapter; i <= endChapter; i++) {
                const chapterFile = getChapterFilePath(i);
                const chapterFullPath = path.resolve(process.cwd(), chapterFile);
                
                if (fs.existsSync(chapterFullPath)) {
                    const chapterContent = fs.readFileSync(chapterFullPath, 'utf8');
                    
                    // 提取章节标题
                    const firstLine = chapterContent.split('\n')[0];
                    const titleMatch = firstLine.match(/第\d+章\s+(.+)/);
                    const title = titleMatch ? titleMatch[1] : `第${i}章`;
                    
                    toc.push({ chapter: i, title });
                    
                    if (format === 'md') {
                        mergedContent += `## 第${i}章 ${title}\n\n`;
                        mergedContent += chapterContent.replace(/^第\d+章\s+.+\n\n/, '') + '\n\n';
                    } else if (format === 'html') {
                        mergedContent += `<h2>第${i}章 ${title}</h2>\n`;
                        mergedContent += `<div class="chapter-content">\n`;
                        mergedContent += chapterContent.replace(/^第\d+章\s+.+\n\n/, '').replace(/\n/g, '<br>\n');
                        mergedContent += `</div>\n\n`;
                    } else {
                        mergedContent += chapterContent + '\n\n';
                    }
                }
            }
            
            // 添加目录
            if (includeToc) {
                let tocContent = '';
                
                if (format === 'md') {
                    tocContent = '# 目录\n\n';
                    toc.forEach(item => {
                        tocContent += `- [第${item.chapter}章 ${item.title}](#第${item.chapter}章-${item.title})\n`;
                    });
                    tocContent += '\n';
                } else if (format === 'html') {
                    tocContent = '<h1>目录</h1>\n<ul>\n';
                    toc.forEach(item => {
                        tocContent += `  <li><a href="#chapter-${item.chapter}">第${item.chapter}章 ${item.title}</a></li>\n`;
                    });
                    tocContent += '</ul>\n\n';
                } else {
                    tocContent = '目录\n\n';
                    toc.forEach(item => {
                        tocContent += `第${item.chapter}章 ${item.title}\n`;
                    });
                    tocContent += '\n' + '='.repeat(50) + '\n\n';
                }
                
                mergedContent = tocContent + mergedContent;
            }
            
            // 添加文件头
            let header = '';
            if (format === 'md') {
                header = `# 完整小说\n\n`;
                header += `生成时间：${new Date().toLocaleString()}\n`;
                header += `章节范围：第${startChapter}章 - 第${endChapter}章\n`;
                header += `总章节数：${endChapter - startChapter + 1}\n\n`;
            } else if (format === 'html') {
                header = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>完整小说</title>\n<style>\nbody { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }\nh1, h2 { color: #333; }\n.chapter-content { margin-bottom: 40px; }\n</style>\n</head>\n<body>\n<h1>完整小说</h1>\n<p>生成时间：${new Date().toLocaleString()}</p>\n<p>章节范围：第${startChapter}章 - 第${endChapter}章</p>\n<p>总章节数：${endChapter - startChapter + 1}</p>\n\n`;
            } else {
                header = `完整小说\n`;
                header += `生成时间：${new Date().toLocaleString()}\n`;
                header += `章节范围：第${startChapter}章 - 第${endChapter}章\n`;
                header += `总章节数：${endChapter - startChapter + 1}\n`;
                header += '='.repeat(50) + '\n\n';
            }
            
            mergedContent = header + mergedContent;
            
            if (format === 'html') {
                mergedContent += '</body>\n</html>';
            }
            
            fs.writeFileSync(fullPath, mergedContent, 'utf8');
            
            // 计算总字数
            const wordCount = mergedContent.length;
            
            return {
                success: true,
                filePath: mergedFilePath,
                startChapter,
                endChapter,
                totalChapters: endChapter - startChapter + 1,
                wordCount,
                format,
                message: `成功合并第${startChapter}-${endChapter}章，共${endChapter - startChapter + 1}章`
            };
        } catch (error) {
            console.error('合并章节失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // 分析小说结构
    analyzeNovelStructure: async function(startChapter, endChapter = null, analysisType = 'coherence') {
        try {
            ensureDirectory('novel_chapters');
            ensureDirectory('novel_summaries');
            
            // 确定结束章节
            if (!endChapter) {
                const chaptersDir = path.resolve(process.cwd(), 'novel_chapters');
                if (fs.existsSync(chaptersDir)) {
                    const files = fs.readdirSync(chaptersDir);
                    const chapterFiles = files.filter(f => f.startsWith('chapter_'));
                    if (chapterFiles.length > 0) {
                        const chapterNumbers = chapterFiles.map(f => {
                            const match = f.match(/chapter_(\d+)/);
                            return match ? parseInt(match[1]) : 0;
                        }).filter(n => !isNaN(n));
                        
                        if (chapterNumbers.length > 0) {
                            endChapter = Math.max(...chapterNumbers);
                        } else {
                            endChapter = startChapter;
                        }
                    } else {
                        throw new Error('没有找到章节文件');
                    }
                } else {
                    throw new Error('章节目录不存在');
                }
            }
            
            // 收集章节摘要
            let summaries = '';
            for (let i = startChapter; i <= endChapter; i++) {
                const summaryFile = getSummaryFilePath(i);
                const fullPath = path.resolve(process.cwd(), summaryFile);
                
                if (fs.existsSync(fullPath)) {
                    const summary = fs.readFileSync(fullPath, 'utf8');
                    summaries += `第${i}章：${summary}\n\n`;
                }
            }
            
            if (!summaries) {
                throw new Error('没有找到章节摘要');
            }
            
            const systemDesc = '你是一位专业的文学分析师和编辑，擅长分析小说的结构和逻辑。';
            
            let prompt = `分析小说第${startChapter}章到第${endChapter}章的结构：\n\n`;
            prompt += `章节摘要：\n${summaries}\n\n`;
            
            if (analysisType === 'coherence') {
                prompt += `请分析这些章节的情节连贯性：\n`;
                prompt += `1. 情节发展是否合理自然\n`;
                prompt += `2. 转折点是否合理\n`;
                prompt += `3. 节奏控制是否恰当\n`;
                prompt += `4. 是否存在逻辑漏洞\n`;
                prompt += `5. 提出改进建议\n`;
            } else if (analysisType === 'character') {
                prompt += `请分析这些章节中的人物一致性：\n`;
                prompt += `1. 主要人物性格是否前后一致\n`;
                prompt += `2. 人物行为是否符合其性格设定\n`;
                prompt += `3. 人物关系发展是否合理\n`;
                prompt += `4. 人物成长轨迹是否清晰\n`;
                prompt += `5. 提出改进建议\n`;
            } else if (analysisType === 'plot') {
                prompt += `请分析这些章节的情节逻辑：\n`;
                prompt += `1. 主线情节是否清晰\n`;
                prompt += `2. 支线情节是否与主线关联合理\n`;
                prompt += `3. 伏笔设置和回收是否恰当\n`;
                prompt += `4. 悬念设置是否有效\n`;
                prompt += `5. 高潮部分是否足够精彩\n`;
                prompt += `6. 提出改进建议\n`;
            }
            
            const analysisResult = await callAI.call(this, systemDesc, prompt);
            
            // 保存分析结果
            const analysisFilePath = path.join('novel_data', `analysis_${startChapter}_${endChapter}_${analysisType}.txt`);
            ensureDirectory('novel_data');
            const fullAnalysisPath = path.resolve(process.cwd(), analysisFilePath);
            
            let header = `小说结构分析报告\n`;
            header += `分析范围：第${startChapter}章 - 第${endChapter}章\n`;
            header += `分析类型：${analysisType}\n`;
            header += `分析时间：${new Date().toLocaleString()}\n\n`;
            
            fs.writeFileSync(fullAnalysisPath, header + analysisResult, 'utf8');
            
            return {
                success: true,
                startChapter,
                endChapter,
                analysisType,
                filePath: analysisFilePath,
                message: `小说结构分析完成，结果已保存`
            };
        } catch (error) {
            console.error('分析小说结构失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // 获取小说进度
    getNovelProgress: async function(includeDetails = false) {
        try {
            const chaptersDir = path.resolve(process.cwd(), 'novel_chapters');
            const summariesDir = path.resolve(process.cwd(), 'novel_summaries');
            
            let totalChapters = 0;
            let totalWordCount = 0;
            let chapterDetails = [];
            
            if (fs.existsSync(chaptersDir)) {
                const files = fs.readdirSync(chaptersDir);
                const chapterFiles = files.filter(f => f.startsWith('chapter_'));
                totalChapters = chapterFiles.length;
                
                // 计算总字数
                for (const file of chapterFiles) {
                    const filePath = path.join(chaptersDir, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    totalWordCount += content.length;
                    
                    // 提取章节信息
                    const chapterMatch = file.match(/chapter_(\d+)_(.+)\.txt/);
                    if (chapterMatch) {
                        const chapterNum = parseInt(chapterMatch[1]);
                        const title = chapterMatch[2].replace(/_/g, ' ');
                        
                        if (includeDetails) {
                            chapterDetails.push({
                                chapter: chapterNum,
                                title: title,
                                wordCount: content.length,
                                fileName: file
                            });
                        }
                    }
                }
                
                // 按章节号排序
                chapterDetails.sort((a, b) => a.chapter - b.chapter);
            }
            
            // 检查大纲是否存在
            const outlinePath = path.resolve(process.cwd(), getOutlineFilePath());
            const hasOutline = fs.existsSync(outlinePath);
            
            // 检查合并文件是否存在
            const mergedPath = path.resolve(process.cwd(), getMergedFilePath());
            const hasMerged = fs.existsSync(mergedPath);
            
            const progress = {
                success: true,
                totalChapters,
                totalWordCount,
                estimatedTotalWords: totalWordCount,
                hasOutline,
                hasMerged,
                completionRate: totalChapters > 0 ? Math.min(100, (totalChapters / 1000) * 100) : 0, // 假设目标1000章
                message: `当前进度：已生成${totalChapters}章，约${Math.round(totalWordCount/500)}字`
            };
            
            if (includeDetails && chapterDetails.length > 0) {
                progress.chapterDetails = chapterDetails;
            }
            
            return progress;
        } catch (error) {
            console.error('获取进度失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};

module.exports = {
    toolDescriptions,
    toolFunctions,
};
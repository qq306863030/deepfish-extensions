// 小说创作扩展工具测试文件
// 测试核心功能的可用性和正确性

const path = require('path');
const fs = require('fs');

// 模拟AI工具函数
const mockTools = {
  createDirectory: async (dirPath) => {
    console.log(`[MOCK] 创建目录: ${dirPath}`);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  },
  
  createFile: async (filePath, content) => {
    console.log(`[MOCK] 创建文件: ${filePath}`);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  },
  
  modifyFile: async (filePath, content) => {
    console.log(`[MOCK] 修改文件: ${filePath}`);
    if (fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  },
  
  readFile: async (filePath) => {
    console.log(`[MOCK] 读取文件: ${filePath}`);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    return null;
  },
  
  fileExists: async (filePath) => {
    return fs.existsSync(filePath);
  },
  
  requestAI: async (systemDescription, prompt, temperature = 0.7) => {
    console.log(`[MOCK] AI请求: ${systemDescription}`);
    console.log(`[MOCK] 提示词长度: ${prompt.length}字符`);
    
    // 根据不同的系统描述返回模拟响应
    if (systemDescription.includes('大纲')) {
      return `# 模拟小说大纲

## 核心冲突
主人公面临内心挣扎与外部挑战的双重压力。

## 主要人物
1. 主人公：勇敢坚定的年轻人
2. 导师：智慧的长者
3. 反派：强大的黑暗势力

## 故事结构
1. 开端：平凡世界中的异变
2. 发展：主人公踏上旅程
3. 高潮：最终决战
4. 结局：新世界的建立

## 主题表达
勇气、牺牲与成长的主题贯穿始终。

## 关键情节节点
- 第1章：召唤与启程
- 第5章：第一次重大考验
- 第10章：真相揭露
- 第15章：最终决战`;
    } else if (systemDescription.includes('章节规划')) {
      return `[
  {
    "title": "第1章：异世界的召唤",
    "summary": "主人公收到神秘召唤，开始不平凡的冒险",
    "keyPoints": ["收到召唤信", "告别家人", "踏上旅程"],
    "characters": ["主人公", "家人"],
    "wordTarget": 3000,
    "content": "",
    "status": "planned"
  },
  {
    "title": "第2章：迷雾森林",
    "summary": "主人公穿越危险的迷雾森林，遇到第一个挑战",
    "keyPoints": ["进入森林", "遭遇怪兽", "获得帮助"],
    "characters": ["主人公", "森林守护者"],
    "wordTarget": 3200,
    "content": "",
    "status": "planned"
  }
]`;
    } else if (systemDescription.includes('章节内容')) {
      return `# 第1章：异世界的召唤

清晨的阳光透过窗户洒在书桌上，李明的目光被一封奇特的信件吸引。信封是深紫色的，上面用金色的墨水写着他的名字，字迹优雅而神秘。

"这是谁寄来的？"李明喃喃自语，手指轻轻触摸信封表面。

他小心翼翼地拆开信封，里面是一张泛黄的羊皮纸。纸上的文字似乎在发光：

"被选中的人啊，你的命运在召唤。当午夜钟声响起，前往城市中央的古老钟楼，那里有通往另一个世界的门户。时间不多，世界需要你的勇气。"

李明的心跳加速。这是什么恶作剧吗？还是……某种命运的召唤？

他看向窗外，夕阳正在西下。距离午夜还有几个小时。

"我该怎么办？"他问自己。内心深处，一股从未有过的冲动在涌动。

最终，他做出了决定。无论这是真是假，他都要去看看。如果真的是命运的召唤，他不想错过。

夜幕降临，李明收拾好简单的行装，给家人留下了一张字条："我有些事情要处理，明天回来。别担心。"

他走出家门，向着城市中央的钟楼走去。每一步都坚定而有力，仿佛有一种无形的力量在指引着他。

午夜时分，钟楼的钟声准时响起。当最后一声钟响回荡在夜空中时，钟楼的大门缓缓打开，一道耀眼的光芒从中射出。

李明深吸一口气，迈步走进了光芒之中。

新的世界，新的冒险，就此开始。`;
    }
    
    return '模拟AI响应内容';
  }
};

// 模拟AICLI环境
const mockAiCli = {
  Tools: mockTools
};

// 创建绑定this的包装函数
function bindFunction(func) {
  return function(...args) {
    return func.call({ aiCli: mockAiCli }, ...args);
  };
}

// 导入扩展模块
const extension = require('./index.js');

// 创建绑定this的函数副本
const boundFunctions = {};
for (const [name, func] of Object.entries(extension.functions)) {
  if (typeof func === 'function') {
    boundFunctions[name] = bindFunction(func);
  }
}

// 测试用例计数器
let totalTests = 0;
let passedTests = 0;
let failedTests = [];

// 测试辅助函数
function runTest(testName, testFunc) {
  totalTests++;
  console.log(`\n=== 测试用例: ${testName} ===`);
  
  try {
    const result = testFunc();
    console.log(`✓ 测试通过`);
    passedTests++;
    return result;
  } catch (error) {
    console.log(`✗ 测试失败: ${error.message}`);
    failedTests.push({ testName, error });
    return null;
  }
}

// 清理临时文件
function cleanup() {
  const testDir = path.join(__dirname, 'tmp_test_novel');
  if (fs.existsSync(testDir)) {
    try {
      // 删除目录及其内容
      const deleteRecursive = (dir) => {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const curPath = path.join(dir, file);
            if (fs.lstatSync(curPath).isDirectory()) {
              deleteRecursive(curPath);
            } else {
              fs.unlinkSync(curPath);
            }
          }
          fs.rmdirSync(dir);
        }
      };
      deleteRecursive(testDir);
      console.log('已清理临时文件');
    } catch (error) {
      console.log('清理临时文件时出错:', error.message);
    }
  }
}

// 主测试函数
async function main() {
  console.log('开始测试小说创作扩展工具...');
  console.log('='.repeat(50));
  
  // 测试前清理
  cleanup();
  
  // 测试1: 初始化小说项目
  const initResult = await runTest('初始化小说项目', async () => {
    const result = await boundFunctions.novelCreator_initializeNovel(
      '测试小说',
      '勇气与成长的冒险故事',
      30000,
      '奇幻',
      '中世纪魔法世界',
      __dirname
    );
    
    if (!result.success) {
      throw new Error(`初始化失败: ${result.message}`);
    }
    
    console.log(`项目目录: ${result.projectDir}`);
    console.log(`数据文件: ${result.dataFilePath}`);
    
    // 验证文件是否存在
    const dataExists = fs.existsSync(result.dataFilePath);
    if (!dataExists) {
      throw new Error('数据文件未创建');
    }
    
    // 验证数据内容
    const dataContent = fs.readFileSync(result.dataFilePath, 'utf8');
    const novelData = JSON.parse(dataContent);
    
    if (novelData.title !== '测试小说') {
      throw new Error('标题不匹配');
    }
    
    if (novelData.targetWordCount !== 30000) {
      throw new Error('目标字数不匹配');
    }
    
    return result;
  });
  
  if (!initResult) {
    console.log('初始化测试失败，跳过后续测试');
    cleanup();
    printSummary();
    return;
  }
  
  // 测试2: 生成小说大纲
  await runTest('生成小说大纲', async () => {
    const result = await boundFunctions.novelCreator_generateOutline(
      initResult.dataFilePath
    );
    
    if (!result.success) {
      throw new Error(`大纲生成失败: ${result.message}`);
    }
    
    console.log(`大纲文件: ${result.outlineFilePath}`);
    
    // 验证大纲文件是否存在
    const outlineExists = fs.existsSync(result.outlineFilePath);
    if (!outlineExists) {
      throw new Error('大纲文件未创建');
    }
    
    // 验证数据文件已更新
    const dataContent = fs.readFileSync(initResult.dataFilePath, 'utf8');
    const novelData = JSON.parse(dataContent);
    
    if (!novelData.outline) {
      throw new Error('大纲未保存到数据文件');
    }
    
    if (novelData.status !== 'outline_generated') {
      throw new Error('状态未更新');
    }
    
    return result;
  });
  
  // 测试3: 生成章节规划
  await runTest('生成章节规划', async () => {
    const result = await boundFunctions.novelCreator_generateChapterPlan(
      initResult.dataFilePath
    );
    
    if (!result.success) {
      throw new Error(`章节规划失败: ${result.message}`);
    }
    
    console.log(`章节数: ${result.chapterCount}`);
    console.log(`规划文件: ${result.chapterPlanFilePath}`);
    
    // 验证规划文件是否存在
    const planExists = fs.existsSync(result.chapterPlanFilePath);
    if (!planExists) {
      throw new Error('章节规划文件未创建');
    }
    
    // 验证数据文件已更新
    const dataContent = fs.readFileSync(initResult.dataFilePath, 'utf8');
    const novelData = JSON.parse(dataContent);
    
    if (!novelData.chapters || novelData.chapters.length === 0) {
      throw new Error('章节数据未保存');
    }
    
    if (novelData.status !== 'chapter_planned') {
      throw new Error('状态未更新');
    }
    
    return result;
  });
  
  // 测试4: 获取写作进度
  await runTest('获取写作进度', async () => {
    const result = await boundFunctions.novelCreator_getProgress(
      initResult.dataFilePath
    );
    
    if (!result.success) {
      throw new Error(`获取进度失败: ${result.message}`);
    }
    
    console.log(`小说标题: ${result.novelInfo.title}`);
    console.log(`总章节数: ${result.progress.totalChapters}`);
    console.log(`完成章节: ${result.progress.completedChapters}`);
    console.log(`进度: ${result.progress.completionRate}%`);
    
    if (result.progress.totalChapters === 0) {
      throw new Error('未检测到章节');
    }
    
    return result;
  });
  
  // 测试5: 生成章节内容
  await runTest('生成章节内容', async () => {
    const result = await boundFunctions.novelCreator_generateChapterContent(
      initResult.dataFilePath,
      0, // 第1章
      1  // 生成1章
    );
    
    if (!result.success) {
      throw new Error(`章节生成失败: ${result.message}`);
    }
    
    console.log(`生成章节数: ${result.results.length}`);
    
    if (result.results.length === 0) {
      throw new Error('未生成任何章节');
    }
    
    const chapterResult = result.results[0];
    console.log(`章节标题: ${chapterResult.title}`);
    console.log(`字数: ${chapterResult.wordCount}`);
    console.log(`文件: ${chapterResult.filePath}`);
    
    // 验证章节文件是否存在
    const chapterExists = fs.existsSync(chapterResult.filePath);
    if (!chapterExists) {
      throw new Error('章节文件未创建');
    }
    
    // 验证章节内容
    const chapterContent = fs.readFileSync(chapterResult.filePath, 'utf8');
    if (!chapterContent || chapterContent.length < 100) {
      throw new Error('章节内容过短');
    }
    
    return result;
  });
  
  // 测试6: 再次获取进度（检查更新）
  await runTest('检查进度更新', async () => {
    const result = await boundFunctions.novelCreator_getProgress(
      initResult.dataFilePath
    );
    
    if (!result.success) {
      throw new Error(`获取进度失败: ${result.message}`);
    }
    
    console.log(`完成章节数: ${result.chapterStatus.completed}`);
    console.log(`总字数: ${result.progress.totalWordCount}`);
    
    if (result.chapterStatus.completed === 0) {
      throw new Error('完成章节数未更新');
    }
    
    return result;
  });
  
  // 测试7: 断点续写
  await runTest('断点续写', async () => {
    const result = await boundFunctions.novelCreator_resumeWriting(
      initResult.dataFilePath
    );
    
    if (!result.success) {
      throw new Error(`断点续写失败: ${result.message}`);
    }
    
    console.log(`续写结果: ${result.message}`);
    
    // 如果还有未完成章节，应该继续生成
    if (result.nextChapter) {
      console.log(`继续生成第${result.nextChapter}章`);
    }
    
    return result;
  });
  
  // 测试8: 扩展工具说明函数
  await runTest('扩展工具说明', () => {
    const result = boundFunctions.novelCreator_extensionRule();
    
    if (!result || typeof result !== 'string') {
      throw new Error('说明函数未返回有效内容');
    }
    
    if (result.length < 100) {
      throw new Error('说明内容过短');
    }
    
    console.log(`说明文档长度: ${result.length}字符`);
    console.log(`包含概述: ${result.includes('概述')}`);
    console.log(`包含使用流程: ${result.includes('使用流程')}`);
    
    return result;
  });
  
  // 清理测试文件
  cleanup();
  
  // 打印测试总结
  printSummary();
}

// 打印测试总结
function printSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('测试总结:');
  console.log(`总测试用例: ${totalTests}`);
  console.log(`通过: ${passedTests}`);
  console.log(`失败: ${failedTests.length}`);
  
  if (failedTests.length > 0) {
    console.log('\n失败用例详情:');
    failedTests.forEach(({ testName, error }) => {
      console.log(`  ${testName}: ${error.message}`);
    });
  }
  
  if (passedTests === totalTests) {
    console.log('\n✅ 所有测试通过！');
  } else {
    console.log('\n❌ 存在测试失败用例');
  }
}

// 执行测试
main().catch(error => {
  console.error('测试执行出错:', error);
  cleanup();
  printSummary();
  process.exit(1);
});
// 导入扩展模块
const extension = require('./index.js')

async function test() {
  const deepfishPath = 'D:\\code\\my_project\\github\\deepfish\\src\\index.js'
  const deepfishModule = require(deepfishPath)
  const AICLI = deepfishModule.AICLI
  extension.functions.aiCli = new AICLI()
  const result = await extension.functions['sftpDownload_interactiveDownload']()
  console.log('函数调用结果:', JSON.stringify(result, null, 2))
}

test()
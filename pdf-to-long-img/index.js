const { pdfToLongImage } = require('./core.js');

const descriptions = [
  {
    name: 'pdfConversion_toLongImage',
    description: 'PDF转换:将PDF文件转换为长图，将PDF的每一页拼接成一个垂直排列的PNG长图',
    parameters: {
      type: 'object',
      properties: {
        pdfPath: {
          type: 'string',
          description: 'PDF文件的路径（相对或绝对路径）'
        },
        outputImagePath: {
          type: 'string',
          description: '输出PNG长图的路径（相对或绝对路径）'
        }
      },
      required: ['pdfPath', 'outputImagePath']
    }
  }
];

const functions = {
  pdfConversion_toLongImage: async (pdfPath, outputImagePath) => {
    try {
      console.log(`开始转换PDF文件: ${pdfPath} -> ${outputImagePath}`);
      await pdfToLongImage(pdfPath, outputImagePath);
      return `PDF转换成功: ${outputImagePath}`;
    } catch (error) {
      console.error('PDF转长图失败:', error);
      return `PDF转长图失败: ${error.message}`;
    }
  }
};

module.exports = {
  descriptions,
  functions,
};
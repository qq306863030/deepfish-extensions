const fs = require("fs-extra");
const path = require("path");
const { pdf } = require("pdf-to-img");
const sharp = require("sharp");

async function pdfToLongImage(pdfPath, outputImagePath) {
  try {
    pdfPath = path.resolve('.', pdfPath);
    outputImagePath = path.resolve('.', outputImagePath);
    console.log(`开始转换 ${pdfPath} 为长图: ${outputImagePath}`)
    // 0. 确保输出目录存在
    fs.ensureDirSync(path.dirname(outputImagePath));
    // 1. 读取 PDF 文档，设置 scale 参数可提高图片清晰度
    const document = await pdf(pdfPath, { scale: 2 });
    const pages = [];

    // 2. 遍历每一页，将图片 Buffer 收集起来
    for await (const pageBuffer of document) {
      pages.push(pageBuffer);
    }

    if (pages.length === 0) {
      console.log(`PDF ${pdfPath} 没有页面`);
      return;
    }

    // 3. 获取所有页面的尺寸，计算最大宽度和总高度
    let maxWidth = 0;
    let totalHeight = 0;
    const pageHeights = [];
    
    for (const pageBuffer of pages) {
      const metadata = await sharp(pageBuffer).metadata();
      maxWidth = Math.max(maxWidth, metadata.width);
      totalHeight += metadata.height;
      pageHeights.push(metadata.height);
    }

    // 4. 构建 sharp 的输入：将图片 Buffer 数组叠加，并设置垂直偏移
    const sharpInput = [];
    let currentHeight = 0;
    
    for (let i = 0; i < pages.length; i++) {
      const pageBuffer = pages[i];
      const pageHeight = pageHeights[i];
      
      // 获取当前页面的实际宽度
      const pageMetadata = await sharp(pageBuffer).metadata();
      const pageWidth = pageMetadata.width;
      
      // 计算水平居中的偏移量
      const leftOffset = Math.floor((maxWidth - pageWidth) / 2);
      
      sharpInput.push({
        input: pageBuffer,
        top: currentHeight, // 每页依次向下排列
        left: leftOffset, // 水平居中
      });
      
      currentHeight += pageHeight;
    }

    // 5. 使用 sharp 合成长图
    await sharp({
      create: {
        width: maxWidth,
        height: totalHeight, // 总高度 = 所有页面高度之和
        channels: 4, // RGBA
        background: { r: 255, g: 255, b: 255, alpha: 1 }, // 白色背景
      },
    })
      .composite(sharpInput)
      .png() // 输出为 PNG 格式
      .toFile(outputImagePath);

    console.log(`成功将 ${pdfPath} 转换为长图: ${outputImagePath}`);
  } catch (error) {
    console.error(`转换失败 ${pdfPath}:`, error);
  }
}

/**
 * 将目录中的所有PDF文件转换为PNG格式的长图
 * @param {string} inputDir 输入目录（默认为当前目录）
 * @param {string} outputDir 输出目录（默认为'./'）
 */
async function convertAllPdfsInDirectory(inputDir = ".", outputDir = "./") {
  try {
    // 确保输出目录存在
    await fs.mkdir(outputDir, { recursive: true });

    // 读取输入目录中的所有文件
    const files = await fs.readdir(inputDir);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith(".pdf"));

    if (pdfFiles.length === 0) {
      console.log(`在目录 ${inputDir} 中没有找到PDF文件`);
      return;
    }

    console.log(`找到 ${pdfFiles.length} 个PDF文件，开始转换...`);

    // 依次转换每个PDF文件（避免同时处理太多文件，防止内存溢出）
    for (const pdfFile of pdfFiles) {
      const pdfPath = path.join(inputDir, pdfFile);
      const outputImageName = path.basename(pdfFile, ".pdf") + "_long.png";
      const outputImagePath = path.join(outputDir, outputImageName);

      console.log(`正在处理: ${pdfFile}`);
      await pdfToLongImage(pdfPath, outputImagePath);
    }

    console.log("所有PDF文件转换完成！");
  } catch (error) {
    console.error("处理目录时出错:", error);
  }
}

module.exports = {
  pdfToLongImage,
  convertAllPdfsInDirectory
};
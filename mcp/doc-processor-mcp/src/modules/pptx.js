import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import PptxGenJS from 'pptxgenjs';
import { resolveTargetOutputPath } from '../utils.js';

export async function getPptxInfo(filePath) {
  const full = path.resolve(process.cwd(), filePath);
  const zip = new AdmZip(full);
  const entries = zip.getEntries();
  const slideEntries = entries.filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName));
  const stat = await fs.promises.stat(full);

  return {
    filePath: full,
    sizeBytes: stat.size,
    slideCount: slideEntries.length,
  };
}

export async function extractPptxImages(filePath, outputDir = null) {
  const full = path.resolve(process.cwd(), filePath);
  const zip = new AdmZip(full);
  const entries = zip.getEntries();

  const imageEntries = entries.filter(e => /^ppt\/media\//.test(e.entryName));
  const targetDir = outputDir
    ? path.resolve(process.cwd(), outputDir)
    : path.resolve(process.cwd(), `${path.basename(filePath, path.extname(filePath))}_images`);

  await fs.promises.mkdir(targetDir, { recursive: true });

  const extractedFiles = [];
  for (const entry of imageEntries) {
    const filename = path.basename(entry.entryName);
    const dest = path.join(targetDir, filename);
    await fs.promises.writeFile(dest, entry.getData());
    extractedFiles.push(filename);
  }

  return {
    outputDir: targetDir,
    totalImages: extractedFiles.length,
    files: extractedFiles,
  };
}

export async function createPptxDocument(slides = [], outputPath = null, options = {}) {
  const pptx = new PptxGenJS();
  pptx.layout = options.layout || 'LAYOUT_WIDE';

  for (const s of slides) {
    const slide = pptx.addSlide();
    if (s.title) {
      slide.addText(s.title, {
        x: 0.8,
        y: 0.6,
        w: '88%',
        h: 1.0,
        fontSize: 26,
        bold: true,
        color: s.titleColor || '1F2937'
      });
    }
    if (Array.isArray(s.bulletPoints) && s.bulletPoints.length > 0) {
      const textItems = s.bulletPoints.map(bp => ({
        text: bp,
        options: { bullet: true, fontSize: 16, color: '4B5563', breakLine: true }
      }));
      slide.addText(textItems, { x: 1.0, y: 1.8, w: '84%', h: 4.5, lineSpacing: 28 });
    } else if (s.content) {
      slide.addText(s.content, { x: 1.0, y: 1.8, w: '84%', h: 4.5, fontSize: 16, color: '4B5563' });
    }
  }

  const finalOut = resolveTargetOutputPath('presentation.pptx', 'pptx', outputPath, true);
  await fs.promises.mkdir(path.dirname(finalOut), { recursive: true });
  await pptx.writeFile({ fileName: finalOut });

  return { outputPath: finalOut, slideCount: slides.length };
}

export async function replacePptxText(filePath, searchText, replaceText, outputPath = null) {
  const full = path.resolve(process.cwd(), filePath);
  const zip = new AdmZip(full);
  const entries = zip.getEntries();
  let replaceCount = 0;

  for (const entry of entries) {
    if (/^ppt\/slides\/slide\d+\.xml$/.test(entry.entryName)) {
      let xml = entry.getData().toString('utf8');
      if (xml.includes(searchText)) {
        const count = xml.split(searchText).length - 1;
        xml = xml.replaceAll(searchText, replaceText || '');
        replaceCount += count;
        zip.updateFile(entry.entryName, Buffer.from(xml, 'utf8'));
      }
    }
  }

  const finalOut = resolveTargetOutputPath(filePath, 'pptx', outputPath, true);
  await fs.promises.mkdir(path.dirname(finalOut), { recursive: true });
  zip.writeZip(finalOut);

  return { outputPath: finalOut, replaceCount };
}

/**
 * Convert multiple image files into a PowerPoint (.pptx) presentation.
 * Each image is placed on an individual slide.
 */
export async function imagesToPptx(imagePaths = [], outputPath = null, options = {}) {
  if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
    throw new Error('At least one image path is required for imagesToPptx.');
  }

  const pptx = new PptxGenJS();
  pptx.layout = options.layout || 'LAYOUT_WIDE';
  const bgColor = (options.backgroundColor || 'FFFFFF').replace(/^#/, '');
  const sizingType = options.sizing || 'contain';

  const is4x3 = pptx.layout === 'LAYOUT_4x3';
  const slideW = 10;
  const slideH = is4x3 ? 7.5 : 5.625;

  let slideIndex = 0;
  for (const imgPath of imagePaths) {
    const fullImgPath = path.resolve(process.cwd(), imgPath);
    if (!fs.existsSync(fullImgPath)) {
      throw new Error(`Image file not found: "${fullImgPath}"`);
    }

    const slide = pptx.addSlide();
    slide.background = { color: bgColor };

    const title = Array.isArray(options.titles) ? options.titles[slideIndex] : null;
    let imgTop = 0;
    let imgHeight = slideH;

    if (title && typeof title === 'string') {
      slide.addText(title, {
        x: 0.5,
        y: 0.3,
        w: slideW - 1.0,
        h: 0.8,
        fontSize: 20,
        bold: true,
        color: options.titleColor || (bgColor === '000000' ? 'FFFFFF' : '1F2937')
      });
      imgTop = 1.2;
      imgHeight = slideH - 1.4;
    }

    if (sizingType === 'full' || sizingType === 'stretch') {
      slide.addImage({
        path: fullImgPath,
        x: 0,
        y: imgTop,
        w: slideW,
        h: imgHeight
      });
    } else {
      slide.addImage({
        path: fullImgPath,
        x: 0,
        y: imgTop,
        w: slideW,
        h: imgHeight,
        sizing: {
          type: sizingType === 'cover' ? 'cover' : 'contain',
          w: slideW,
          h: imgHeight
        }
      });
    }

    slideIndex++;
  }

  const finalOut = resolveTargetOutputPath('images_presentation.pptx', 'pptx', outputPath, true);
  await fs.promises.mkdir(path.dirname(finalOut), { recursive: true });
  await pptx.writeFile({ fileName: finalOut });

  const stat = await fs.promises.stat(finalOut);
  return {
    success: true,
    outputPath: finalOut,
    totalSlides: imagePaths.length,
    sizeBytes: stat.size
  };
}


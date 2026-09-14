import fs from 'node:fs';
import path from 'node:path';
import pdfParse from 'pdf-parse';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import { resolveTargetOutputPath } from '../utils.js';

export async function getPdfInfo(filePath) {
  const fullPath = path.resolve(process.cwd(), filePath);
  const dataBuffer = await fs.promises.readFile(fullPath);
  const parseData = await pdfParse(dataBuffer);
  const stat = await fs.promises.stat(fullPath);

  return {
    filePath: fullPath,
    sizeBytes: stat.size,
    pageCount: parseData.numpages,
    charCount: parseData.text.length,
    info: parseData.info,
  };
}

export async function mergePdfFiles(inputPaths = [], outputPath = null) {
  if (!Array.isArray(inputPaths) || inputPaths.length < 2) {
    throw new Error('At least 2 PDF file paths are required for merging.');
  }

  const mergedPdf = await PDFDocument.create();

  for (const p of inputPaths) {
    const full = path.resolve(process.cwd(), p);
    const pdfBytes = await fs.promises.readFile(full);
    const doc = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
    copiedPages.forEach(page => mergedPdf.addPage(page));
  }

  const finalOut = resolveTargetOutputPath('merged.pdf', 'pdf', outputPath, true);
  await fs.promises.mkdir(path.dirname(finalOut), { recursive: true });
  const mergedBytes = await mergedPdf.save();
  await fs.promises.writeFile(finalOut, mergedBytes);

  return { outputPath: finalOut, pageCount: mergedPdf.getPageCount() };
}

export async function addPdfWatermarkText(filePath, watermarkText, outputPath = null, options = {}) {
  const full = path.resolve(process.cwd(), filePath);
  const pdfBytes = await fs.promises.readFile(full);
  const doc = await PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);

  const opacity = options.opacity !== undefined ? Number(options.opacity) : 0.25;
  const size = options.size !== undefined ? Number(options.size) : 48;
  const angle = options.angle !== undefined ? Number(options.angle) : -45;

  const pages = doc.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    page.drawText(watermarkText, {
      x: width / 4,
      y: height / 2,
      size,
      font,
      color: rgb(0.6, 0.6, 0.6),
      opacity,
      rotate: degrees(angle),
    });
  }

  const finalOut = resolveTargetOutputPath(filePath, 'pdf', outputPath, true);
  await fs.promises.mkdir(path.dirname(finalOut), { recursive: true });
  const outBytes = await doc.save();
  await fs.promises.writeFile(finalOut, outBytes);

  return { outputPath: finalOut, pageCount: pages.length };
}

export async function splitPdf(filePath, outputDir = null) {
  const full = path.resolve(process.cwd(), filePath);
  const pdfBytes = await fs.promises.readFile(full);
  const doc = await PDFDocument.load(pdfBytes);
  const totalPages = doc.getPageCount();

  const baseName = path.basename(filePath, path.extname(filePath));
  const targetDir = outputDir
    ? path.resolve(process.cwd(), outputDir)
    : path.resolve(process.cwd(), `${baseName}_pages`);

  await fs.promises.mkdir(targetDir, { recursive: true });
  const generatedFiles = [];

  for (let i = 0; i < totalPages; i++) {
    const subDoc = await PDFDocument.create();
    const [copied] = await subDoc.copyPages(doc, [i]);
    subDoc.addPage(copied);

    const pad = String(i + 1).padStart(3, '0');
    const outPath = path.join(targetDir, `${baseName}_p${pad}.pdf`);
    const bytes = await subDoc.save();
    await fs.promises.writeFile(outPath, bytes);
    generatedFiles.push(outPath);
  }

  return { outputDir: targetDir, totalPages, files: generatedFiles };
}

export async function extractPdfPages(filePath, pages = [], outputPath = null) {
  const full = path.resolve(process.cwd(), filePath);
  const pdfBytes = await fs.promises.readFile(full);
  const doc = await PDFDocument.load(pdfBytes);
  const totalPages = doc.getPageCount();

  // Convert 1-indexed page numbers to 0-indexed
  const zeroIndices = pages
    .map(p => Number(p) - 1)
    .filter(idx => idx >= 0 && idx < totalPages);

  if (zeroIndices.length === 0) {
    throw new Error(`No valid pages selected. Document has ${totalPages} pages.`);
  }

  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(doc, zeroIndices);
  copied.forEach(p => newDoc.addPage(p));

  const finalOut = resolveTargetOutputPath(filePath, 'pdf', outputPath, true);
  await fs.promises.mkdir(path.dirname(finalOut), { recursive: true });
  const bytes = await newDoc.save();
  await fs.promises.writeFile(finalOut, bytes);

  return { outputPath: finalOut, extractedCount: zeroIndices.length };
}

export async function rotatePdfPages(filePath, pages = [], angle = 90, outputPath = null) {
  const full = path.resolve(process.cwd(), filePath);
  const pdfBytes = await fs.promises.readFile(full);
  const doc = await PDFDocument.load(pdfBytes);
  const totalPages = doc.getPageCount();

  const zeroSet = pages.length > 0 ? new Set(pages.map(p => Number(p) - 1)) : null;

  for (let i = 0; i < totalPages; i++) {
    if (!zeroSet || zeroSet.has(i)) {
      const page = doc.getPage(i);
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees(currentRotation + Number(angle)));
    }
  }

  const finalOut = resolveTargetOutputPath(filePath, 'pdf', outputPath, true);
  await fs.promises.mkdir(path.dirname(finalOut), { recursive: true });
  const bytes = await doc.save();
  await fs.promises.writeFile(finalOut, bytes);

  return { outputPath: finalOut, rotatedAngle: angle };
}

export async function appendBlankPages(filePath, count = 1, outputPath = null) {
  const full = path.resolve(process.cwd(), filePath);
  const pdfBytes = await fs.promises.readFile(full);
  const doc = await PDFDocument.load(pdfBytes);

  const firstPage = doc.getPage(0);
  const { width, height } = firstPage.getSize();

  for (let i = 0; i < Number(count); i++) {
    doc.addPage([width, height]);
  }

  const finalOut = resolveTargetOutputPath(filePath, 'pdf', outputPath, true);
  await fs.promises.mkdir(path.dirname(finalOut), { recursive: true });
  const bytes = await doc.save();
  await fs.promises.writeFile(finalOut, bytes);

  return { outputPath: finalOut, totalPages: doc.getPageCount() };
}

export async function setPdfMetadata(filePath, metadata = {}, outputPath = null) {
  const full = path.resolve(process.cwd(), filePath);
  const pdfBytes = await fs.promises.readFile(full);
  const doc = await PDFDocument.load(pdfBytes);

  if (metadata.title) doc.setTitle(metadata.title);
  if (metadata.author) doc.setAuthor(metadata.author);
  if (metadata.subject) doc.setSubject(metadata.subject);
  if (metadata.keywords) doc.setKeywords(Array.isArray(metadata.keywords) ? metadata.keywords : [metadata.keywords]);
  if (metadata.creator) doc.setCreator(metadata.creator);

  const finalOut = resolveTargetOutputPath(filePath, 'pdf', outputPath, true);
  await fs.promises.mkdir(path.dirname(finalOut), { recursive: true });
  const bytes = await doc.save();
  await fs.promises.writeFile(finalOut, bytes);

  return { outputPath: finalOut, metadata };
}

/**
 * Convert PDF pages to high-resolution images (PNG / JPG / JPEG).
 * Defaults output directory to `<filename>_images` in current working directory.
 */
export async function pdfToImages(filePath, {
  outputDir = null,
  format = 'png',
  scale = 2.0,
  pages = [],
  password = undefined
} = {}) {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`PDF file not found: "${filePath}"`);
  }

  const { pdf } = await import('pdf-to-img');

  const normFormat = (format && format.toLowerCase() === 'jpg')
    ? 'jpg'
    : (format && format.toLowerCase() === 'jpeg')
      ? 'jpeg'
      : 'png';

  const imgDoc = await pdf(fullPath, {
    scale: Number(scale) || 2.0,
    format: normFormat,
    ...(password ? { password } : {})
  });

  const baseName = path.basename(filePath, path.extname(filePath));
  const targetDir = outputDir
    ? path.resolve(process.cwd(), outputDir)
    : path.resolve(process.cwd(), `${baseName}_images`);

  await fs.promises.mkdir(targetDir, { recursive: true });

  const pageSet = Array.isArray(pages) && pages.length > 0 ? new Set(pages.map(Number)) : null;
  const exportedImages = [];
  let pageIndex = 1;

  for await (const imgBuffer of imgDoc) {
    if (!pageSet || pageSet.has(pageIndex)) {
      const pad = String(pageIndex).padStart(3, '0');
      const ext = normFormat === 'jpeg' ? 'jpeg' : normFormat;
      const fileName = `${baseName}_p${pad}.${ext}`;
      const outPath = path.join(targetDir, fileName);
      await fs.promises.writeFile(outPath, imgBuffer);
      exportedImages.push({
        page: pageIndex,
        fileName,
        filePath: outPath,
        sizeBytes: imgBuffer.length
      });
    }
    pageIndex++;
  }

  if (typeof imgDoc.destroy === 'function') {
    try {
      await imgDoc.destroy();
    } catch {}
  }

  return {
    success: true,
    sourcePath: fullPath,
    outputDir: targetDir,
    format: normFormat,
    scale: Number(scale) || 2.0,
    totalPages: pageIndex - 1,
    exportedPagesCount: exportedImages.length,
    images: exportedImages
  };
}


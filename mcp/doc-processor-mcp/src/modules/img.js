import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import PDFKit from 'pdfkit';
import { resolveTargetOutputPath } from '../utils.js';

export async function getImageInfo(filePath) {
  const fullPath = path.resolve(process.cwd(), filePath);
  const meta = await sharp(fullPath).metadata();
  const stat = await fs.promises.stat(fullPath);

  return {
    filePath: fullPath,
    format: meta.format,
    width: meta.width,
    height: meta.height,
    channels: meta.channels,
    space: meta.space,
    hasAlpha: meta.hasAlpha,
    density: meta.density,
    sizeBytes: stat.size,
  };
}

export async function processImage(filePath, operations = {}, outputPath = null) {
  const fullPath = path.resolve(process.cwd(), filePath);
  let pipeline = sharp(fullPath);

  // 1. Resize
  if (operations.resize) {
    const { width, height, fit = 'cover', withoutEnlargement = false } = operations.resize;
    pipeline = pipeline.resize({
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      fit,
      withoutEnlargement,
    });
  }

  // 2. Crop
  if (operations.crop) {
    const { left, top, width, height } = operations.crop;
    pipeline = pipeline.extract({
      left: Number(left),
      top: Number(top),
      width: Number(width),
      height: Number(height),
    });
  }

  // 3. Rotate / Flip
  if (operations.rotate !== undefined) {
    pipeline = pipeline.rotate(Number(operations.rotate));
  }
  if (operations.flip) {
    pipeline = pipeline.flip(); // vertical
  }
  if (operations.flop) {
    pipeline = pipeline.flop(); // horizontal
  }

  // 4. Color / Filters
  if (operations.grayscale) {
    pipeline = pipeline.grayscale();
  }
  if (operations.blur) {
    pipeline = pipeline.blur(Number(operations.blur));
  }
  if (operations.sharpen) {
    pipeline = pipeline.sharpen();
  }

  // 5. Padding
  if (operations.pad) {
    const { top = 0, bottom = 0, left = 0, right = 0, background = { r: 255, g: 255, b: 255, alpha: 1 } } = operations.pad;
    pipeline = pipeline.extend({
      top: Number(top),
      bottom: Number(bottom),
      left: Number(left),
      right: Number(right),
      background,
    });
  }

  // 6. Format & Quality
  let targetExt = path.extname(fullPath).slice(1) || 'png';
  if (operations.format) {
    targetExt = operations.format.toLowerCase();
    const quality = operations.quality ? Number(operations.quality) : 80;
    if (targetExt === 'jpeg' || targetExt === 'jpg') {
      pipeline = pipeline.jpeg({ quality });
    } else if (targetExt === 'png') {
      pipeline = pipeline.png({ compressionLevel: 9 });
    } else if (targetExt === 'webp') {
      pipeline = pipeline.webp({ quality });
    } else if (targetExt === 'avif') {
      pipeline = pipeline.avif({ quality });
    }
  }

  const finalOut = resolveTargetOutputPath(filePath, targetExt, outputPath, operations.overwrite === true);
  await fs.promises.mkdir(path.dirname(finalOut), { recursive: true });
  await pipeline.toFile(finalOut);

  const outMeta = await sharp(finalOut).metadata();
  const outStat = await fs.promises.stat(finalOut);

  return {
    outputPath: finalOut,
    format: outMeta.format,
    width: outMeta.width,
    height: outMeta.height,
    sizeBytes: outStat.size,
  };
}

export async function overlayImage(baseImagePath, watermarkPath, outputPath = null, options = {}) {
  const fullBase = path.resolve(process.cwd(), baseImagePath);
  const fullWatermark = path.resolve(process.cwd(), watermarkPath);

  const gravity = options.gravity || 'southeast';
  const top = options.top !== undefined ? Number(options.top) : undefined;
  const left = options.left !== undefined ? Number(options.left) : undefined;

  const overlayOptions = { input: fullWatermark };
  if (top !== undefined && left !== undefined) {
    overlayOptions.top = top;
    overlayOptions.left = left;
  } else {
    overlayOptions.gravity = gravity;
  }

  const pipeline = sharp(fullBase).composite([overlayOptions]);
  const ext = path.extname(fullBase).slice(1) || 'png';
  const finalOut = resolveTargetOutputPath(baseImagePath, ext, outputPath, options.overwrite === true);

  await fs.promises.mkdir(path.dirname(finalOut), { recursive: true });
  await pipeline.toFile(finalOut);

  return { outputPath: finalOut };
}

export async function imagesToPdf(imagePaths = [], outputPath = null, options = {}) {
  if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
    throw new Error('At least one image path is required.');
  }

  const finalOut = resolveTargetOutputPath('images.pdf', 'pdf', outputPath, options.overwrite === true);
  await fs.promises.mkdir(path.dirname(finalOut), { recursive: true });

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFKit({
        autoFirstPage: false,
      });

      const writeStream = fs.createWriteStream(finalOut);
      doc.pipe(writeStream);

      for (const img of imagePaths) {
        const fullImg = path.resolve(process.cwd(), img);
        const meta = await sharp(fullImg).metadata();
        const width = options.pageWidth || meta.width;
        const height = options.pageHeight || meta.height;

        // Convert any image format to PNG buffer for guaranteed PDFKit compatibility
        const pngBuffer = await sharp(fullImg).png().toBuffer();

        doc.addPage({ size: [width, height], margin: 0 });
        doc.image(pngBuffer, 0, 0, { width, height });
      }

      doc.end();
      writeStream.on('finish', () => resolve({ outputPath: finalOut, pageCount: imagePaths.length }));
      writeStream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

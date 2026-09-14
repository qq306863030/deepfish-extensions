import fs from 'node:fs';
import path from 'node:path';
import pdfParse from 'pdf-parse';
import PDFKit from 'pdfkit';

function getAvailableFont() {
  const candidates = [
    'C:/Windows/Fonts/simhei.ttf',
    'C:/Windows/Fonts/msyh.ttc',
    'C:/Windows/Fonts/simsun.ttc',
    '/System/Library/Fonts/PingFang.ttc',
    '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {}
  }
  return null;
}

/**
 * Extract text and structure from PDF into Markdown
 */
export async function pdfToMd(inputPath, outputPath, options = {}) {
  const dataBuffer = await fs.promises.readFile(inputPath);
  const data = await pdfParse(dataBuffer);

  const lines = data.text.split(/\r?\n/);
  const mdLines = [`# ${path.basename(inputPath, path.extname(inputPath))}\n`];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      mdLines.push('');
      continue;
    }
    if (trimmed.length < 50 && /^[第0-9一二三四五六七八九十]+[章节部分篇、.\s]/.test(trimmed)) {
      mdLines.push(`## ${trimmed}\n`);
    } else {
      mdLines.push(trimmed);
    }
  }

  const result = mdLines.join('\n');
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, result, 'utf8');

  return {
    outputPath,
    pageCount: data.numpages,
    charCount: data.text.length
  };
}

/**
 * Convert Markdown text to PDF using PDFKit
 */
export async function mdToPdf(inputPath, outputPath, options = {}) {
  const md = await fs.promises.readFile(inputPath, 'utf8');
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

  const fontPath = getAvailableFont();

  return new Promise((resolve, reject) => {
    const doc = new PDFKit({
      size: 'A4',
      margin: 50
    });

    if (fontPath) {
      try {
        doc.font(fontPath);
      } catch {}
    }

    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    const lines = md.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        doc.moveDown(0.5);
        continue;
      }

      if (trimmed.startsWith('# ')) {
        doc.fontSize(22).fillColor('#1F2937').text(trimmed.replace(/^#\s+/, ''), { paragraphGap: 10 });
      } else if (trimmed.startsWith('## ')) {
        doc.fontSize(16).fillColor('#374151').text(trimmed.replace(/^##\s+/, ''), { paragraphGap: 8 });
      } else if (trimmed.startsWith('### ')) {
        doc.fontSize(13).fillColor('#4B5563').text(trimmed.replace(/^###\s+/, ''), { paragraphGap: 6 });
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        doc.fontSize(10).fillColor('#1F2937').text(`•  ${trimmed.slice(2)}`, { indent: 15, paragraphGap: 4 });
      } else {
        doc.fontSize(10).fillColor('#1F2937').text(trimmed, { paragraphGap: 6, lineGap: 3 });
      }
    }

    doc.end();

    writeStream.on('finish', () => resolve({ outputPath }));
    writeStream.on('error', reject);
  });
}

import fs from 'node:fs';
import path from 'node:path';
import PptxGenJS from 'pptxgenjs';
import AdmZip from 'adm-zip';

export function splitMarkdownIntoSlides(md, splitByHeading = true) {
  const slides = [];
  // Split by horizontal rules first
  const sections = md.split(/\n[-*_]{3,}\n/);

  for (const sec of sections) {
    const trimmed = sec.trim();
    if (!trimmed) continue;

    if (splitByHeading && trimmed.includes('\n## ')) {
      const subParts = trimmed.split(/\n(?=## )/);
      for (const sub of subParts) {
        if (sub.trim()) parseSingleSlide(sub.trim(), slides);
      }
    } else {
      parseSingleSlide(trimmed, slides);
    }
  }

  return slides;
}

function parseSingleSlide(content, slides) {
  const lines = content.split(/\r?\n/);
  let title = '';
  const bulletPoints = [];
  const paragraphs = [];

  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;

    if (!title && /^#{1,3}\s+(.+)$/.test(l)) {
      title = l.replace(/^#{1,3}\s+/, '').trim();
    } else if (/^[-*+]\s+(.+)$/.test(l)) {
      bulletPoints.push(l.replace(/^[-*+]\s+/, '').trim());
    } else if (!/^#{1,6}\s+/.test(l)) {
      paragraphs.push(l);
    }
  }

  // Auto-pagination: max 7 bullets per slide to avoid visual overflow
  const MAX_BULLETS = 7;
  if (bulletPoints.length > MAX_BULLETS) {
    const chunkCount = Math.ceil(bulletPoints.length / MAX_BULLETS);
    for (let c = 0; c < chunkCount; c++) {
      const chunk = bulletPoints.slice(c * MAX_BULLETS, (c + 1) * MAX_BULLETS);
      slides.push({
        title: title ? `${title} (${c + 1}/${chunkCount})` : `Slide (${c + 1}/${chunkCount})`,
        bulletPoints: chunk,
        paragraphs: c === 0 ? paragraphs : []
      });
    }
  } else {
    slides.push({
      title: title || 'Slide',
      bulletPoints,
      paragraphs
    });
  }
}

export async function mdToPptx(inputPath, outputPath, options = {}) {
  const md = await fs.promises.readFile(inputPath, 'utf8');
  const slides = splitMarkdownIntoSlides(md, options.splitByHeading !== false);

  if (slides.length === 0) {
    slides.push({ title: path.basename(inputPath, path.extname(inputPath)), bulletPoints: [], paragraphs: [] });
  }

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 16:9

  for (const s of slides) {
    const slide = pptx.addSlide();
    
    // Add title
    if (s.title) {
      slide.addText(s.title, {
        x: 0.8,
        y: 0.6,
        w: '88%',
        h: 1.0,
        fontSize: 26,
        bold: true,
        color: '1F2937'
      });
    }

    // Add bullet points
    if (s.bulletPoints.length > 0) {
      const textItems = s.bulletPoints.map(bp => ({
        text: bp,
        options: {
          bullet: true,
          fontSize: 16,
          color: '4B5563',
          breakLine: true
        }
      }));
      slide.addText(textItems, {
        x: 1.0,
        y: 1.8,
        w: '84%',
        h: 4.5,
        lineSpacing: 28
      });
    } else if (s.paragraphs.length > 0) {
      slide.addText(s.paragraphs.join('\n\n'), {
        x: 1.0,
        y: 1.8,
        w: '84%',
        h: 4.5,
        fontSize: 16,
        color: '4B5563',
        lineSpacing: 28
      });
    }
  }

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await pptx.writeFile({ fileName: outputPath });

  return { outputPath, slidesCount: slides.length };
}

export async function pptxToMd(inputPath, outputPath, options = {}) {
  const zip = new AdmZip(inputPath);
  const entries = zip.getEntries();
  const slideEntries = entries
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a, b) => {
      const numA = parseInt(a.entryName.match(/\d+/)[0], 10);
      const numB = parseInt(b.entryName.match(/\d+/)[0], 10);
      return numA - numB;
    });

  const mdParts = [];

  slideEntries.forEach((entry, idx) => {
    const xml = entry.getData().toString('utf8');
    const texts = [];
    const regex = /<a:t>([\s\S]*?)<\/a:t>/g;
    let m;
    while ((m = regex.exec(xml)) !== null) {
      const t = m[1].trim();
      if (t) texts.push(t);
    }

    mdParts.push(`## 幻灯片 ${idx + 1}`);
    if (texts.length > 0) {
      // First text as heading if short, rest as points
      texts.forEach(t => mdParts.push(`- ${t}`));
    }
    mdParts.push('');
  });

  const result = mdParts.join('\n');
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, result, 'utf8');

  return { outputPath, slideCount: slideEntries.length };
}

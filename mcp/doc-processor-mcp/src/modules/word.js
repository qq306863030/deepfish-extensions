import fs from 'node:fs';
import path from 'node:path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import mammoth from 'mammoth';
import * as docx from 'docx';
import { resolveTargetOutputPath } from '../utils.js';

const { Document, Paragraph, TextRun, Packer } = docx;

export async function readWordText(filePath) {
  const fullPath = path.resolve(process.cwd(), filePath);
  const result = await mammoth.extractRawText({ path: fullPath });
  const text = result.value;
  return {
    filePath: fullPath,
    text,
    charCount: text.length,
    wordCount: text.trim().split(/\s+/).filter(Boolean).length,
  };
}

export async function fillWordTemplate(templatePath, outputPath = null, data = {}) {
  const fullTemplate = path.resolve(process.cwd(), templatePath);
  const content = fs.readFileSync(fullTemplate, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render(data);
  const buf = doc.getZip().generate({ type: 'nodebuffer' });

  const finalOut = resolveTargetOutputPath(templatePath, 'docx', outputPath, true);
  await fs.promises.mkdir(path.dirname(finalOut), { recursive: true });
  await fs.promises.writeFile(finalOut, buf);

  return { outputPath: finalOut };
}

export async function patchWordText(filePath, replacements = [], outputPath = null) {
  const fullPath = path.resolve(process.cwd(), filePath);
  const content = fs.readFileSync(fullPath, 'binary');
  const zip = new PizZip(content);

  let xml = zip.file('word/document.xml')?.asText();
  if (!xml) throw new Error('Invalid docx: word/document.xml not found');

  let totalReplacements = 0;
  for (const { search, replace } of replacements) {
    if (!search) continue;
    const count = (xml.split(search).length - 1);
    xml = xml.replaceAll(search, replace || '');
    totalReplacements += count;
  }

  zip.file('word/document.xml', xml);
  const buf = zip.generate({ type: 'nodebuffer' });

  const finalOut = resolveTargetOutputPath(filePath, 'docx', outputPath, true);
  await fs.promises.mkdir(path.dirname(finalOut), { recursive: true });
  await fs.promises.writeFile(finalOut, buf);

  return { outputPath: finalOut, totalReplacements };
}

export async function extractWordLinks(filePath) {
  const fullPath = path.resolve(process.cwd(), filePath);
  const content = fs.readFileSync(fullPath, 'binary');
  const zip = new PizZip(content);

  const relsXml = zip.file('word/_rels/document.xml.rels')?.asText();
  const links = [];
  if (relsXml) {
    const regex = /Type="http:\/\/schemas\.openxmlformats\.org\/officeDocument\/2006\/relationships\/hyperlink"\s+Target="([^"]+)"/g;
    let match;
    while ((match = regex.exec(relsXml)) !== null) {
      links.push(match[1]);
    }
  }

  return { filePath: fullPath, count: links.length, links };
}

export async function getWordParagraphStats(filePath) {
  const fullPath = path.resolve(process.cwd(), filePath);
  const result = await mammoth.extractRawText({ path: fullPath });
  const paragraphs = result.value.split(/\n\n+/).filter(p => p.trim());

  return {
    filePath: fullPath,
    totalParagraphs: paragraphs.length,
    sampleParagraphs: paragraphs.slice(0, 10).map((p, i) => ({
      index: i + 1,
      charCount: p.length,
      snippet: p.slice(0, 80)
    }))
  };
}

export async function appendWordParagraphs(filePath, paragraphs = [], outputPath = null) {
  const fullPath = path.resolve(process.cwd(), filePath);
  const original = await mammoth.extractRawText({ path: fullPath });

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ children: [new TextRun(original.value)] }),
        ...paragraphs.map(p => new Paragraph({ children: [new TextRun(p)] }))
      ]
    }]
  });

  const finalOut = resolveTargetOutputPath(filePath, 'docx', outputPath, true);
  await fs.promises.mkdir(path.dirname(finalOut), { recursive: true });
  const buffer = await Packer.toBuffer(doc);
  await fs.promises.writeFile(finalOut, buffer);

  return { outputPath: finalOut, appendedCount: paragraphs.length };
}

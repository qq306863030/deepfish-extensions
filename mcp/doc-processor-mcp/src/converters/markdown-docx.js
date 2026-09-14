import fs from 'node:fs';
import path from 'node:path';
import mammoth from 'mammoth';
import * as docx from 'docx';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Packer,
} = docx;

/**
 * Convert Markdown to Word Document (.docx)
 */
export async function mdToDocx(inputPath, outputPath, options = {}) {
  const md = await fs.promises.readFile(inputPath, 'utf8');
  const lines = md.split(/\r?\n/);
  const children = [];

  let inCodeBlock = false;
  let codeBuffer = [];
  let tableRows = [];

  function flushTable() {
    if (tableRows.length === 0) return;
    const docxRows = tableRows.map((row, rIdx) => {
      const isHeader = rIdx === 0;
      return new TableRow({
        children: row.map(cellText => new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: cellText, bold: isHeader })]
          })],
          shading: isHeader ? { fill: 'F3F4F6' } : undefined
        }))
      });
    });

    children.push(new Table({
      rows: docxRows,
      width: { size: 100, type: WidthType.PERCENTAGE }
    }));
    children.push(new Paragraph({ text: '' })); // Spacing
    tableRows = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        children.push(new Paragraph({
          children: [new TextRun({
            text: codeBuffer.join('\n'),
            font: 'Consolas',
            size: 20
          })],
          spacing: { before: 120, after: 120 }
        }));
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        flushTable();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Markdown Table
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.slice(1, -1).split('|').map(c => c.trim());
      // Check divider
      const isDivider = cells.every(c => /^:?-+:?$/.test(c));
      if (!isDivider) {
        tableRows.push(cells);
      }
      continue;
    } else {
      flushTable();
    }

    if (!trimmed) {
      continue;
    }

    // Headings
    if (/^#\s+(.+)$/.test(trimmed)) {
      children.push(new Paragraph({
        text: trimmed.replace(/^#\s+/, ''),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 }
      }));
    } else if (/^##\s+(.+)$/.test(trimmed)) {
      children.push(new Paragraph({
        text: trimmed.replace(/^##\s+/, ''),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      }));
    } else if (/^###\s+(.+)$/.test(trimmed)) {
      children.push(new Paragraph({
        text: trimmed.replace(/^###\s+/, ''),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 160, after: 80 }
      }));
    } else if (/^[-*+]\s+(.+)$/.test(trimmed)) {
      // Bullet list item
      children.push(new Paragraph({
        text: trimmed.replace(/^[-*+]\s+/, ''),
        bullet: { level: 0 }
      }));
    } else {
      // Normal paragraph
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed, size: 22 })],
        spacing: { after: 120 }
      }));
    }
  }

  flushTable();

  const doc = new Document({
    sections: [{
      properties: {},
      children
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, buffer);

  return { outputPath };
}

/**
 * Convert Word Document (.docx) to Markdown
 */
export async function docxToMd(inputPath, outputPath, options = {}) {
  const result = await mammoth.convertToHtml({ path: inputPath });
  const html = result.value;

  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  });
  turndownService.use(gfm);

  const markdown = turndownService.turndown(html);
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, markdown, 'utf8');

  return { outputPath, messages: result.messages };
}

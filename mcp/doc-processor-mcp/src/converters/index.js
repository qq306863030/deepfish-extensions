import fs from 'node:fs';
import path from 'node:path';
import { resolveTargetOutputPath } from '../utils.js';
import { mdToHtml, htmlToMd } from './markdown-html.js';
import { mdToDocx, docxToMd } from './markdown-docx.js';
import { mdToXlsx, xlsxToMd } from './markdown-xlsx.js';
import { mdToPptx, pptxToMd } from './markdown-pptx.js';
import { mdToPdf, pdfToMd } from './markdown-pdf.js';

const ROUTES = {
  'md->html': mdToHtml,
  'html->md': htmlToMd,
  'md->docx': mdToDocx,
  'docx->md': docxToMd,
  'md->xlsx': mdToXlsx,
  'xlsx->md': xlsxToMd,
  'csv->md': xlsxToMd,
  'md->pptx': mdToPptx,
  'pptx->md': pptxToMd,
  'md->pdf': mdToPdf,
  'pdf->md': pdfToMd,
};

export async function handleMdConver({ inputPath, targetFormat, outputPath: userOutputPath, options = {} }) {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('inputPath is required.');
  }

  const absInput = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(absInput)) {
    throw new Error(`Input file not found: "${absInput}"`);
  }

  const inputExt = path.extname(absInput).toLowerCase().replace(/^\./, '');
  let finalTargetFormat = targetFormat ? targetFormat.toLowerCase().replace(/^\./, '') : '';

  if (!finalTargetFormat) {
    if (inputExt === 'md') {
      throw new Error("When input file is Markdown (.md), 'targetFormat' is required (e.g. 'docx', 'pdf', 'html', 'xlsx', 'pptx').");
    }
    // Default converting any supported file to Markdown
    finalTargetFormat = 'md';
  }

  const routeKey = `${inputExt}->${finalTargetFormat}`;
  const converter = ROUTES[routeKey];

  if (!converter) {
    const supportedRoutes = Object.keys(ROUTES).join(', ');
    throw new Error(`Unsupported conversion: from ".${inputExt}" to ".${finalTargetFormat}". Supported routes: ${supportedRoutes}`);
  }

  const finalOutputPath = resolveTargetOutputPath(absInput, finalTargetFormat, userOutputPath, options.overwrite === true);

  const startTime = Date.now();
  const conversionResult = await converter(absInput, finalOutputPath, options);
  const durationMs = Date.now() - startTime;

  let outputSize = 0;
  try {
    const stat = await fs.promises.stat(finalOutputPath);
    outputSize = stat.size;
  } catch {}

  return {
    success: true,
    inputPath: absInput,
    outputPath: finalOutputPath,
    fromFormat: inputExt,
    toFormat: finalTargetFormat,
    outputSizeBytes: outputSize,
    durationMs,
    details: conversionResult || {}
  };
}

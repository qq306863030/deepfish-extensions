import path from 'node:path';
import fs from 'node:fs';
import { handleMdConver } from './converters/index.js';
import { readWordText, fillWordTemplate, patchWordText, extractWordLinks, getWordParagraphStats, appendWordParagraphs } from './modules/word.js';
import { getExcelInfo, readExcelSheet, writeExcelData, appendExcelRows, searchExcel, manageExcelSheet, mergeExcelFiles } from './modules/excel.js';
import { getPdfInfo, mergePdfFiles, addPdfWatermarkText, splitPdf, extractPdfPages, rotatePdfPages, appendBlankPages, setPdfMetadata, pdfToImages } from './modules/pdf.js';
import { getPptxInfo, extractPptxImages, createPptxDocument, replacePptxText, imagesToPptx } from './modules/pptx.js';
import { getImageInfo, processImage, overlayImage, imagesToPdf } from './modules/img.js';
import { htmlToImage } from './modules/html.js';

export const TOOLS = [
  // ─── 核心转换中枢 ─────────────────────────────────────────────────────────────
  {
    name: 'md_conver',
    description: 'Convert Markdown (.md) to other formats (docx, pdf, html, xlsx, pptx), or convert any supported document into Markdown. Defaults output to current working directory (process.cwd()).',
    inputSchema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string', description: 'Source file path.' },
        targetFormat: { type: 'string', enum: ['docx', 'pdf', 'html', 'xlsx', 'pptx', 'csv', 'md'], description: 'Target format.' },
        outputPath: { type: 'string', description: 'Optional destination path. Defaults to current directory if omitted.' },
        options: {
          type: 'object',
          properties: {
            overwrite: { type: 'boolean' },
            sheetName: { type: 'string' },
            splitByHeading: { type: 'boolean' }
          }
        }
      },
      required: ['inputPath']
    }
  },

  // ─── 通用探查 ─────────────────────────────────────────────────────────────────
  {
    name: 'doc_inspect',
    description: 'Inspect structure, metadata, sheets, pages, and statistics of Word, Excel, PowerPoint, PDF, or Image files.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the document or image to inspect.' }
      },
      required: ['filePath']
    }
  },

  // ─── 图像处理工具 ─────────────────────────────────────────────────────────────
  {
    name: 'doc_img_process',
    description: 'Process image: resize, crop, rotate, flip, pad, adjust quality/filters, or convert format (jpeg/png/webp/avif). Outputs to current working directory by default.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Source image path.' },
        outputPath: { type: 'string', description: 'Optional destination image path.' },
        operations: {
          type: 'object',
          description: 'Image operations to apply.',
          properties: {
            resize: {
              type: 'object',
              properties: {
                width: { type: 'number' },
                height: { type: 'number' },
                fit: { type: 'string', enum: ['cover', 'contain', 'fill', 'inside', 'outside'] },
                withoutEnlargement: { type: 'boolean' }
              }
            },
            crop: {
              type: 'object',
              properties: {
                left: { type: 'number' },
                top: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' }
              },
              required: ['left', 'top', 'width', 'height']
            },
            rotate: { type: 'number', description: 'Angle in degrees (90, 180, 270, etc.).' },
            flip: { type: 'boolean', description: 'Flip vertically.' },
            flop: { type: 'boolean', description: 'Flop horizontally.' },
            format: { type: 'string', enum: ['jpeg', 'jpg', 'png', 'webp', 'avif'] },
            quality: { type: 'number', minimum: 1, maximum: 100, description: 'Compression quality (1-100).' },
            grayscale: { type: 'boolean' },
            blur: { type: 'number', description: 'Blur radius sigma.' },
            sharpen: { type: 'boolean' },
            pad: {
              type: 'object',
              properties: {
                top: { type: 'number' },
                bottom: { type: 'number' },
                left: { type: 'number' },
                right: { type: 'number' }
              }
            },
            overwrite: { type: 'boolean' }
          }
        }
      },
      required: ['filePath']
    }
  },
  {
    name: 'doc_img_overlay',
    description: 'Composite a watermark/logo image onto a base image.',
    inputSchema: {
      type: 'object',
      properties: {
        baseImagePath: { type: 'string', description: 'Base image path.' },
        watermarkPath: { type: 'string', description: 'Watermark/logo image path.' },
        outputPath: { type: 'string', description: 'Optional destination image path.' },
        options: {
          type: 'object',
          properties: {
            gravity: { type: 'string', enum: ['center', 'southeast', 'southwest', 'northeast', 'northwest'], default: 'southeast' },
            top: { type: 'number' },
            left: { type: 'number' }
          }
        }
      },
      required: ['baseImagePath', 'watermarkPath']
    }
  },
  {
    name: 'doc_img_to_pdf',
    description: 'Combine multiple images in sequence into a single PDF document in current working directory.',
    inputSchema: {
      type: 'object',
      properties: {
        imagePaths: { type: 'array', items: { type: 'string' }, description: 'Array of image file paths.' },
        outputPath: { type: 'string', description: 'Optional destination PDF path (defaults to current directory/images.pdf).' }
      },
      required: ['imagePaths']
    }
  },
  {
    name: 'doc_html_to_image',
    description: 'Render an HTML file or direct HTML string to an image (PNG / JPG) using system headless Chrome/Edge. Supports full-page scroll screenshot, custom viewport width/height, delay for dynamic content, and CSS selector.',
    inputSchema: {
      type: 'object',
      properties: {
        htmlPath: { type: 'string', description: 'Path to local HTML file.' },
        htmlContent: { type: 'string', description: 'Direct HTML string content to render.' },
        outputPath: { type: 'string', description: 'Optional destination image path. Defaults to `<htmlName>.png` or `render.png` in current working directory.' },
        fullPage: { type: 'boolean', default: true, description: 'Whether to take a full-page screenshot. Default is true.' },
        width: { type: 'number', default: 1280, description: 'Viewport width in pixels. Default is 1280.' },
        height: { type: 'number', default: 800, description: 'Viewport height in pixels. Default is 800.' },
        format: { type: 'string', enum: ['png', 'jpg', 'jpeg'], default: 'png', description: 'Output image format. Default is "png".' },
        quality: { type: 'number', minimum: 1, maximum: 100, default: 90, description: 'Quality (1-100) for jpg/jpeg format.' },
        delayMs: { type: 'number', default: 0, description: 'Wait time in milliseconds before taking screenshot (for charts/fonts/animations).' },
        selector: { type: 'string', description: 'Optional CSS selector to capture only a specific element (e.g. "#main-card" or ".report").' },
        deviceScaleFactor: { type: 'number', default: 2, description: 'Device pixel ratio (1 = standard, 2 = retina high-DPI). Default is 2.' },
        browserExecutablePath: { type: 'string', description: 'Optional custom path to Chrome or Edge executable.' }
      }
    }
  },

  // ─── Word 文档工具 ────────────────────────────────────────────────────────────
  {
    name: 'doc_word_patch_text',
    description: 'Smart text replacement in Word (.docx) documents preserving original fonts, styles, and XML formatting.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to .docx file.' },
        replacements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              search: { type: 'string' },
              replace: { type: 'string' }
            },
            required: ['search', 'replace']
          }
        },
        outputPath: { type: 'string' }
      },
      required: ['filePath', 'replacements']
    }
  },
  {
    name: 'doc_word_fill_template',
    description: 'Fill a Word (.docx) template using mustache variables with provided data object.',
    inputSchema: {
      type: 'object',
      properties: {
        templatePath: { type: 'string' },
        outputPath: { type: 'string' },
        data: { type: 'object' }
      },
      required: ['templatePath', 'outputPath', 'data']
    }
  },
  {
    name: 'doc_word_append',
    description: 'Append text paragraphs to the end of an existing Word (.docx) document.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to .docx file.' },
        paragraphs: { type: 'array', items: { type: 'string' }, description: 'List of paragraph text strings.' },
        outputPath: { type: 'string' }
      },
      required: ['filePath', 'paragraphs']
    }
  },
  {
    name: 'doc_word_extract_links',
    description: 'Extract all hyperlinks from a Word (.docx) document.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' }
      },
      required: ['filePath']
    }
  },

  // ─── Excel 表格工具 ───────────────────────────────────────────────────────────
  {
    name: 'doc_excel_read',
    description: 'Read an Excel (.xlsx) worksheet as JSON array of objects or 2D matrix.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        sheetName: { type: 'string' },
        raw: { type: 'boolean' }
      },
      required: ['filePath']
    }
  },
  {
    name: 'doc_excel_write',
    description: 'Write JSON array or 2D array into a new Excel (.xlsx) file in current directory.',
    inputSchema: {
      type: 'object',
      properties: {
        data: { type: 'array' },
        outputPath: { type: 'string' },
        sheetName: { type: 'string', default: 'Sheet1' }
      },
      required: ['data']
    }
  },
  {
    name: 'doc_excel_append_rows',
    description: 'Append multiple data rows into an existing Excel worksheet without rewriting the file.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        rows: { type: 'array', items: { type: 'array' }, description: '2D array of row values.' },
        sheetName: { type: 'string' },
        outputPath: { type: 'string' }
      },
      required: ['filePath', 'rows']
    }
  },
  {
    name: 'doc_excel_search',
    description: 'Search for keywords across all sheets in an Excel workbook and return cell coordinates and row data.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        query: { type: 'string' }
      },
      required: ['filePath', 'query']
    }
  },
  {
    name: 'doc_excel_manage_sheet',
    description: 'Delete or rename a worksheet inside an Excel (.xlsx) workbook.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        action: { type: 'string', enum: ['delete', 'rename'] },
        sheetName: { type: 'string' },
        newName: { type: 'string' },
        outputPath: { type: 'string' }
      },
      required: ['filePath', 'action', 'sheetName']
    }
  },
  {
    name: 'doc_excel_merge',
    description: 'Merge all sheets from multiple Excel workbooks into a single workbook in current working directory.',
    inputSchema: {
      type: 'object',
      properties: {
        inputPaths: { type: 'array', items: { type: 'string' } },
        outputPath: { type: 'string' }
      },
      required: ['inputPaths']
    }
  },

  // ─── PDF 文件工具 ─────────────────────────────────────────────────────────────
  {
    name: 'doc_pdf_watermark',
    description: 'Add text watermark diagonally across all pages of a PDF document.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        watermarkText: { type: 'string' },
        outputPath: { type: 'string' },
        options: {
          type: 'object',
          properties: {
            opacity: { type: 'number', default: 0.25 },
            size: { type: 'number', default: 48 },
            angle: { type: 'number', default: -45 }
          }
        }
      },
      required: ['filePath', 'watermarkText']
    }
  },
  {
    name: 'doc_pdf_merge',
    description: 'Merge multiple PDF files in order into a single PDF in current working directory.',
    inputSchema: {
      type: 'object',
      properties: {
        inputPaths: { type: 'array', items: { type: 'string' } },
        outputPath: { type: 'string' }
      },
      required: ['inputPaths']
    }
  },
  {
    name: 'doc_pdf_split',
    description: 'Split a PDF into separate individual single-page PDF files.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        outputDir: { type: 'string' }
      },
      required: ['filePath']
    }
  },
  {
    name: 'doc_pdf_extract_pages',
    description: 'Extract specific page numbers (1-indexed) from a PDF into a new PDF document.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        pages: { type: 'array', items: { type: 'number' }, description: 'Array of page numbers to extract (e.g. [1, 3, 5]).' },
        outputPath: { type: 'string' }
      },
      required: ['filePath', 'pages']
    }
  },
  {
    name: 'doc_pdf_rotate_pages',
    description: 'Rotate all or specified pages in a PDF document by 90, 180, or 270 degrees.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        pages: { type: 'array', items: { type: 'number' }, description: 'Optional list of pages to rotate. Rotates all if omitted.' },
        angle: { type: 'number', enum: [90, 180, 270], default: 90 },
        outputPath: { type: 'string' }
      },
      required: ['filePath']
    }
  },
  {
    name: 'doc_pdf_set_metadata',
    description: 'Update metadata (title, author, subject, keywords, creator) in a PDF file.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        metadata: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            author: { type: 'string' },
            subject: { type: 'string' },
            keywords: { type: 'array', items: { type: 'string' } },
            creator: { type: 'string' }
          }
        },
        outputPath: { type: 'string' }
      },
      required: ['filePath', 'metadata']
    }
  },
  {
    name: 'doc_pdf_to_images',
    description: 'Convert PDF pages into high-resolution images (PNG / JPG / JPEG). Supports scale/DPI setting and selective page ranges. Defaults output to `<filename>_images` directory.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the source PDF file.' },
        outputDir: { type: 'string', description: 'Optional directory path to store extracted images. Defaults to `<filename>_images` in current working directory.' },
        format: { type: 'string', enum: ['png', 'jpg', 'jpeg'], default: 'png', description: 'Output image format. Default is "png".' },
        scale: { type: 'number', default: 2.0, description: 'Image resolution scale factor (e.g. 1.0 = ~72 DPI, 2.0 = ~144 DPI, 3.0 = ~216 DPI). Default is 2.0.' },
        pages: { type: 'array', items: { type: 'number' }, description: 'Optional array of page numbers to export (1-indexed, e.g. [1, 2, 5]). If omitted, exports all pages.' },
        password: { type: 'string', description: 'Password for encrypted PDFs.' }
      },
      required: ['filePath']
    }
  },

  // ─── PowerPoint 演示文稿工具 ──────────────────────────────────────────────────
  {
    name: 'doc_pptx_create',
    description: 'Create a custom presentation (.pptx) with structured slides containing titles and bullet points.',
    inputSchema: {
      type: 'object',
      properties: {
        slides: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              bulletPoints: { type: 'array', items: { type: 'string' } },
              content: { type: 'string' }
            }
          }
        },
        outputPath: { type: 'string' },
        options: { type: 'object', properties: { layout: { type: 'string', default: 'LAYOUT_WIDE' } } }
      },
      required: ['slides']
    }
  },
  {
    name: 'doc_pptx_replace_text',
    description: 'Search and replace text across all slides in a PowerPoint (.pptx) file.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        searchText: { type: 'string' },
        replaceText: { type: 'string' },
        outputPath: { type: 'string' }
      },
      required: ['filePath', 'searchText', 'replaceText']
    }
  },
  {
    name: 'doc_pptx_extract_images',
    description: 'Extract all embedded image assets from a PowerPoint (.pptx) presentation into a directory.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        outputDir: { type: 'string' }
      },
      required: ['filePath']
    }
  },
  {
    name: 'doc_images_to_pptx',
    description: 'Convert multiple image files into a PowerPoint (.pptx) presentation in current working directory. Each image is placed on an individual slide.',
    inputSchema: {
      type: 'object',
      properties: {
        imagePaths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of image file paths (PNG, JPG, WebP, etc.) in presentation order.'
        },
        outputPath: { type: 'string', description: 'Optional destination .pptx path. Defaults to `images_presentation.pptx` in current working directory.' },
        options: {
          type: 'object',
          properties: {
            layout: { type: 'string', enum: ['LAYOUT_WIDE', 'LAYOUT_4x3'], default: 'LAYOUT_WIDE', description: 'Presentation aspect ratio (16:9 or 4:3).' },
            sizing: { type: 'string', enum: ['contain', 'cover', 'full'], default: 'contain', description: 'Image sizing inside slide.' },
            backgroundColor: { type: 'string', default: 'FFFFFF', description: 'Hex background color without "#" (e.g. "FFFFFF" or "000000").' },
            titles: { type: 'array', items: { type: 'string' }, description: 'Optional slide titles for each image.' },
            titleColor: { type: 'string', description: 'Hex color for slide titles.' }
          }
        }
      },
      required: ['imagePaths']
    }
  }
];

export async function handleToolCall(name, args = {}) {
  switch (name) {
    case 'md_conver':
      return { content: [{ type: 'text', text: JSON.stringify(await handleMdConver(args), null, 2) }] };

    case 'doc_inspect': {
      const fullPath = path.resolve(process.cwd(), args.filePath);
      const stat = await fs.promises.stat(fullPath);
      const ext = path.extname(args.filePath).toLowerCase();
      let res;
      if (['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'].includes(ext)) res = await getImageInfo(args.filePath);
      else if (ext === '.xlsx' || ext === '.xls') res = await getExcelInfo(args.filePath);
      else if (ext === '.pdf') res = await getPdfInfo(args.filePath);
      else if (ext === '.docx') res = await readWordText(args.filePath);
      else if (ext === '.pptx') res = await getPptxInfo(args.filePath);
      else res = { filePath: args.filePath };

      return { content: [{ type: 'text', text: JSON.stringify({ ...res, sizeBytes: stat.size }, null, 2) }] };
    }

    // Image
    case 'doc_img_process':
      return { content: [{ type: 'text', text: JSON.stringify(await processImage(args.filePath, args.operations, args.outputPath), null, 2) }] };
    case 'doc_img_overlay':
      return { content: [{ type: 'text', text: JSON.stringify(await overlayImage(args.baseImagePath, args.watermarkPath, args.outputPath, args.options), null, 2) }] };
    case 'doc_img_to_pdf':
      return { content: [{ type: 'text', text: JSON.stringify(await imagesToPdf(args.imagePaths, args.outputPath), null, 2) }] };

    // Word
    case 'doc_word_patch_text':
      return { content: [{ type: 'text', text: JSON.stringify(await patchWordText(args.filePath, args.replacements, args.outputPath), null, 2) }] };
    case 'doc_word_fill_template':
      return { content: [{ type: 'text', text: JSON.stringify(await fillWordTemplate(args.templatePath, args.outputPath, args.data), null, 2) }] };
    case 'doc_word_append':
      return { content: [{ type: 'text', text: JSON.stringify(await appendWordParagraphs(args.filePath, args.paragraphs, args.outputPath), null, 2) }] };
    case 'doc_word_extract_links':
      return { content: [{ type: 'text', text: JSON.stringify(await extractWordLinks(args.filePath), null, 2) }] };

    // Excel
    case 'doc_excel_read':
      return { content: [{ type: 'text', text: JSON.stringify(await readExcelSheet(args.filePath, args.sheetName, args.raw), null, 2) }] };
    case 'doc_excel_write':
      return { content: [{ type: 'text', text: JSON.stringify(await writeExcelData(args.data, args.outputPath, args.sheetName), null, 2) }] };
    case 'doc_excel_append_rows':
      return { content: [{ type: 'text', text: JSON.stringify(await appendExcelRows(args.filePath, args.rows, args.sheetName, args.outputPath), null, 2) }] };
    case 'doc_excel_search':
      return { content: [{ type: 'text', text: JSON.stringify(await searchExcel(args.filePath, args.query), null, 2) }] };
    case 'doc_excel_manage_sheet':
      return { content: [{ type: 'text', text: JSON.stringify(await manageExcelSheet(args.filePath, args.action, args.sheetName, args.newName, args.outputPath), null, 2) }] };
    case 'doc_excel_merge':
      return { content: [{ type: 'text', text: JSON.stringify(await mergeExcelFiles(args.inputPaths, args.outputPath), null, 2) }] };

    // PDF
    case 'doc_pdf_watermark':
      return { content: [{ type: 'text', text: JSON.stringify(await addPdfWatermarkText(args.filePath, args.watermarkText, args.outputPath, args.options), null, 2) }] };
    case 'doc_pdf_merge':
      return { content: [{ type: 'text', text: JSON.stringify(await mergePdfFiles(args.inputPaths, args.outputPath), null, 2) }] };
    case 'doc_pdf_split':
      return { content: [{ type: 'text', text: JSON.stringify(await splitPdf(args.filePath, args.outputDir), null, 2) }] };
    case 'doc_pdf_extract_pages':
      return { content: [{ type: 'text', text: JSON.stringify(await extractPdfPages(args.filePath, args.pages, args.outputPath), null, 2) }] };
    case 'doc_pdf_rotate_pages':
      return { content: [{ type: 'text', text: JSON.stringify(await rotatePdfPages(args.filePath, args.pages, args.angle, args.outputPath), null, 2) }] };
    case 'doc_pdf_set_metadata':
      return { content: [{ type: 'text', text: JSON.stringify(await setPdfMetadata(args.filePath, args.metadata, args.outputPath), null, 2) }] };
    case 'doc_pdf_to_images':
      return { content: [{ type: 'text', text: JSON.stringify(await pdfToImages(args.filePath, args), null, 2) }] };

    // PPTX
    case 'doc_pptx_create':
      return { content: [{ type: 'text', text: JSON.stringify(await createPptxDocument(args.slides, args.outputPath, args.options), null, 2) }] };
    case 'doc_images_to_pptx':
      return { content: [{ type: 'text', text: JSON.stringify(await imagesToPptx(args.imagePaths, args.outputPath, args.options), null, 2) }] };
    case 'doc_pptx_replace_text':
      return { content: [{ type: 'text', text: JSON.stringify(await replacePptxText(args.filePath, args.searchText, args.replaceText, args.outputPath), null, 2) }] };
    case 'doc_pptx_extract_images':
      return { content: [{ type: 'text', text: JSON.stringify(await extractPptxImages(args.filePath, args.outputDir), null, 2) }] };

    // HTML
    case 'doc_html_to_image':
      return { content: [{ type: 'text', text: JSON.stringify(await htmlToImage(args), null, 2) }] };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

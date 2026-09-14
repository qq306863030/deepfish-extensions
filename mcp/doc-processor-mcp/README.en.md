# doc-processor-mcp

An all-in-one Model Context Protocol (MCP) server for document conversion (`md_conver`) and office automation across Word (.docx), Excel (.xlsx), PowerPoint (.pptx), PDF (.pdf), HTML, and CSV.

Featuring the **`md_conver`** hub: converts Markdown into any supported office format and parses documents back into clean Markdown. **All conversions default to output in the current working directory (`process.cwd()`)**.

---

## ✨ Features

1. **Unified Converter Hub `md_conver`**:
   - **Markdown $\rightarrow$ All**: Markdown to Word (`.docx`), PDF (`.pdf`), HTML (`.html`), Excel (`.xlsx`), PowerPoint (`.pptx`).
   - **All $\rightarrow$ Markdown**: Reverse conversion from Word, Excel, PowerPoint, PDF, HTML back to structured Markdown.
   - **Current Working Directory Output**: Defaults output to `process.cwd()` as `<source_name>.<target_format>` with automatic timestamp protection against overwrite.
2. **Word (.docx) Automation**:
   - `doc_word_patch_text`: XML Run-aware text replacement preserving styles, fonts, and layout.
   - `doc_word_fill_template`: Mustache template rendering with docxtemplater.
3. **Excel (.xlsx) Processing**:
   - `doc_excel_read`: Read sheets into JSON object arrays.
   - `doc_excel_write`: Write JSON data into Excel directly.
4. **PDF Security & Governance**:
   - `doc_pdf_watermark`: Add full-page diagonal text watermark.
   - `doc_pdf_merge`: Merge multiple PDF documents.
5. **PowerPoint (.pptx) Utilities**:
   - `doc_pptx_extract_images`: Extract all embedded image assets losslessly.

---

## 🚀 Setup

### Local Run

```json
{
  "mcpServers": {
    "doc-processor": {
      "command": "node",
      "args": ["d:/.../doc-processor-mcp/dist/index.js"]
    }
  }
}
```

### NPX Run (After Publish)

```json
{
  "mcpServers": {
    "doc-processor": {
      "command": "npx",
      "args": ["-y", "doc-processor-mcp"]
    }
  }
}
```

---

## 🛠️ MCP Tools

- `md_conver`: Bidirectional Markdown conversion hub (defaults to output in current working directory).
- `doc_inspect`: Inspect document structure and metadata.
- `doc_word_patch_text`: Replace text in docx while preserving formatting.
- `doc_word_fill_template`: Fill Word templates with JSON data.
- `doc_excel_read`: Read Excel sheet as JSON array.
- `doc_excel_write`: Export JSON array to Excel.
- `doc_pdf_to_images`: Render and export PDF pages to high-resolution images (PNG/JPG).
- `doc_pdf_watermark`: Add text watermark to PDF pages.
- `doc_pdf_merge`: Combine multiple PDFs.
- `doc_pptx_create`: Generate PowerPoint presentation from slides structure.
- `doc_images_to_pptx`: Import an array of images into consecutive PowerPoint slides (1 slide per image, contain/cover/full).
- `doc_pptx_replace_text`: Find and replace text across all slides.
- `doc_pptx_extract_images`: Extract image files from PPTX.
- `doc_html_to_image`: Render local HTML file or HTML string to image (PNG/JPEG) using headless system Chrome/Edge via puppeteer-core.

---

## 📦 Build & Test

```bash
npm test
npm run build
```

## 📄 License

[MIT](LICENSE)

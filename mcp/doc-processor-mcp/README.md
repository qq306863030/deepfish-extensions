# doc-processor-mcp

面向 Model Context Protocol (MCP) 的一站式全能办公套件文档处理与格式转换服务。

以统一核心工具 **`md_conver`** 为中枢，支持 Markdown 与 Word、PDF、HTML、Excel、PowerPoint 等主流格式的全能双向互转，**默认将转换生成的文档输出到当前工作目录 (`process.cwd()`)**，并提供 Word 模板渲染、保格式智能替换、Excel 结构化读写、PDF 水印与合并等生产级功能。

---

## ✨ 核心特性

1. **统一转换中枢 `md_conver`**：
   - **Markdown 转一切**：Markdown $\rightarrow$ Word (`.docx`)、PDF (`.pdf`)、HTML (`.html`)、Excel (`.xlsx`)、PowerPoint (`.pptx`)。
   - **一切转 Markdown**：Word、Excel、PowerPoint、PDF、HTML 一键逆向解析还原为排版规范的 Markdown。
   - **默认当前目录输出**：若未指定 `outputPath`，自动在调用方的当前工作目录生成 `<源文件名>.<目标扩展名>`，并内置同名时间戳防覆盖保护。
2. **Word 生产级编辑**：
   - `doc_word_patch_text`：智能跨 XML Run 文本替换，保留原有字体样式、字号与段落排版。
   - `doc_word_fill_template`：基于 Mustache 语法的 Word 模板渲染。
3. **Excel 数据无缝流转**：
   - `doc_excel_read`：直接将工作表读取为 JSON 对象数组，便于大模型分析数据。
   - `doc_excel_write`：将 JSON 数组直接导出为标准 Excel 工作簿。
4. **PDF 治理与安全**：
   - `doc_pdf_watermark`：全页面平铺文字水印，支持透明度、旋转角与颜色调节。
   - `doc_pdf_merge`：多个 PDF 页面顺序拼接合并。
5. **PowerPoint 资源提取**：
   - `doc_pptx_extract_images`：无损批量抽离 PPTX 中内嵌的所有图片素材。

---

## 🚀 快速接入配置

在 MCP 客户端配置文件（如 Antigravity IDE `mcp_config.json` 或 `claude_desktop_config.json`）中添加：

### 本地路径运行

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

### NPX 运行（发布后）

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

## 🛠️ MCP 工具全集清单 (共 27 项能力)

### 1. 核心格式转换中枢
- **`md_conver`**：支持 Markdown 与 Word、PDF、HTML、Excel、PowerPoint、CSV 的双向互转。未指定输出路径时，**默认在当前工作目录 (`process.cwd()`) 输出**。

### 2. 图像处理工具集 (`sharp` 驱动)
- **`doc_img_process`**：图片缩放（resize）、裁剪（crop）、旋转（rotate）、翻转（flip）、内边距（pad）、格式转换（jpeg/png/webp/avif）、压缩画质（quality）、灰度化、高斯模糊、锐化。
- **`doc_img_overlay`**：在底图上叠加水印/Logo 图片。
- **`doc_img_to_pdf`**：将多张图片按顺序合并为一个标准 PDF 文档。

### 3. Word 文档工具集 (`.docx`)
- **`doc_word_patch_text`**：智能跨 XML Run 替换文字，保留原字体、大小、颜色和排版。
- **`doc_word_fill_template`**：基于 Mustache 语法的 Word 模板数据批量填充。
- **`doc_word_append`**：向已有 Word 文档末尾追加若干段落。
- **`doc_word_extract_links`**：提取 Word 文档中的所有外部超链接。

### 4. Excel 表格工具集 (`.xlsx`)
- **`doc_excel_read`**：将工作表读取为 JSON 对象数组或原始二维数据。
- **`doc_excel_write`**：将 JSON 数组直接导出为新的 Excel 工作簿。
- **`doc_excel_append_rows`**：向指定工作表追加多行数据（无需重写文件）。
- **`doc_excel_search`**：全表关键词查找，返回单元格坐标（如 `B12`）与所在整行。
- **`doc_excel_manage_sheet`**：删除或重命名工作表。
- **`doc_excel_merge`**：将多个 Excel 文件的所有 Sheet 汇聚合并到一个新工作簿中。

### 5. PDF 文件工具集 (`.pdf`)
- **`doc_pdf_to_images`**：将 PDF 分页渲染转换为高清图片（PNG / JPG / JPEG），支持自定义缩放清晰度（scale/DPI）与按需选择页码导出。
- **`doc_pdf_watermark`**：全页面平铺半透明倾斜文字水印。
- **`doc_pdf_merge`**：将多个 PDF 文件按顺序拼接合并。
- **`doc_pdf_split`**：将多页 PDF 拆分为单页独立 PDF 文件。
- **`doc_pdf_extract_pages`**：抽取指定页码（如 `[1, 3, 5]`）生成新 PDF。
- **`doc_pdf_rotate_pages`**：旋转特定页面（90° / 180° / 270°）。
- **`doc_pdf_set_metadata`**：设置 PDF 的标题、作者、主题、关键字等元信息。

### 6. PowerPoint 演示文稿工具集 (`.pptx`)
- **`doc_pptx_create`**：根据自定义幻灯片数组配置（标题、要点、段落）生成演示文稿。
- **`doc_images_to_pptx`**：将多张图片按顺序导入生成 PPT 幻灯片（每张图片一页，支持 16:9 / 4:3 比例，以及 contain / cover / full 布局方式）。
- **`doc_pptx_replace_text`**：批量替换 PPT 所有幻灯片 XML 中的文本。
- **`doc_pptx_extract_images`**：无损批量抽离 PPT 内嵌的所有图片素材。

### 7. HTML 网页渲染与转换 (`puppeteer-core` 驱动)
- **`doc_html_to_image`**：将本地 HTML 文件或 HTML 字符串代码渲染并截图保存为图片（PNG / JPEG），自动检测本地 Chrome/Edge 浏览器，支持全长网页截图、自定义视口大小、CSS 元素选择器截图与视网膜超清倍率（`deviceScaleFactor`）。

### 8. 全局通用探查
- **`doc_inspect`**：查看任意文档（Word/Excel/PPT/PDF/图片）的元数据、结构、尺寸、页数与字数。

---

## 📦 构建与测试

```bash
# 运行自动化测试
npm test

# 打包构建单文件
npm run build
```

## 📄 License

[MIT](LICENSE)

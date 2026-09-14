import fs from 'node:fs';
import path from 'node:path';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function markdownToHtmlString(md, theme = 'github') {
  let html = md
    // 代码块
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code class="language-${lang}">${escapeHtml(code.trimEnd())}</code></pre>`)
    // 行内代码
    .replace(/`([^`]+)`/g, (_, c) => `<code>${escapeHtml(c)}</code>`)
    // 标题
    .replace(/^###### (.+)$/gm, '<h6>$1</h6>')
    .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 水平线
    .replace(/^[-*_]{3,}$/gm, '<hr>')
    // 粗斜体
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // 粗体
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // 斜体
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // 删除线
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    // 图片
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // 引用
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // 处理 Markdown 表格
  html = html.replace(/((?:\|[^\n]+\|\r?\n)+)/g, (match) => {
    const lines = match.trim().split(/\r?\n/);
    if (lines.length < 2) return match;
    const headerLine = lines[0];
    const isDivider = lines[1].replace(/[\s|:-]/g, '').length === 0;
    if (!isDivider) return match;

    const parseRow = (line) =>
      line.trim().replace(/^\||\|$/g, '').split('|').map(s => s.trim());

    const headers = parseRow(headerLine);
    let tableHtml = '<table><thead><tr>' + headers.map(h => `<th>${escapeHtml(h)}</th>`).join('') + '</tr></thead><tbody>';

    for (let i = 2; i < lines.length; i++) {
      const cells = parseRow(lines[i]);
      tableHtml += '<tr>' + cells.map(c => `<td>${escapeHtml(c)}</td>`).join('') + '</tr>';
    }
    tableHtml += '</tbody></table>';
    return tableHtml;
  });

  // 无序列表包裹
  html = html.replace(/^[ \t]*[-*+] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]+?<\/li>)(\n(?!<li>)|$)/g, (_, items) => `<ul>${items}</ul>`);

  // 段落包裹
  html = html.replace(/^(?!<[a-z/]|$)(.+)$/gm, '<p>$1</p>');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 920px; margin: 40px auto; padding: 0 24px; color: #24292f; }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; line-height: 1.25; }
    h1 { font-size: 2em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; font-size: 85%; }
    code { background: rgba(175, 184, 193, 0.2); padding: 0.2em 0.4em; border-radius: 4px; font-size: 85%; font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace; }
    blockquote { border-left: 0.25em solid #d0d7de; padding: 0 1em; color: #57606a; margin: 0 0 16px 0; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #d0d7de; padding: 6px 13px; text-align: left; }
    th { background: #f6f8fa; font-weight: 600; }
    tr:nth-child(2n) { background-color: #f6f8fa; }
    hr { height: 0.25em; padding: 0; margin: 24px 0; background-color: #d0d7de; border: 0; }
    ul { padding-left: 2em; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
}

export async function mdToHtml(inputPath, outputPath, options = {}) {
  const md = await fs.promises.readFile(inputPath, 'utf8');
  const html = markdownToHtmlString(md, options.theme);
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, html, 'utf8');
  return { outputPath };
}

export async function htmlToMd(inputPath, outputPath, options = {}) {
  const html = await fs.promises.readFile(inputPath, 'utf8');
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  });
  turndownService.use(gfm);

  const markdown = turndownService.turndown(html);
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, markdown, 'utf8');
  return { outputPath };
}

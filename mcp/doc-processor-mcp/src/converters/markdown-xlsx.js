import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

/**
 * Parse markdown tables from text.
 * Returns array of { headers: string[], rows: string[][] }
 */
export function extractMarkdownTables(md) {
  const tables = [];
  const lines = md.split(/\r?\n/);
  let currentTable = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.slice(1, -1).split('|').map(c => c.trim());
      
      // Check if next line is divider
      if (!currentTable) {
        if (i + 1 < lines.length) {
          const next = lines[i + 1].trim();
          if (next.startsWith('|') && next.endsWith('|')) {
            const isDivider = next.slice(1, -1).split('|').every(c => /^:?-+:?$/.test(c.trim()));
            if (isDivider) {
              currentTable = { headers: cells, rows: [] };
              i++; // skip divider
              continue;
            }
          }
        }
      } else {
        // Table body row
        currentTable.rows.push(cells);
      }
    } else {
      if (currentTable) {
        tables.push(currentTable);
        currentTable = null;
      }
    }
  }

  if (currentTable) {
    tables.push(currentTable);
  }

  return tables;
}

export async function mdToXlsx(inputPath, outputPath, options = {}) {
  const md = await fs.promises.readFile(inputPath, 'utf8');
  const tables = extractMarkdownTables(md);

  if (tables.length === 0) {
    throw new Error('No markdown tables found in file.');
  }

  const wb = XLSX.utils.book_new();

  tables.forEach((tbl, idx) => {
    // Restore <br> to real line breaks
    const headerRow = tbl.headers.map(h => h.replace(/<br\s*\/?>/gi, '\n'));
    const bodyRows = tbl.rows.map(row => row.map(cell => cell.replace(/<br\s*\/?>/gi, '\n')));
    const data = [headerRow, ...bodyRows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const sheetName = options.sheetName && idx === 0 ? options.sheetName : `Table_${idx + 1}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  });

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  XLSX.writeFile(wb, outputPath);

  return { outputPath, tablesExtracted: tables.length };
}

export async function xlsxToMd(inputPath, outputPath, options = {}) {
  const wb = XLSX.readFile(inputPath);
  const parts = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows.length === 0) continue;

    parts.push(`### Sheet: ${sheetName}\n`);

    const headers = rows[0].map(h => String(h || '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>'));
    parts.push(`| ${headers.join(' | ')} |`);
    parts.push(`| ${headers.map(() => '---').join(' | ')} |`);

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r].map(c => String(c ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>'));
      // Pad to header length if row is shorter
      while (row.length < headers.length) row.push('');
      parts.push(`| ${row.slice(0, headers.length).join(' | ')} |`);
    }
    parts.push('\n');
  }

  const result = parts.join('\n');
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, result, 'utf8');

  return { outputPath, sheetCount: wb.SheetNames.length };
}

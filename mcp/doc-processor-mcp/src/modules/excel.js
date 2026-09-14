import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';
import { resolveTargetOutputPath } from '../utils.js';

export async function getExcelInfo(filePath) {
  const fullPath = path.resolve(process.cwd(), filePath);
  const wb = XLSX.readFile(fullPath);
  const stat = await fs.promises.stat(fullPath);
  const sheets = wb.SheetNames.map(name => {
    const ws = wb.Sheets[name];
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    return {
      name,
      rows: range.e.r - range.s.r + 1,
      cols: range.e.c - range.s.c + 1,
    };
  });

  return {
    filePath: fullPath,
    sizeBytes: stat.size,
    sheetCount: sheets.length,
    sheets,
  };
}

export async function readExcelSheet(filePath, sheetName = null, raw = false) {
  const fullPath = path.resolve(process.cwd(), filePath);
  const wb = XLSX.readFile(fullPath);
  const targetSheet = sheetName || wb.SheetNames[0];
  const ws = wb.Sheets[targetSheet];

  if (!ws) {
    throw new Error(`Sheet "${targetSheet}" not found. Available sheets: ${wb.SheetNames.join(', ')}`);
  }

  const data = raw
    ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    : XLSX.utils.sheet_to_json(ws, { defval: '' });

  return {
    filePath: fullPath,
    sheetName: targetSheet,
    rowCount: data.length,
    data,
  };
}

export async function writeExcelData(data, outputPath = null, sheetName = 'Sheet1') {
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array of objects or an array of rows.');
  }

  const wb = XLSX.utils.book_new();
  const ws = Array.isArray(data[0])
    ? XLSX.utils.aoa_to_sheet(data)
    : XLSX.utils.json_to_sheet(data);

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const finalOut = resolveTargetOutputPath('data.xlsx', 'xlsx', outputPath, true);
  await fs.promises.mkdir(path.dirname(finalOut), { recursive: true });
  XLSX.writeFile(wb, finalOut);

  return { outputPath: finalOut, rowCount: data.length };
}

export async function appendExcelRows(filePath, rows = [], sheetName = null, outputPath = null) {
  const fullPath = path.resolve(process.cwd(), filePath);
  const wb = XLSX.readFile(fullPath);
  const targetSheet = sheetName || wb.SheetNames[0];
  const ws = wb.Sheets[targetSheet];

  if (!ws) throw new Error(`Sheet "${targetSheet}" not found.`);

  XLSX.utils.sheet_add_aoa(ws, rows, { origin: -1 });

  const finalOut = resolveTargetOutputPath(filePath, 'xlsx', outputPath, true);
  await fs.promises.mkdir(path.dirname(finalOut), { recursive: true });
  XLSX.writeFile(wb, finalOut);

  return { outputPath: finalOut, sheetName: targetSheet, appendedRows: rows.length };
}

export async function searchExcel(filePath, query = '') {
  const fullPath = path.resolve(process.cwd(), filePath);
  const wb = XLSX.readFile(fullPath);
  const results = [];

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c]);
        if (val.toLowerCase().includes(query.toLowerCase())) {
          const colLetter = XLSX.utils.encode_col(c);
          results.push({
            sheet: name,
            cell: `${colLetter}${r + 1}`,
            matchedValue: val,
            rowValues: row,
          });
        }
      }
    }
  }

  return { filePath: fullPath, query, matchCount: results.length, results: results.slice(0, 50) };
}

export async function manageExcelSheet(filePath, action, sheetName, newName = null, outputPath = null) {
  const fullPath = path.resolve(process.cwd(), filePath);
  const wb = XLSX.readFile(fullPath);

  if (action === 'delete') {
    const idx = wb.SheetNames.indexOf(sheetName);
    if (idx === -1) throw new Error(`Sheet "${sheetName}" not found.`);
    if (wb.SheetNames.length <= 1) throw new Error('Cannot delete the only sheet in workbook.');
    wb.SheetNames.splice(idx, 1);
    delete wb.Sheets[sheetName];
  } else if (action === 'rename') {
    if (!newName) throw new Error('newName is required for rename action.');
    const idx = wb.SheetNames.indexOf(sheetName);
    if (idx === -1) throw new Error(`Sheet "${sheetName}" not found.`);
    wb.SheetNames[idx] = newName;
    wb.Sheets[newName] = wb.Sheets[sheetName];
    delete wb.Sheets[sheetName];
  } else {
    throw new Error(`Invalid action: "${action}". Supported: 'delete', 'rename'.`);
  }

  const finalOut = resolveTargetOutputPath(filePath, 'xlsx', outputPath, true);
  await fs.promises.mkdir(path.dirname(finalOut), { recursive: true });
  XLSX.writeFile(wb, finalOut);

  return { outputPath: finalOut, action, sheetName, sheets: wb.SheetNames };
}

export async function mergeExcelFiles(inputPaths = [], outputPath = null) {
  if (!Array.isArray(inputPaths) || inputPaths.length < 2) {
    throw new Error('At least 2 Excel file paths are required.');
  }

  const mergedWb = XLSX.utils.book_new();

  for (const p of inputPaths) {
    const full = path.resolve(process.cwd(), p);
    const wb = XLSX.readFile(full);
    const filePrefix = path.basename(p, path.extname(p));

    for (const name of wb.SheetNames) {
      let uniqueName = `${filePrefix}_${name}`.slice(0, 31);
      if (mergedWb.SheetNames.includes(uniqueName)) {
        uniqueName = `${uniqueName.slice(0, 27)}_${mergedWb.SheetNames.length + 1}`;
      }
      XLSX.utils.book_append_sheet(mergedWb, wb.Sheets[name], uniqueName);
    }
  }

  const finalOut = resolveTargetOutputPath('merged_sheets.xlsx', 'xlsx', outputPath, true);
  await fs.promises.mkdir(path.dirname(finalOut), { recursive: true });
  XLSX.writeFile(mergedWb, finalOut);

  return { outputPath: finalOut, totalSheets: mergedWb.SheetNames.length, sheets: mergedWb.SheetNames };
}

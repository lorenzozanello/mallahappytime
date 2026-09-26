/** Reads an .xlsx file into plain cell arrays (build-time only). */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import type { SheetCells, WorkbookCells } from './parse';

function cellText(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) return value.richText.map((r) => r.text).join('');
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('result' in value && value.result !== undefined && value.result !== null) return String(value.result);
  }
  return null;
}

export async function readWorkbook(filePath: string): Promise<WorkbookCells> {
  const buffer = await readFile(filePath);
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  const wb = new ExcelJS.Workbook();
  // exceljs expects a Node Buffer; the cast avoids a Buffer<ArrayBufferLike> typing mismatch.
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheets: Record<string, SheetCells> = {};
  wb.eachSheet((ws) => {
    const rows: SheetCells = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cells: (string | null)[] = [];
      row.eachCell({ includeEmpty: false }, (c, colNumber) => {
        // Merged "slave" cells repeat the master value in exceljs; keep only the master
        // so that the parser sees the workbook as authored.
        if (c.isMerged && c.master.address !== c.address) return;
        cells[colNumber] = cellText(c.value);
      });
      rows[rowNumber] = cells;
    });
    sheets[ws.name] = rows;
  });
  return { fileName: path.basename(filePath), sha256, sheets };
}

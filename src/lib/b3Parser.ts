import * as XLSX from 'xlsx';
import type { B3ParseResult, B3Position, B3ReportType } from '@/types/b3';

/** remove accents / lowercase / trim so header matching is resilient */
export function normalizeKey(value: string): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function findKey(row: Record<string, unknown>, candidates: string[]): string | undefined {
  const entries = Object.keys(row).map(k => [normalizeKey(k), k] as const);
  for (const candidate of candidates) {
    const target = normalizeKey(candidate);
    const exact = entries.find(([n]) => n === target);
    if (exact) return exact[1];
  }
  for (const candidate of candidates) {
    const target = normalizeKey(candidate);
    const partial = entries.find(([n]) => n.includes(target));
    if (partial) return partial[1];
  }
  return undefined;
}

function getValue(row: Record<string, unknown>, candidates: string[]): unknown {
  const key = findKey(row, candidates);
  return key ? row[key] : undefined;
}

export function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const cleaned = String(value)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** B3 files use dd/MM/yyyy; xlsx may also hand us a serial date */
export function parseDate(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return undefined;
    const iso = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    return iso.toISOString().split('T')[0];
  }
  const text = String(value).trim();
  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = text.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  return undefined;
}

function detectReportType(headers: string[]): B3ReportType {
  const normalized = headers.map(normalizeKey);
  const has = (needle: string) => normalized.some(h => h.includes(normalizeKey(needle)));

  if (has('data do negocio') || has('tipo de movimentacao')) return 'NEGOCIACAO';
  if (has('vencimento') && (has('emissor') || has('indexador'))) return 'RENDA_FIXA';
  if (has('codigo de negociacao') || has('escriturador') || has('preco de fechamento')) return 'ACOES';
  return 'DESCONHECIDO';
}

/** the header row is not always the first row of the sheet */
function extractRows(sheet: XLSX.WorkSheet): { headers: string[]; rows: Record<string, unknown>[] } {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, raw: true });

  let headerIndex = -1;
  for (let i = 0; i < Math.min(matrix.length, 20); i++) {
    const row = (matrix[i] || []).map(c => normalizeKey(String(c ?? '')));
    const filled = row.filter(Boolean).length;
    const looksLikeHeader = filled >= 3 && row.some(c =>
      ['produto', 'instituicao', 'quantidade', 'codigo de negociacao', 'data do negocio', 'emissor'].some(k => c.includes(k))
    );
    if (looksLikeHeader) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) return { headers: [], rows: [] };

  const headers = (matrix[headerIndex] || []).map(c => String(c ?? '').trim());
  const rows: Record<string, unknown>[] = [];

  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const values = matrix[i] || [];
    if (values.every(v => v === null || v === undefined || String(v).trim() === '')) continue;
    const row: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (header) row[header] = values[index];
    });
    rows.push(row);
  }

  return { headers, rows };
}

function toPosition(row: Record<string, unknown>, reportType: B3ReportType, index: number): B3Position | null {
  const product = String(getValue(row, ['Produto', 'Código de Negociação', 'Ativo']) ?? '').trim();
  if (!product) return null;

  const tickerRaw = getValue(row, ['Código de Negociação', 'Codigo de Negociacao', 'Ticker']);
  const ticker = tickerRaw ? String(tickerRaw).trim().toUpperCase() : undefined;

  const base: B3Position = {
    id: `${reportType}-${index}-${product}`,
    reportType,
    product,
    ticker: ticker || (reportType === 'ACOES' ? product.split('-')[0].trim().toUpperCase() : undefined),
    institution: getValue(row, ['Instituição']) ? String(getValue(row, ['Instituição'])).trim() : undefined,
    issuer: getValue(row, ['Emissor']) ? String(getValue(row, ['Emissor'])).trim() : undefined,
    indexer: getValue(row, ['Indexador']) ? String(getValue(row, ['Indexador'])).trim() : undefined,
    quantity: parseNumber(getValue(row, ['Quantidade Disponível', 'Quantidade'])),
    price: parseNumber(getValue(row, ['Preço de Fechamento', 'Preço Atualizado MTM', 'Preço Atualizado CURVA', 'Preço'])),
    totalValue: parseNumber(getValue(row, ['Valor Atualizado', 'Valor Atualizado MTM', 'Valor Atualizado CURVA', 'Valor'])),
    maturityDate: parseDate(getValue(row, ['Vencimento', 'Prazo/Vencimento', 'Data de Vencimento'])),
    tradeDate: parseDate(getValue(row, ['Data do Negócio', 'Data'])),
    movementType: getValue(row, ['Tipo de Movimentação']) ? String(getValue(row, ['Tipo de Movimentação'])).trim() : undefined,
    raw: row,
  };

  if (base.totalValue === undefined && base.price !== undefined && base.quantity !== undefined) {
    base.totalValue = base.price * base.quantity;
  }

  return base;
}

export async function parseB3File(file: File): Promise<B3ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  let best: { sheetName: string; headers: string[]; rows: Record<string, unknown>[] } | null = null;

  for (const sheetName of workbook.SheetNames) {
    const { headers, rows } = extractRows(workbook.Sheets[sheetName]);
    if (rows.length && (!best || rows.length > best.rows.length)) {
      best = { sheetName, headers, rows };
    }
  }

  if (!best) {
    return { reportType: 'DESCONHECIDO', positions: [], headers: [], rawRows: [], sheetName: workbook.SheetNames[0] ?? '' };
  }

  const reportType = detectReportType(best.headers);
  const positions = best.rows
    .map((row, index) => toPosition(row, reportType, index))
    .filter((p): p is B3Position => p !== null);

  return { reportType, positions, headers: best.headers, rawRows: best.rows, sheetName: best.sheetName };
}

export const REPORT_TYPE_LABEL: Record<B3ReportType, string> = {
  ACOES: 'Posição - Ações / BDRs',
  RENDA_FIXA: 'Posição - Renda Fixa',
  NEGOCIACAO: 'Negociação',
  DESCONHECIDO: 'Formato não reconhecido',
};

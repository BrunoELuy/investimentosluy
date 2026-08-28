import * as XLSX from 'xlsx';
import type {
  B3ParseResult,
  B3Position,
  B3ReportType,
  B3MovementRow,
  DividendPayment,
  DividendType,
  B3AggregatedStock,
  B3AggregatedFixedIncome,
  B3MovementsConsolidation,
} from '@/types/b3';

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

  if (has('entrada/saida') || has('entrada / saida') || (has('movimentacao') && (has('valor da operacao') || has('entrada')))) {
    return 'MOVIMENTACAO';
  }
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
      ['produto', 'instituicao', 'quantidade', 'codigo de negociacao', 'data do negocio', 'emissor', 'entrada', 'movimentacao'].some(k => c.includes(k))
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

function parseMovementRow(row: Record<string, unknown>): B3MovementRow | null {
  const product = String(getValue(row, ['Produto', 'Ativo', 'Código de Negociação']) ?? '').trim();
  if (!product) return null;

  const rawDateVal = getValue(row, ['Data', 'Data do Negócio', 'Data da Operação']);
  const date = parseDate(rawDateVal);
  if (!date) return null;

  const entryExit = String(getValue(row, ['Entrada/Saída', 'Entrada/Saida', 'Entrada / Saída', 'Entrada / Saida', 'Tipo']) ?? 'Credito').trim();
  const movementType = String(getValue(row, ['Movimentação', 'Movimentacao', 'Tipo de Movimentação']) ?? '').trim();
  const institution = String(getValue(row, ['Instituição', 'Instituicao', 'Corretora']) ?? 'B3').trim();
  const quantity = parseNumber(getValue(row, ['Quantidade', 'Quantidade Disponível', 'Qtd']));
  const unitPrice = parseNumber(getValue(row, ['Preço unitário', 'Preço Unitário', 'Preco unitario', 'Preço']));
  let operationValue = parseNumber(getValue(row, ['Valor da Operação', 'Valor da Operacao', 'Valor Total', 'Valor']));

  if (operationValue === undefined && unitPrice !== undefined && quantity !== undefined) {
    operationValue = unitPrice * quantity;
  }

  return {
    entryExit,
    date,
    rawDate: String(rawDateVal ?? date),
    movementType,
    product,
    institution,
    quantity,
    unitPrice,
    operationValue,
    raw: row,
  };
}

export function extractAssetPrefix(product: string): { prefix: string; fullName: string; isFixedIncome: boolean; type: 'CDB' | 'LCA' | 'ACAO' } {
  const clean = String(product || '').trim();
  const parts = clean.split('-');
  const firstPart = parts[0].trim().toUpperCase();

  if (firstPart === 'CDB') {
    return { prefix: 'CDB', fullName: clean, isFixedIncome: true, type: 'CDB' };
  }
  if (firstPart === 'LCA' || firstPart === 'LCI') {
    return { prefix: 'LCA', fullName: clean, isFixedIncome: true, type: 'LCA' };
  }

  // Stock ticker (e.g. BBSE3, ITUB4, ALOS3, TIMS3, RANI3, LEVE3)
  return { prefix: firstPart, fullName: clean, isFixedIncome: false, type: 'ACAO' };
}

function detectDividendType(movementType: string): { isDividend: boolean; type: DividendType; typeLabel: string } {
  const norm = normalizeKey(movementType);
  if (norm.includes('dividendo')) {
    return { isDividend: true, type: 'DIVIDENDO', typeLabel: 'Dividendo' };
  }
  if (norm.includes('juros sobre capital') || norm.includes('jcp')) {
    return { isDividend: true, type: 'JCP', typeLabel: 'Juros Sobre Capital Próprio' };
  }
  if (norm.includes('rendimento')) {
    return { isDividend: true, type: 'RENDIMENTO', typeLabel: 'Rendimento' };
  }
  if (norm.includes('pagamento de juros') || norm.includes('juros')) {
    return { isDividend: true, type: 'JUROS_RF', typeLabel: 'Pagamento de Juros' };
  }
  return { isDividend: false, type: 'OUTRO', typeLabel: movementType };
}

/**
 * Consolidates all movements from spreadsheet in strict chronological order.
 * - Stocks: computes net quantity and weighted average purchase price.
 * - Fixed Income (CDB/LCA): groups by institution, accounts for deposits and redemptions.
 * - Zero balance positions (e.g. bought 260 and sold 260) are marked as isZeroBalance: true.
 * - Proventos (Dividends/JCP) are extracted and preserved 100% even for zero balance assets.
 */
export function consolidateMovements(movements: B3MovementRow[]): B3MovementsConsolidation {
  // 1. Sort strictly chronological: oldest date to newest date
  const sorted = [...movements].sort((a, b) => a.date.localeCompare(b.date));

  const dividends: DividendPayment[] = [];
  const stockMap = new Map<string, {
    ticker: string;
    productName: string;
    institution: string;
    totalQuantity: number;
    totalInvested: number;
    firstDate: string;
    lastDate: string;
    totalBoughtQty: number;
    totalSoldQty: number;
    operationsCount: number;
    movements: B3MovementRow[];
  }>();

  const fixedIncomeMap = new Map<string, {
    key: string;
    type: 'CDB' | 'LCA';
    institution: string;
    name: string;
    totalApplied: number;
    totalRedeemed: number;
    startDate: string;
    endDate: string;
    deposits: Array<{ amount: number; deposit_date: string; notes?: string }>;
    operationsCount: number;
    movements: B3MovementRow[];
  }>();

  for (const mov of sorted) {
    const { prefix, fullName, isFixedIncome, type } = extractAssetPrefix(mov.product);
    const divCheck = detectDividendType(mov.movementType);

    // 1. Check if this is a Provento (Dividendo, JCP, Rendimento, Juros)
    if (divCheck.isDividend) {
      dividends.push({
        id: `div-${mov.date}-${prefix}-${dividends.length}`,
        date: mov.date,
        ticker: prefix,
        assetName: fullName,
        type: divCheck.type,
        typeLabel: divCheck.typeLabel,
        institution: mov.institution,
        quantity: mov.quantity ?? 0,
        unitPrice: mov.unitPrice ?? 0,
        totalAmount: mov.operationValue ?? ((mov.quantity ?? 0) * (mov.unitPrice ?? 0)),
      });
      continue;
    }

    // 2. Fixed Income Movements (CDB / LCA)
    if (isFixedIncome) {
      const groupKey = `${type}_${normalizeKey(mov.institution)}`;
      const existing = fixedIncomeMap.get(groupKey) || {
        key: groupKey,
        type,
        institution: mov.institution,
        name: `${mov.institution} ${type}`,
        totalApplied: 0,
        totalRedeemed: 0,
        startDate: mov.date,
        endDate: '',
        deposits: [],
        operationsCount: 0,
        movements: [],
      };

      // Proteção adicional para garantir que as listas existam
      existing.movements = existing.movements ?? [];
      existing.deposits = existing.deposits ?? [];

      existing.operationsCount += 1;
      existing.movements.push(mov);

      const normMov = normalizeKey(mov.movementType);
      const entryExitLower = (mov.entryExit || 'Credito').toLowerCase();
      const isRedemption = normMov.includes('resgate') || normMov.includes('vencimento') || entryExitLower === 'debito';

      if (isRedemption) {
        existing.totalRedeemed += mov.operationValue ?? 0;
      } else {
        // Application
        const amount = mov.operationValue ?? 0;
        if (existing.totalApplied === 0) {
          existing.startDate = mov.date;
        } else {
          // Additional deposit
          existing.deposits.push({
            amount,
            deposit_date: mov.date,
            notes: `Aporte importado da B3 (${mov.movementType})`,
          });
        }
        existing.totalApplied += amount;
      }

      fixedIncomeMap.set(groupKey, existing as typeof existing & { type: 'CDB' | 'LCA' });
      continue;
    }

    // 3. Stock Movements (Ações / BDRs / FIIs)
    const ticker = prefix;
    const existingStock = stockMap.get(ticker) || {
      ticker,
      productName: fullName,
      institution: mov.institution,
      totalQuantity: 0,
      totalInvested: 0,
      firstDate: mov.date,
      lastDate: mov.date,
      totalBoughtQty: 0,
      totalSoldQty: 0,
      operationsCount: 0,
      movements: [],
    };

    existingStock.operationsCount += 1;
    existingStock.lastDate = mov.date;
    existingStock.movements.push(mov);

    const normMov = normalizeKey(mov.movementType);
    const entryExitLower = (mov.entryExit || 'Credito').toLowerCase();
    const isSale = entryExitLower === 'debito' && (normMov.includes('liquidacao') || normMov.includes('venda'));
    const isBuy = entryExitLower === 'credito' && (normMov.includes('liquidacao') || normMov.includes('compra') || normMov.includes('aplicacao'));

    const qty = mov.quantity ?? 0;
    const val = mov.operationValue ?? ((mov.unitPrice ?? 0) * qty);

    if (isBuy) {
      existingStock.totalBoughtQty += qty;
      existingStock.totalQuantity += qty;
      existingStock.totalInvested += val;
    } else if (isSale) {
      existingStock.totalSoldQty += qty;
      const currentAvgPrice = existingStock.totalQuantity > 0 ? existingStock.totalInvested / existingStock.totalQuantity : (mov.unitPrice ?? 0);
      existingStock.totalQuantity = Math.max(0, existingStock.totalQuantity - qty);
      existingStock.totalInvested = existingStock.totalQuantity * currentAvgPrice;
    } else if (qty > 0 && val > 0) {
      // General operation with value
      existingStock.totalBoughtQty += qty;
      existingStock.totalQuantity += qty;
      existingStock.totalInvested += val;
    }

    stockMap.set(ticker, existingStock);
  }

  // Finalize Stocks Consolidation
  const stocks: B3AggregatedStock[] = Array.from(stockMap.values()).map(s => {
    const isZeroBalance = s.totalQuantity <= 0 || s.totalInvested <= 0.01;
    const rawAvg = s.totalQuantity > 0 ? s.totalInvested / s.totalQuantity : 0;
    const averagePrice = Math.round(rawAvg * 10000) / 10000;
    return {
      ...s,
      averagePrice,
      isZeroBalance,
    };
  });

  // Finalize Fixed Income Consolidation
  const fixedIncome: B3AggregatedFixedIncome[] = Array.from(fixedIncomeMap.values()).map(fi => {
    const rawNet = Math.max(0, fi.totalApplied - fi.totalRedeemed);
    const netInvested = Math.round(rawNet * 100) / 100;
    const isZeroBalance = netInvested <= 0.01;

    // Default maturity date = 2 years after start date
    const startYear = fi.startDate ? parseInt(fi.startDate.split('-')[0], 10) : new Date().getFullYear();
    const defaultEndYear = (Number.isNaN(startYear) ? new Date().getFullYear() : startYear) + 2;
    const defaultEndDate = fi.startDate
      ? `${defaultEndYear}-${fi.startDate.split('-')[1] || '12'}-${fi.startDate.split('-')[2] || '31'}`
      : `${new Date().getFullYear() + 2}-12-31`;

    return {
      key: fi.key,
      type: fi.type,
      institution: fi.institution,
      name: `${fi.institution} ${fi.type} 100% CDI`,
      totalApplied: Math.round(fi.totalApplied * 100) / 100,
      totalRedeemed: Math.round(fi.totalRedeemed * 100) / 100,
      netInvested,
      isZeroBalance,
      startDate: fi.startDate || new Date().toISOString().split('T')[0],
      endDate: defaultEndDate,
      rateType: 'CDI',
      rateValue: 100,
      deposits: fi.deposits,
      operationsCount: fi.operationsCount,
      movements: fi.movements,
    };
  });

  const zeroPositionsCount = stocks.filter(s => s.isZeroBalance).length + fixedIncome.filter(fi => fi.isZeroBalance).length;

  const totalInvestedStocks = stocks.filter(s => !s.isZeroBalance).reduce((acc, s) => acc + s.totalInvested, 0);
  const totalInvestedFixedIncome = fixedIncome.filter(fi => !fi.isZeroBalance).reduce((acc, fi) => acc + fi.netInvested, 0);
  const totalDividends = dividends.reduce((acc, d) => acc + d.totalAmount, 0);

  return {
    stocks,
    fixedIncome,
    dividends,
    zeroPositionsCount,
    summary: {
      totalInvestedStocks,
      totalInvestedFixedIncome,
      totalDividends,
      totalOperations: movements.length,
    },
  };
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
    price: parseNumber(getValue(row, ['Preço de Fechamento', 'Preço Atualizado MTM', 'Preço Atualizado CURVA', 'Preço', 'Preço unitário'])),
    totalValue: parseNumber(getValue(row, ['Valor Atualizado', 'Valor Atualizado MTM', 'Valor Atualizado CURVA', 'Valor', 'Valor da Operação'])),
    maturityDate: parseDate(getValue(row, ['Vencimento', 'Prazo/Vencimento', 'Data de Vencimento'])),
    tradeDate: parseDate(getValue(row, ['Data do Negócio', 'Data', 'Data da Operação'])),
    movementType: getValue(row, ['Tipo de Movimentação', 'Movimentação']) ? String(getValue(row, ['Tipo de Movimentação', 'Movimentação'])).trim() : undefined,
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

  if (reportType === 'MOVIMENTACAO') {
    const movements = best.rows
      .map(row => parseMovementRow(row))
      .filter((m): m is B3MovementRow => m !== null);

    const consolidation = consolidateMovements(movements);

    const positions = best.rows
      .map((row, index) => toPosition(row, reportType, index))
      .filter((p): p is B3Position => p !== null);

    return {
      reportType,
      positions,
      movements,
      consolidation,
      headers: best.headers,
      rawRows: best.rows,
      sheetName: best.sheetName,
    };
  }

  const positions = best.rows
    .map((row, index) => toPosition(row, reportType, index))
    .filter((p): p is B3Position => p !== null);

  return { reportType, positions, headers: best.headers, rawRows: best.rows, sheetName: best.sheetName };
}

export const REPORT_TYPE_LABEL: Record<B3ReportType, string> = {
  MOVIMENTACAO: 'Extrato de Movimentação (Completo)',
  ACOES: 'Posição - Ações / BDRs',
  RENDA_FIXA: 'Posição - Renda Fixa',
  NEGOCIACAO: 'Negociação',
  DESCONHECIDO: 'Formato não reconhecido',
};
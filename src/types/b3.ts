import type { Investment } from './investment';

export type B3ReportType = 'ACOES' | 'RENDA_FIXA' | 'NEGOCIACAO' | 'DESCONHECIDO';

export interface B3Position {
  /** unique id for the row (client-side only) */
  id: string;
  reportType: B3ReportType;
  /** Product / asset description as it appears in the statement */
  product: string;
  ticker?: string;
  institution?: string;
  issuer?: string;
  indexer?: string;
  quantity?: number;
  price?: number;
  totalValue?: number;
  maturityDate?: string;
  tradeDate?: string;
  movementType?: string;
  raw: Record<string, unknown>;
}

export interface B3ParseResult {
  reportType: B3ReportType;
  positions: B3Position[];
  headers: string[];
  rawRows: Record<string, unknown>[];
  sheetName: string;
}

export type ReconcileStatus = 'OK' | 'DIVERGENTE' | 'NAO_CADASTRADO' | 'NAO_CONSTA';

export interface ReconcileRow {
  key: string;
  status: ReconcileStatus;
  position?: B3Position;
  investment?: Investment;
  /** app-side value used for the comparison */
  appValue?: number;
  /** b3-side value used for the comparison */
  b3Value?: number;
  /** what the numbers represent: quantity of shares or invested amount */
  metric: 'QUANTIDADE' | 'VALOR';
  difference?: number;
  label: string;
}

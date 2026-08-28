import type { Investment, RateType } from './investment';

export type B3ReportType = 'ACOES' | 'RENDA_FIXA' | 'NEGOCIACAO' | 'MOVIMENTACAO' | 'DESCONHECIDO';

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

export interface B3MovementRow {
  entryExit: 'Credito' | 'Debito' | string;
  date: string; // YYYY-MM-DD
  rawDate: string; // dd/mm/aaaa
  movementType: string;
  product: string;
  institution: string;
  quantity?: number;
  unitPrice?: number;
  operationValue?: number;
  raw: Record<string, unknown>;
}

export type DividendType = 'DIVIDENDO' | 'JCP' | 'RENDIMENTO' | 'JUROS_RF' | 'OUTRO';

export interface DividendPayment {
  id: string;
  user_id?: string;
  date: string; // YYYY-MM-DD
  ticker: string;
  assetName: string;
  type: DividendType;
  typeLabel: string;
  institution: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  created_at?: string;
}

export interface B3AggregatedStock {
  ticker: string;
  productName: string;
  institution: string;
  totalQuantity: number;
  averagePrice: number;
  totalInvested: number;
  isZeroBalance: boolean;
  firstDate: string;
  lastDate: string;
  totalBoughtQty: number;
  totalSoldQty: number;
  operationsCount: number;
  existingInvestmentId?: string;
  movements: B3MovementRow[];
}

export interface B3AggregatedFixedIncomeDeposit {
  amount: number;
  deposit_date: string;
  notes?: string;
}

export interface B3AggregatedFixedIncome {
  key: string;
  type: 'CDB' | 'LCA';
  institution: string;
  name: string;
  totalApplied: number;
  totalRedeemed: number;
  netInvested: number;
  isZeroBalance: boolean;
  startDate: string;
  endDate: string;
  rateType: RateType;
  rateValue: number;
  existingInvestmentId?: string;
  deposits: B3AggregatedFixedIncomeDeposit[];
  operationsCount: number;
  movements: B3MovementRow[];
}

export interface B3MovementsConsolidation {
  stocks: B3AggregatedStock[];
  fixedIncome: B3AggregatedFixedIncome[];
  dividends: DividendPayment[];
  zeroPositionsCount: number;
  summary: {
    totalInvestedStocks: number;
    totalInvestedFixedIncome: number;
    totalDividends: number;
    totalOperations: number;
  };
}

export interface B3ParseResult {
  reportType: B3ReportType;
  positions: B3Position[];
  movements?: B3MovementRow[];
  consolidation?: B3MovementsConsolidation;
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

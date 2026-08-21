import type { B3Position, ReconcileRow } from '@/types/b3';
import type { Investment } from '@/types/investment';
import { normalizeKey } from './b3Parser';

/** relative tolerance below which we consider the values equal */
const TOLERANCE = 0.01;

function matchesStock(position: B3Position, investment: Investment): boolean {
  if (investment.type !== 'ACAO' || !investment.ticker) return false;
  const ticker = normalizeKey(investment.ticker);
  return (
    (!!position.ticker && normalizeKey(position.ticker) === ticker) ||
    normalizeKey(position.product).startsWith(ticker)
  );
}

function matchesFixedIncome(position: B3Position, investment: Investment): boolean {
  if (investment.type === 'ACAO') return false;

  const sameMaturity = !!position.maturityDate && position.maturityDate === investment.end_date;
  const issuer = normalizeKey(position.issuer ?? '');
  const product = normalizeKey(position.product);
  const name = normalizeKey(investment.name);
  const institution = normalizeKey(investment.institution);

  const nameMatch =
    (!!issuer && (issuer.includes(institution) || institution.includes(issuer))) ||
    (!!name && (product.includes(name) || name.includes(product)));

  return sameMaturity && nameMatch ? true : sameMaturity && !!issuer && !!institution && nameMatch;
}

export function findMatch(position: B3Position, investments: Investment[]): Investment | undefined {
  return investments.find(inv => matchesStock(position, inv) || matchesFixedIncome(position, inv));
}

function isDifferent(a: number, b: number): boolean {
  if (a === 0 && b === 0) return false;
  const base = Math.max(Math.abs(a), Math.abs(b));
  return Math.abs(a - b) / base > TOLERANCE;
}

export function reconcile(
  positions: B3Position[],
  investments: Investment[],
  /** manual links: position id -> investment id */
  links: Record<string, string> = {},
  ignored: string[] = []
): ReconcileRow[] {
  const rows: ReconcileRow[] = [];
  const matchedInvestmentIds = new Set<string>();

  for (const position of positions) {
    if (ignored.includes(position.id)) continue;

    const linkedId = links[position.id];
    const investment = linkedId
      ? investments.find(inv => inv.id === linkedId)
      : findMatch(position, investments);

    if (investment) matchedInvestmentIds.add(investment.id);

    const isStock = investment ? investment.type === 'ACAO' : !!position.ticker;
    const metric: ReconcileRow['metric'] = isStock ? 'QUANTIDADE' : 'VALOR';

    const appValue = investment
      ? metric === 'QUANTIDADE'
        ? Number(investment.quantity ?? 0)
        : Number(investment.initial_value ?? 0)
      : undefined;

    const b3Value = metric === 'QUANTIDADE' ? position.quantity : position.totalValue;

    if (!investment) {
      rows.push({
        key: position.id,
        status: 'NAO_CADASTRADO',
        position,
        metric,
        b3Value,
        label: position.ticker || position.product,
      });
      continue;
    }

    const different =
      appValue !== undefined && b3Value !== undefined ? isDifferent(appValue, b3Value) : appValue !== b3Value;

    rows.push({
      key: position.id,
      status: different ? 'DIVERGENTE' : 'OK',
      position,
      investment,
      metric,
      appValue,
      b3Value,
      difference: appValue !== undefined && b3Value !== undefined ? b3Value - appValue : undefined,
      label: investment.name,
    });
  }

  // investments that the statement does not mention
  for (const investment of investments) {
    if (matchedInvestmentIds.has(investment.id)) continue;
    rows.push({
      key: `missing-${investment.id}`,
      status: 'NAO_CONSTA',
      investment,
      metric: investment.type === 'ACAO' ? 'QUANTIDADE' : 'VALOR',
      appValue: investment.type === 'ACAO' ? Number(investment.quantity ?? 0) : Number(investment.initial_value ?? 0),
      label: investment.name,
    });
  }

  const order: Record<ReconcileRow['status'], number> = {
    DIVERGENTE: 0,
    NAO_CADASTRADO: 1,
    NAO_CONSTA: 2,
    OK: 3,
  };

  return rows.sort((a, b) => order[a.status] - order[b.status]);
}

export const STATUS_LABEL: Record<ReconcileRow['status'], string> = {
  OK: 'Conferido',
  DIVERGENTE: 'Divergente',
  NAO_CADASTRADO: 'Não cadastrado',
  NAO_CONSTA: 'Não consta na B3',
};

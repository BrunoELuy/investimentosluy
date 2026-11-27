import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useInvestments } from '@/hooks/useInvestments';
import { supabase } from '@/integrations/supabase/client';
import {
  saveLocalDividends,
  isOnline,
  getLocalOrphanFutureDividends,
  saveLocalOrphanFutureDividends,
  deleteLocalOrphanFutureDividends,
} from '@/lib/offlineDb';

const QUERY_VERSION = 'v6-orphan-fallback';

// aceita `now` como parâmetro (default = new Date()) para testes
export function todayInBrazil(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export interface FutureDividend {
  id: string;
  ticker: string;
  assetName: string;
  type: 'DIVIDENDO' | 'JCP' | 'OUTRO';
  typeLabel: string;
  dateCom: string;
  paymentDate: string;
  valuePerShare: number;
  quantityOnDateCom: number;
  totalAmount: number;
}

interface DividendEvent {
  assetIssued?: string;
  paymentDate?: string;
  rate?: number;
  relatedTo?: string;
  lastDatePrior?: string;
  approvedOn?: string;
}

interface StockTransactionLite {
  operation: 'BUY' | 'SELL';
  quantity: number;
  date: string;
}

export function mapRelatedTo(raw?: string): { type: FutureDividend['type']; label: string } {
  const v = (raw ?? '').toUpperCase();
  if (v.includes('JCP') || v.includes('JUROS')) return { type: 'JCP', label: 'JCP' };
  if (v.includes('DIVIDEND')) return { type: 'DIVIDENDO', label: 'Dividendo' };

  // Normaliza '' / '   ' / undefined → 'Provento', preservando rótulos customizados
  const trimmed = (raw ?? '').trim();
  return { type: 'OUTRO', label: trimmed || 'Provento' };
}

// ← Feature 4: núcleo do cálculo (aporte antes/depois da Data-com)
export function calculateQuantityAtDate(
  transactions: Array<{ date: string; operation: 'BUY' | 'SELL'; quantity: number }>,
  dateCom: string,
): number {
  let qty = 0;
  for (const tx of transactions) {
    if (tx.date > dateCom) continue;           // aportes depois da Data-com: ignorados
    if (tx.operation === 'BUY') qty += Number(tx.quantity) || 0;
    if (tx.operation === 'SELL') qty -= Number(tx.quantity) || 0;
  }
  return qty; // pode ser negativo; o caller aplica Math.max(0, ...)
}

export function splitDueAndFuture<T extends { paymentDate: string }>(
  events: T[],
  today: string,
): { future: T[]; due: T[] } {
  const future: T[] = [];
  const due: T[] = [];
  for (const e of events) {
    if (e.paymentDate < today) due.push(e);
    else future.push(e);
  }
  return { future, due };
}

/**
 * Converte eventos brutos da Edge Function `stock-dividends` em `FutureDividend[]`
 * usando o histórico de transações ou a quantidade atual como fallback.
 */
export function buildFutureDividendsForTicker(
  ticker: string,
  dividends: DividendEvent[],
  txs: StockTransactionLite[],
  currentQty: number,
): FutureDividend[] {
  const normalizedTicker = ticker.toUpperCase();
  const result: FutureDividend[] = [];

  for (const d of dividends) {
    if (!d.paymentDate || d.rate == null) continue;
    if (!d.lastDatePrior && !d.approvedOn) continue;

    const dateCom = (d.lastDatePrior ?? d.approvedOn!).split('T')[0];
    const paymentDate = d.paymentDate.split('T')[0];
    const { type, label } = mapRelatedTo(d.relatedTo);

    let qty = calculateQuantityAtDate(txs, dateCom);
    qty = Math.max(0, qty);

    if (qty <= 0 && txs.length === 0 && currentQty > 0) {
      qty = currentQty;
    }

    if (qty <= 0) continue;

    result.push({
      id: `${normalizedTicker}-${paymentDate}-${d.rate}-${type}`,
      ticker: normalizedTicker,
      assetName: d.assetIssued || normalizedTicker,
      type,
      typeLabel: label,
      dateCom,
      paymentDate,
      valuePerShare: d.rate,
      quantityOnDateCom: qty,
      totalAmount: qty * d.rate,
    });
  }

  return result;
}

/**
 * Seleciona apenas proventos cuja Data-com já passou (`dateCom < today`),
 * separando os que ainda serão pagos (`futureOrphans`) dos já vencidos (`dueOrphans`).
 */
export function filterOrphanCandidates(
  events: FutureDividend[],
  today: string,
): { futureOrphans: FutureDividend[]; dueOrphans: FutureDividend[] } {
  const postDateCom = events.filter((e) => e.dateCom < today);
  const { future, due } = splitDueAndFuture(postDateCom, today);
  return { futureOrphans: future, dueOrphans: due };
}

/**
 * Mescla proventos de ações ativas com proventos órfãos preservados.
 * Em caso de colisão de `id` (ex: usuário recriou a ação), o ativo prevalece.
 */
export function mergeFutureDividends(
  active: FutureDividend[],
  orphans: FutureDividend[],
): FutureDividend[] {
  const byId = new Map<string, FutureDividend>();
  for (const o of orphans) byId.set(o.id, o);
  for (const a of active) byId.set(a.id, a);
  return Array.from(byId.values());
}

export async function reconcileDueDividends(
  userId: string,
  due: FutureDividend[],
): Promise<void> {
  if (due.length === 0) return;

  const now = new Date().toISOString();

  const rows = due.map((d) => ({
    id: `fd-${d.id}`,
    user_id: userId,
    date: d.paymentDate,
    ticker: d.ticker,
    asset_name: d.assetName,
    type: d.type,
    type_label: d.typeLabel,
    institution: null,
    quantity: d.quantityOnDateCom,
    unit_price: d.valuePerShare,
    total_amount: d.totalAmount,
    source: 'auto',
    created_at: now,
  }));

  if (isOnline()) {
    const { error } = await supabase
      .from('dividend_payments')
      .upsert(rows, { onConflict: 'user_id,id', ignoreDuplicates: true });
    if (error) throw error;
  }

  await saveLocalDividends(
    rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      date: r.date,
      ticker: r.ticker,
      assetName: r.asset_name ?? '',
      type: r.type as 'DIVIDENDO' | 'JCP' | 'OUTRO',
      typeLabel: r.type_label ?? r.type,
      institution: '',
      quantity: r.quantity ?? 0,
      unitPrice: r.unit_price ?? 0,
      totalAmount: r.total_amount,
      created_at: r.created_at,
    })),
  );

  console.log(
    `[useFutureDividends] ${rows.length} provento(s) vencido(s) registrado(s) como recebido(s).`,
  );
}

/**
 * Preserva futuros proventos cuja Data-com já passou quando o usuário exclui uma ação.
 * - Eventos com pagamento futuro ficam salvos em `orphan_future_dividends` para continuar
 *   aparecendo em Futuros Proventos e serem reconciliados automaticamente quando vencerem.
 * - Eventos já vencidos são reconciliados imediatamente em `dividend_payments`.
 */
export async function preserveOrphanDividendsOnStockDelete(params: {
  userId: string;
  ticker: string;
  quantity: number;
  cachedFutureDividends?: FutureDividend[];
  today?: string;
}): Promise<void> {
  const normalizedTicker = params.ticker.toUpperCase();
  const today = params.today ?? todayInBrazil();

  let candidates: FutureDividend[] = (params.cachedFutureDividends ?? []).filter(
    (d) => d.ticker.toUpperCase() === normalizedTicker,
  );

  if (candidates.length === 0 && isOnline()) {
    const [{ data: fnData, error: fnError }, { data: txData, error: txError }] =
      await Promise.all([
        supabase.functions.invoke('stock-dividends', {
          body: { tickers: [normalizedTicker] },
        }),
        supabase
          .from('stock_transactions')
          .select('operation, quantity, date')
          .eq('user_id', params.userId)
          .eq('ticker', normalizedTicker),
      ]);

    if (fnError) throw fnError;
    if (txError) throw txError;

    const dividends: DividendEvent[] =
      fnData?.dividends?.[normalizedTicker] ?? [];
    const txs = (txData ?? []) as StockTransactionLite[];
    candidates = buildFutureDividendsForTicker(
      normalizedTicker,
      dividends,
      txs,
      params.quantity,
    );
  }

  if (candidates.length === 0) return;

  const { futureOrphans, dueOrphans } = filterOrphanCandidates(candidates, today);

  if (futureOrphans.length > 0) {
    await saveLocalOrphanFutureDividends(
      futureOrphans.map((d) => ({ ...d, user_id: params.userId })),
    );
  }

  if (dueOrphans.length > 0) {
    await reconcileDueDividends(params.userId, dueOrphans);
  }
}

export function useFutureDividends() {
  const { user } = useAuth();
  const { data: investments = [] } = useInvestments();
  const queryClient = useQueryClient();

  const stocks = investments.filter((i) => i.type === 'ACAO' && i.ticker);

  const tickers = Array.from(
    new Set(stocks.map((i) => i.ticker!.toUpperCase())),
  ).sort();

  const positionsSignature = stocks
    .map((i) => `${i.ticker!.toUpperCase()}:${i.quantity ?? 0}`)
    .sort()
    .join('|');

  return useQuery({
    queryKey: [
      'future-dividends',
      QUERY_VERSION,
      user?.id,
      tickers.join(','),
      positionsSignature,
    ],
    queryFn: async (): Promise<FutureDividend[]> => {
      if (!user) return [];

      const orphans = await getLocalOrphanFutureDividends(user.id);
      if (tickers.length === 0 && orphans.length === 0) return [];

      console.group('[useFutureDividends] Buscando futuros proventos');
      console.log('Tickers:', tickers);
      console.log('Posições:', positionsSignature);

      const all: FutureDividend[] = [];

      if (tickers.length > 0) {
        const { data: fnData, error: fnError } = await supabase.functions.invoke(
          'stock-dividends',
          { body: { tickers } },
        );

        if (fnError) {
          console.error('[useFutureDividends] Edge function error:', fnError);
          console.groupEnd();
          throw new Error(fnError.message);
        }

        const dividendsByTicker: Record<string, DividendEvent[]> =
          fnData?.dividends ?? {};

        const { data: txData, error: txError } = await supabase
          .from('stock_transactions')
          .select('operation, quantity, date, ticker')
          .eq('user_id', user.id);

        if (txError) {
          console.error('[useFutureDividends] Erro ao buscar transações:', txError);
          console.groupEnd();
          throw new Error(txError.message);
        }

        const transactions = (txData ?? []) as (StockTransactionLite & {
          ticker: string;
        })[];

        const txByTicker = new Map<string, StockTransactionLite[]>();
        for (const tx of transactions) {
          const key = tx.ticker.toUpperCase();
          if (!txByTicker.has(key)) txByTicker.set(key, []);
          txByTicker.get(key)!.push(tx);
        }

        const currentQtyByTicker = new Map<string, number>();
        for (const s of stocks) {
          currentQtyByTicker.set(s.ticker!.toUpperCase(), s.quantity ?? 0);
        }

        for (const [ticker, dividends] of Object.entries(dividendsByTicker)) {
          const txs = txByTicker.get(ticker) ?? [];
          const currentQty = currentQtyByTicker.get(ticker) ?? 0;
          all.push(
            ...buildFutureDividendsForTicker(ticker, dividends, txs, currentQty),
          );
        }
      }

      const orphanFutureDividends: FutureDividend[] = orphans.map(
        ({ user_id: _userId, ...rest }) => rest,
      );
      const merged = mergeFutureDividends(all, orphanFutureDividends);

      const today = todayInBrazil();
      const { future, due } = splitDueAndFuture(merged, today);

      console.log(
        `Eventos: ${merged.length} · ${future.length} futuros · ${due.length} vencidos (ref. ${today})`,
      );

      if (due.length > 0) {
        try {
          await reconcileDueDividends(user.id, due);
          const orphanIds = new Set(orphans.map((o) => o.id));
          const reconciledOrphanIds = due
            .map((d) => d.id)
            .filter((id) => orphanIds.has(id));
          if (reconciledOrphanIds.length > 0) {
            await deleteLocalOrphanFutureDividends(reconciledOrphanIds);
          }
          queryClient.invalidateQueries({ queryKey: ['dividend-payments'] });
        } catch (err) {
          console.error(
            '[useFutureDividends] Falha ao reconciliar vencidos (retenta no próximo fetch):',
            err,
          );
        }
      }

      console.groupEnd();

      return future.sort((a, b) =>
        a.paymentDate.localeCompare(b.paymentDate),
      );
    },
    enabled: !!user,
    staleTime: 12 * 60 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    gcTime: 0,
  });
}
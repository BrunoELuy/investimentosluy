import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useInvestments } from '@/hooks/useInvestments';
import { supabase } from '@/integrations/supabase/client';
import { saveLocalDividends, isOnline } from '@/lib/offlineDb';

const QUERY_VERSION = 'v5-reconcile-due';

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

// helper puro extraído do queryFn
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
      if (!user || tickers.length === 0) return [];

      console.group('[useFutureDividends] Buscando futuros proventos');
      console.log('Tickers:', tickers);
      console.log('Posições:', positionsSignature);

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

      const all: FutureDividend[] = [];

      for (const [ticker, dividends] of Object.entries(dividendsByTicker)) {
        const txs = txByTicker.get(ticker) ?? [];
        const currentQty = currentQtyByTicker.get(ticker) ?? 0;

        for (const d of dividends) {
          if (!d.paymentDate || d.rate == null) continue;
          if (!d.lastDatePrior && !d.approvedOn) continue;

          const dateCom = (d.lastDatePrior ?? d.approvedOn!).split('T')[0];
          const paymentDate = d.paymentDate.split('T')[0];
          const { type, label } = mapRelatedTo(d.relatedTo);

          // ← Feature 4: usa o helper puro (mesma semântica de antes)
          let qty = calculateQuantityAtDate(txs, dateCom);
          qty = Math.max(0, qty);

          if (qty <= 0 && txs.length === 0 && currentQty > 0) {
            qty = currentQty;
          }

          if (qty <= 0) continue;

          all.push({
            id: `${ticker}-${paymentDate}-${d.rate}-${type}`,
            ticker,
            assetName: d.assetIssued || ticker,
            type,
            typeLabel: label,
            dateCom,
            paymentDate,
            valuePerShare: d.rate,
            quantityOnDateCom: qty,
            totalAmount: qty * d.rate,
          });
        }
      }

      const today = todayInBrazil();
      const { future, due } = splitDueAndFuture(all, today);

      console.log(
        `Eventos: ${all.length} · ${future.length} futuros · ${due.length} vencidos (ref. ${today})`,
      );

      if (due.length > 0) {
        try {
          await reconcileDueDividends(user.id, due);
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
    enabled: !!user && tickers.length > 0,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    gcTime: 0,
  });
}
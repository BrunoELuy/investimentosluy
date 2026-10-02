import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useInvestments } from '@/hooks/useInvestments';
import { supabase } from '@/integrations/supabase/client';

/**
 * Versão do queryKey. Mude isso sempre que trocar a fonte de dados
 * (ex.: Yahoo → Status Invest) para invalidar cache antigo do React Query.
 */
const QUERY_VERSION = 'v3-no-cache';

export interface FutureDividend {
  id: string;
  ticker: string;
  assetName: string;
  type: 'DIVIDENDO' | 'JCP' | 'OUTRO';
  typeLabel: string;
  dateCom: string;      // YYYY-MM-DD (última data para ter direito)
  paymentDate: string;  // YYYY-MM-DD (data de pagamento futura)
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

function mapRelatedTo(raw?: string): { type: FutureDividend['type']; label: string } {
  const v = (raw ?? '').toUpperCase();
  if (v.includes('JCP') || v.includes('JUROS')) return { type: 'JCP', label: 'JCP' };
  if (v.includes('DIVIDEND')) return { type: 'DIVIDENDO', label: 'Dividendo' };
  return { type: 'OUTRO', label: raw ?? 'Provento' };
}

export function useFutureDividends() {
  const { user } = useAuth();
  const { data: investments = [] } = useInvestments();

  const stocks = investments.filter((i) => i.type === 'ACAO' && i.ticker);

  const tickers = Array.from(
    new Set(stocks.map((i) => i.ticker!.toUpperCase()))
  ).sort();

  /**
   * Assinatura das posições atuais: ticker:quantidade.
   * Se qualquer quantidade mudar, a queryKey muda e a query é refeita
   * automaticamente, mesmo sem recarregar a página.
   */
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

      // 1. Chama Edge Function que agrega proventos futuros
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'stock-dividends',
        { body: { tickers } }
      );

      if (fnError) {
        console.error('[useFutureDividends] Edge function error:', fnError);
        console.groupEnd();
        throw new Error(fnError.message);
      }

      const dividendsByTicker: Record<string, DividendEvent[]> =
        fnData?.dividends ?? {};

      // 2. Busca transações do usuário
      const { data: txData, error: txError } = await supabase
        .from('stock_transactions')
        .select('operation, quantity, date, ticker')
        .eq('user_id', user.id);

      if (txError) {
        console.error('[useFutureDividends] Erro ao buscar transações:', txError);
        console.groupEnd();
        throw new Error(txError.message);
      }

      const transactions = (txData ?? []) as (StockTransactionLite & { ticker: string })[];

      const txByTicker = new Map<string, StockTransactionLite[]>();
      for (const tx of transactions) {
        const key = tx.ticker.toUpperCase();
        if (!txByTicker.has(key)) txByTicker.set(key, []);
        txByTicker.get(key)!.push(tx);
      }

      // Fallback: quantidade atual por ticker (usado se não houver transações)
      const currentQtyByTicker = new Map<string, number>();
      for (const s of stocks) {
        currentQtyByTicker.set(s.ticker!.toUpperCase(), s.quantity ?? 0);
      }

      // 3. Calcula quantidade na Data Com
      const result: FutureDividend[] = [];

      for (const [ticker, dividends] of Object.entries(dividendsByTicker)) {
        const txs = txByTicker.get(ticker) ?? [];
        const currentQty = currentQtyByTicker.get(ticker) ?? 0;

        for (const d of dividends) {
          if (!d.paymentDate || d.rate == null) continue;
          if (!d.lastDatePrior && !d.approvedOn) continue;

          const dateCom = (d.lastDatePrior ?? d.approvedOn!).split('T')[0];
          const paymentDate = d.paymentDate.split('T')[0];
          const { type, label } = mapRelatedTo(d.relatedTo);

          // Soma tudo até a Data Com
          let qty = 0;
          for (const tx of txs) {
            if (tx.date > dateCom) continue;
            if (tx.operation === 'BUY') qty += Number(tx.quantity) || 0;
            if (tx.operation === 'SELL') qty -= Number(tx.quantity) || 0;
          }
          qty = Math.max(0, qty);

          // Fallback: se não há transações, usa a posição atual
          if (qty <= 0 && txs.length === 0 && currentQty > 0) {
            qty = currentQty;
          }

          if (qty <= 0) continue;

          result.push({
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

      console.log(`Total de dividendos futuros processados: ${result.length}`);
      console.groupEnd();

      return result.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
    },
    enabled: !!user && tickers.length > 0,
    // Sempre busca fresco ao montar/focar
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    // Descarta o cache assim que o componente desmontar
    gcTime: 0,
  });
}
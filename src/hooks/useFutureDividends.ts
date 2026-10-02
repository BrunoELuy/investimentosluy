import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useInvestments } from '@/hooks/useInvestments';
import { supabase } from '@/integrations/supabase/client';

/**
 * Versão do queryKey. Mude isso sempre que trocar a fonte de dados
 * (ex.: Yahoo → Status Invest) para invalidar cache antigo do React Query.
 */
const QUERY_VERSION = 'v2-status-invest';

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

/**
 * Formato normalizado retornado pela Edge Function `stock-dividends`.
 * A Edge Function é responsável por buscar de fontes externas (Status Invest)
 * e devolver neste formato, independentemente da fonte original.
 */
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

  const tickers = Array.from(
    new Set(
      investments
        .filter((i) => i.type === 'ACAO' && i.ticker)
        .map((i) => i.ticker!.toUpperCase())
    )
  ).sort();

  return useQuery({
    queryKey: ['future-dividends', QUERY_VERSION, user?.id, tickers.join(',')],
    queryFn: async (): Promise<FutureDividend[]> => {
      if (!user || tickers.length === 0) {
        console.log('[useFutureDividends] Sem user ou sem tickers');
        return [];
      }

      console.group('[useFutureDividends] Buscando futuros proventos');
      console.log('Tickers:', tickers);

      // 1. Chama Edge Function que agrega proventos futuros (Status Invest)
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

      console.log('Retorno da edge function:', dividendsByTicker);
      console.log('Erros da Brapi/StatusInvest:', fnData?.errors);

      // 2. Busca todas as transações do usuário de uma vez
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
      console.log(`Total de transações em stock_transactions: ${transactions.length}`);

      // Agrupa por ticker para cálculo em memória
      const txByTicker = new Map<string, StockTransactionLite[]>();
      for (const tx of transactions) {
        const key = tx.ticker.toUpperCase();
        if (!txByTicker.has(key)) txByTicker.set(key, []);
        txByTicker.get(key)!.push(tx);
      }

      // 3. Calcula quantidade na Data Com e monta a lista final
      const result: FutureDividend[] = [];

      for (const [ticker, dividends] of Object.entries(dividendsByTicker)) {
        const txs = txByTicker.get(ticker) ?? [];

        console.log(
          `${ticker}: ${dividends.length} eventos futuros | ${txs.length} transações registradas`
        );

        for (const d of dividends) {
          // Como o Status Invest fornece data ex e data de pagamento reais,
          // exigimos ambos os campos. approvedOn fica como fallback defensivo.
          if (!d.paymentDate || d.rate == null) continue;
          if (!d.lastDatePrior && !d.approvedOn) continue;

          const dateCom = (d.lastDatePrior ?? d.approvedOn!).split('T')[0];
          const paymentDate = d.paymentDate.split('T')[0];
          const { type, label } = mapRelatedTo(d.relatedTo);

          // Soma tudo até a Data Com (inclusive)
          let qty = 0;
          for (const tx of txs) {
            if (tx.date > dateCom) continue;
            if (tx.operation === 'BUY') qty += Number(tx.quantity) || 0;
            if (tx.operation === 'SELL') qty -= Number(tx.quantity) || 0;
          }
          qty = Math.max(0, qty);

          // Ignora posições que não tinham o ativo na Data Com
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
      console.log('Lista final:', result);
      console.groupEnd();

      return result.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
    },
    enabled: !!user && tickers.length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutos (testes)
  });
}
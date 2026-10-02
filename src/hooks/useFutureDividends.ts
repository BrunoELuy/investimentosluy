import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useInvestments } from '@/hooks/useInvestments';
import { supabase } from '@/integrations/supabase/client';

export interface FutureDividend {
    id: string;
    ticker: string;
    assetName: string;
    type: 'DIVIDENDO' | 'JCP' | 'OUTRO';
    typeLabel: string;
    dateCom: string;      // YYYY-MM-DD
    paymentDate: string;  // YYYY-MM-DD
    valuePerShare: number;
    quantityOnDateCom: number;
    totalAmount: number;
}

interface BrapiCashDividend {
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
        queryKey: ['future-dividends', user?.id, tickers.join(',')],
        queryFn: async (): Promise<FutureDividend[]> => {
            if (!user || tickers.length === 0) return [];

            // 1. Chama Edge Function que encapsula a chave da Brapi
            const { data: fnData, error: fnError } = await supabase.functions.invoke(
                'stock-dividends',
                { body: { tickers } }
            );

            if (fnError) {
                console.error('[useFutureDividends] Edge function error:', fnError);
                throw new Error(fnError.message);
            }

            const dividendsByTicker: Record<string, BrapiCashDividend[]> =
                fnData?.dividends ?? {};

            console.log('[useFutureDividends] Retorno da edge:', dividendsByTicker);

            // 2. Busca todas as transações do usuário de uma vez (uma única query)
            const { data: txData, error: txError } = await supabase
                .from('stock_transactions')
                .select('operation, quantity, date, ticker')
                .eq('user_id', user.id);

            if (txError) {
                console.error('[useFutureDividends] Erro ao buscar transações:', txError);
                throw new Error(txError.message);
            }

            const transactions = (txData ?? []) as (StockTransactionLite & { ticker: string })[];

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

                for (const d of dividends) {
                    if (!d.paymentDate || d.rate == null) continue;

                    const dateCom = (d.lastDatePrior ?? d.approvedOn ?? new Date().toISOString()).split('T')[0];
                    const paymentDate = d.paymentDate.split('T')[0];
                    const { type, label } = mapRelatedTo(d.relatedTo);

                    // Soma tudo até a dataCom (inclusive)
                    let qty = 0;
                    for (const tx of txs) {
                        if (tx.date > dateCom) continue;
                        if (tx.operation === 'BUY') qty += Number(tx.quantity) || 0;
                        if (tx.operation === 'SELL') qty -= Number(tx.quantity) || 0;
                    }
                    qty = Math.max(0, qty);

                    // Ignora posições que não tinham o ativo na data com
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

            return result.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
        },
        enabled: !!user && tickers.length > 0,
        staleTime: 1000 * 60 * 60 * 6,
    });
}
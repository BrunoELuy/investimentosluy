import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QUOTE_TTL_MS, isTradingHours } from '../../supabase/functions/_shared/cacheRules';

export interface StockQuote {
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  marketCap?: number;
  shortName?: string;
  updatedAt: string;
}

const CACHE_KEY = 'stock_quotes_cache';

function loadCache(): Record<string, StockQuote> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {}
  return {};
}

function saveCache(quotes: Record<string, StockQuote>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(quotes));
  } catch {}
}

export function useStockQuotes(tickers: string[]) {
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>(loadCache);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const validTickers = tickers.filter(t => t && t.trim().length > 0);
  const key = validTickers.join(',');

  const doFetch = useCallback(async (force: boolean) => {
    if (validTickers.length === 0) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stock-quotes', {
        body: { tickers: validTickers, force },
      });
      if (error) throw error;
      if (data?.quotes) {
        setQuotes(prev => {
          const merged = { ...prev, ...data.quotes };
          saveCache(merged);
          return merged;
        });
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching stock quotes:', err);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (validTickers.length === 0) return;
    doFetch(false);
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && isTradingHours(new Date())) doFetch(false);
    }, QUOTE_TTL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible' && isTradingHours(new Date())) doFetch(false);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doFetch]);

  const refetch = useCallback(() => doFetch(true), [doFetch]);
  return { quotes, isLoading, lastUpdated, refetch };
}

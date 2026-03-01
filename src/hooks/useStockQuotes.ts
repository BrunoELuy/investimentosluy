import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StockQuote {
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  marketCap?: number;
  shortName?: string;
  updatedAt: string;
}

const REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const validTickers = tickers.filter(t => t && t.trim().length > 0);

  const fetchQuotes = useCallback(async () => {
    if (validTickers.length === 0) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stock-quotes', {
        body: { tickers: validTickers },
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
  }, [validTickers.join(',')]);

  // Fetch on mount and set interval
  useEffect(() => {
    if (validTickers.length === 0) return;

    fetchQuotes();

    intervalRef.current = setInterval(fetchQuotes, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchQuotes]);

  return { quotes, isLoading, lastUpdated, refetch: fetchQuotes };
}

import { createClient } from 'npm:@supabase/supabase-js@2';

export type CacheKind = 'quote' | 'dividends';
export interface CacheRow { ticker: string; payload: unknown; fetched_at: string }

const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

export async function readCache(kind: CacheKind, tickers: string[]): Promise<Map<string, CacheRow>> {
  const map = new Map<string, CacheRow>();
  try {
    const { data, error } = await admin()
      .from('market_cache').select('ticker, payload, fetched_at')
      .eq('kind', kind).in('ticker', tickers);
    if (error) throw error;
    for (const r of data ?? []) map.set(r.ticker, r as CacheRow);
  } catch (e) {
    console.error('market_cache read failed', e);
  }
  return map;
}

export async function writeCache(kind: CacheKind, rows: { ticker: string; payload: unknown }[]) {
  if (!rows.length) return;
  const now = new Date().toISOString();
  const { error } = await admin().from('market_cache')
    .upsert(rows.map((r) => ({ ...r, kind, fetched_at: now })), { onConflict: 'ticker,kind' });
  if (error) console.error('market_cache write failed', error);
}

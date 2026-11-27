// Pure cache rules shared by edge functions and the app (no Deno/browser globals).
export const QUOTE_TTL_MS = 15 * 60 * 1000;
export const DIVIDENDS_TTL_MS = 12 * 60 * 60 * 1000;
export const MANUAL_MIN_INTERVAL_MS = 60 * 1000;

/** B3 trading window in Brasília time (UTC-3): Mon–Fri, 10:00–18:00. */
export function isTradingHours(now: Date): boolean {
  const br = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const day = br.getUTCDay();
  if (day === 0 || day === 6) return false;
  const h = br.getUTCHours();
  return h >= 10 && h < 18;
}

export function isFresh(fetchedAt: string | Date, ttlMs: number, now: Date): boolean {
  return now.getTime() - new Date(fetchedAt).getTime() < ttlMs;
}

/** Quotes: fresh within TTL, or any cached value outside trading hours. */
export function isQuoteUsable(fetchedAt: string | Date, now: Date, force = false): boolean {
  if (force) return isFresh(fetchedAt, MANUAL_MIN_INTERVAL_MS, now);
  if (!isTradingHours(now)) return true;
  return isFresh(fetchedAt, QUOTE_TTL_MS, now);
}

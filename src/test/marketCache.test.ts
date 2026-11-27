import { describe, it, expect } from 'vitest';
import { isTradingHours, isFresh, isQuoteUsable, QUOTE_TTL_MS, DIVIDENDS_TTL_MS } from '../../supabase/functions/_shared/cacheRules';

// Tue 2026-11-24 14:00 UTC = 11:00 Brasília
const trading = new Date('2026-11-24T14:00:00Z');
const ago = (d: Date, ms: number) => new Date(d.getTime() - ms);

describe('market cache rules', () => {
  it('pregão: seg–sex 10h–18h Brasília', () => {
    expect(isTradingHours(trading)).toBe(true);
    expect(isTradingHours(new Date('2026-11-24T12:59:00Z'))).toBe(false); // 09:59
    expect(isTradingHours(new Date('2026-11-24T21:00:00Z'))).toBe(false); // 18:00
    expect(isTradingHours(new Date('2026-11-28T14:00:00Z'))).toBe(false); // sábado
  });
  it('cotação vale 15 min no pregão', () => {
    expect(QUOTE_TTL_MS).toBe(15 * 60 * 1000);
    expect(isQuoteUsable(ago(trading, 14 * 60e3), trading)).toBe(true);
    expect(isQuoteUsable(ago(trading, 16 * 60e3), trading)).toBe(false);
  });
  it('fora do pregão usa cache antigo', () => {
    const sat = new Date('2026-11-28T14:00:00Z');
    expect(isQuoteUsable(ago(sat, 24 * 3600e3), sat)).toBe(true);
  });
  it('manual: mínimo 1 min entre buscas reais', () => {
    expect(isQuoteUsable(ago(trading, 30e3), trading, true)).toBe(true);
    expect(isQuoteUsable(ago(trading, 61e3), trading, true)).toBe(false);
  });
  it('proventos valem 12 h', () => {
    expect(isFresh(ago(trading, 11 * 3600e3), DIVIDENDS_TTL_MS, trading)).toBe(true);
    expect(isFresh(ago(trading, 13 * 3600e3), DIVIDENDS_TTL_MS, trading)).toBe(false);
  });
});

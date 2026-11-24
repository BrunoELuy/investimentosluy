# AGENTS.md

## Rules

- Future dividends come from the StatusInvest endpoint (`acao/companytickerprovents?ticker=X&chartProventsType=2`), not Brapi, because the free Brapi plan paywalls dividend data; the Edge Function `stock-dividends` normalizes the response into the `DividendEvent` shape the app already consumes, so the frontend never depends on the external source's field names.
- The StatusInvest payload is unofficial and subject to change; `stock-dividends` must fail per-ticker (collecting errors, still returning successful tickers) so one broken scrape cannot blank out the whole proventos view.
- Stock quotes and future dividends are cached server-side in `market_cache` (one row per ticker+kind, written only by edge functions with the service role) so external API calls scale with distinct tickers, not users; TTL/trading-hour rules live in `supabase/functions/_shared/cacheRules.ts`, shared by functions, the app and tests.

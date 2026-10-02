# AGENTS.md

## Rules

- Future dividends come from the StatusInvest endpoint (`acao/companytickerprovents?ticker=X&chartProventsType=2`), not Brapi, because the free Brapi plan paywalls dividend data; the Edge Function `stock-dividends` normalizes the response into the `DividendEvent` shape the app already consumes, so the frontend never depends on the external source's field names.
- The StatusInvest payload is unofficial and subject to change; `stock-dividends` must fail per-ticker (collecting errors, still returning successful tickers) so one broken scrape cannot blank out the whole proventos view.

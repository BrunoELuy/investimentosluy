CREATE TABLE public.market_cache (
  ticker text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('quote','dividends')),
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ticker, kind)
);
GRANT SELECT ON public.market_cache TO authenticated;
GRANT ALL ON public.market_cache TO service_role;
ALTER TABLE public.market_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read market cache" ON public.market_cache FOR SELECT TO authenticated USING (true);
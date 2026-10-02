CREATE TABLE IF NOT EXISTS public.stock_transactions (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  date DATE NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('BUY', 'SELL')),
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC,
  total_value NUMERIC,
  source TEXT DEFAULT 'B3_IMPORT',
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_stock_transactions_user_ticker_date
  ON public.stock_transactions(user_id, ticker, date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_transactions TO authenticated;
GRANT ALL ON public.stock_transactions TO service_role;

ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stock transactions"
  ON public.stock_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stock transactions"
  ON public.stock_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stock transactions"
  ON public.stock_transactions FOR DELETE
  USING (auth.uid() = user_id);
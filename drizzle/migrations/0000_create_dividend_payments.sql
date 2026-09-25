CREATE TABLE IF NOT EXISTS public.dividend_payments (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  ticker TEXT NOT NULL,
  asset_name TEXT,
  type TEXT NOT NULL,
  type_label TEXT,
  institution TEXT,
  quantity NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_dividend_payments_user_id
  ON public.dividend_payments(user_id);

CREATE INDEX IF NOT EXISTS idx_dividend_payments_user_ticker
  ON public.dividend_payments(user_id, ticker);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dividend_payments TO authenticated;
GRANT ALL ON public.dividend_payments TO service_role;

ALTER TABLE public.dividend_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dividends"
  ON public.dividend_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dividends"
  ON public.dividend_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dividends"
  ON public.dividend_payments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own dividends"
  ON public.dividend_payments FOR DELETE
  USING (auth.uid() = user_id);
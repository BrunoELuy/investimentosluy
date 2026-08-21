ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_value numeric,
  ADD COLUMN IF NOT EXISTS b3_source text;

CREATE TABLE IF NOT EXISTS public.b3_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  imported_at timestamptz NOT NULL DEFAULT now(),
  report_type text NOT NULL,
  file_name text,
  row_count integer NOT NULL DEFAULT 0,
  mismatch_count integer NOT NULL DEFAULT 0,
  summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.b3_imports TO authenticated;
GRANT ALL ON public.b3_imports TO service_role;

ALTER TABLE public.b3_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own b3 imports" ON public.b3_imports;
CREATE POLICY "Users manage their own b3 imports" ON public.b3_imports
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS b3_imports_user_idx ON public.b3_imports (user_id, imported_at DESC);
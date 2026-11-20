-- 1. Adiciona coluna `source` para distinguir origem
--    (manual | auto | b3_import). Default 'manual' preserva o comportamento atual.
ALTER TABLE public.dividend_payments
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

-- 2. Índice para consultas futuras (ex.: filtrar só auto na Feature 5)
CREATE INDEX IF NOT EXISTS idx_dividend_payments_user_source
  ON public.dividend_payments (user_id, source);

-- 3. (Verificação) A constraint composta já deve existir pelo upsert atual.
--    Se por algum motivo não existir, roda o bloco abaixo:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.dividend_payments'::regclass
       AND contype = 'u'
       AND conname LIKE '%user_id%id%'
  ) THEN
    ALTER TABLE public.dividend_payments
      ADD CONSTRAINT dividend_payments_user_id_id_key UNIQUE (user_id, id);
  END IF;
END $$;
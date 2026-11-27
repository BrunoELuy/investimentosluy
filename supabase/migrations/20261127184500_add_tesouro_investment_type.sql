-- Allow 'TESOURO' investment type and 'SELIC' rate_type for Tesouro Direto
ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS check_valid_type;
ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS investments_type_check;

ALTER TABLE public.investments ADD CONSTRAINT check_valid_type
  CHECK (type IN ('CDB', 'LCA', 'TESOURO', 'ACAO'));

ALTER TABLE public.investments ADD CONSTRAINT investments_type_check
  CHECK (type IN ('CDB', 'LCA', 'TESOURO', 'ACAO'));

ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS check_valid_rate_type;
ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS investments_rate_type_check;

ALTER TABLE public.investments ADD CONSTRAINT check_valid_rate_type
  CHECK (rate_type IN ('CDI', 'SELIC', 'IPCA', 'PREFIXADO', 'NONE'));

ALTER TABLE public.investments ADD CONSTRAINT investments_rate_type_check
  CHECK (rate_type IN ('CDI', 'SELIC', 'IPCA', 'PREFIXADO', 'NONE'));

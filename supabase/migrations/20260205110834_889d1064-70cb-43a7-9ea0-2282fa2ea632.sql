-- Update the check constraint to allow 'NONE' rate_type for stocks
ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS check_valid_rate_type;

ALTER TABLE public.investments ADD CONSTRAINT check_valid_rate_type 
  CHECK (rate_type IN ('CDI', 'IPCA', 'PREFIXADO', 'NONE'));
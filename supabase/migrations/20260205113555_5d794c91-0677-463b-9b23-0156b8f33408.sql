-- Update the rate_type check constraint to include 'NONE'
ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS investments_rate_type_check;

ALTER TABLE public.investments ADD CONSTRAINT investments_rate_type_check 
  CHECK (rate_type IN ('CDI', 'IPCA', 'PREFIXADO', 'NONE'));
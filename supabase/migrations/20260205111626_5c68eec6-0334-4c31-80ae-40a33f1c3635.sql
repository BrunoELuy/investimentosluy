-- Update the check constraint to allow 'ACAO' investment type
ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS check_valid_type;

ALTER TABLE public.investments ADD CONSTRAINT check_valid_type 
  CHECK (type IN ('CDB', 'LCA', 'ACAO'));
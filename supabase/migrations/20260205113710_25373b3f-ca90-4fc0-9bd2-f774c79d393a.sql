-- Update the type check constraint to include 'ACAO'
ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS investments_type_check;

ALTER TABLE public.investments ADD CONSTRAINT investments_type_check 
  CHECK (type IN ('CDB', 'LCA', 'ACAO'));
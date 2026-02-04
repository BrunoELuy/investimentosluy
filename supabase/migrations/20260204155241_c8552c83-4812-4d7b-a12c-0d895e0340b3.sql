-- Add stock-specific columns to investments table
ALTER TABLE public.investments 
ADD COLUMN IF NOT EXISTS ticker text,
ADD COLUMN IF NOT EXISTS quantity numeric;

-- Add comment for clarity
COMMENT ON COLUMN public.investments.ticker IS 'Stock ticker symbol (e.g., BBSE3) - only for ACAO type';
COMMENT ON COLUMN public.investments.quantity IS 'Number of shares/papers - only for ACAO type';
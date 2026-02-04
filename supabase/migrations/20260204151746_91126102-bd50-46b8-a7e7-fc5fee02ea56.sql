-- Create table for stock investments
CREATE TABLE public.stock_investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  ticker TEXT,
  amount NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_investments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own stocks"
ON public.stock_investments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stocks"
ON public.stock_investments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stocks"
ON public.stock_investments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stocks"
ON public.stock_investments
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_stock_investments_updated_at
BEFORE UPDATE ON public.stock_investments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
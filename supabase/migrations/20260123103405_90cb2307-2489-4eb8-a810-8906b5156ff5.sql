-- Create table for investment deposits (multiple contributions)
CREATE TABLE public.investment_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  deposit_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.investment_deposits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own deposits"
ON public.investment_deposits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deposits"
ON public.investment_deposits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deposits"
ON public.investment_deposits
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deposits"
ON public.investment_deposits
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_investment_deposits_updated_at
BEFORE UPDATE ON public.investment_deposits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_investment_deposits_investment_id ON public.investment_deposits(investment_id);
CREATE INDEX idx_investment_deposits_user_id ON public.investment_deposits(user_id);
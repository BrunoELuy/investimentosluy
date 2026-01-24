-- Add CHECK constraints for investments table
ALTER TABLE public.investments 
ADD CONSTRAINT check_positive_initial_value CHECK (initial_value > 0);

ALTER TABLE public.investments 
ADD CONSTRAINT check_positive_rate_value CHECK (rate_value >= 0);

ALTER TABLE public.investments 
ADD CONSTRAINT check_date_order CHECK (end_date > start_date);

ALTER TABLE public.investments 
ADD CONSTRAINT check_institution_length CHECK (char_length(institution) <= 200);

ALTER TABLE public.investments 
ADD CONSTRAINT check_name_length CHECK (char_length(name) <= 200);

ALTER TABLE public.investments 
ADD CONSTRAINT check_notes_length CHECK (notes IS NULL OR char_length(notes) <= 1000);

ALTER TABLE public.investments 
ADD CONSTRAINT check_valid_type CHECK (type IN ('CDB', 'LCA'));

ALTER TABLE public.investments 
ADD CONSTRAINT check_valid_rate_type CHECK (rate_type IN ('CDI', 'IPCA', 'PREFIXADO'));

-- Add CHECK constraints for investment_deposits table
ALTER TABLE public.investment_deposits 
ADD CONSTRAINT check_positive_amount CHECK (amount > 0);

ALTER TABLE public.investment_deposits 
ADD CONSTRAINT check_deposit_notes_length CHECK (notes IS NULL OR char_length(notes) <= 1000);
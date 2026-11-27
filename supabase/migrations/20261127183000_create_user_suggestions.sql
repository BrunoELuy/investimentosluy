-- Create table for user feature/fix suggestions
CREATE TABLE public.user_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT,
  type TEXT NOT NULL CHECK (type IN ('FEATURE', 'FIX')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NAO_INICIADO' CHECK (status IN ('NAO_INICIADO', 'EM_ANDAMENTO', 'CONCLUIDO')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can view their own suggestions; admin can view all
CREATE POLICY "Users view own suggestions or admin views all"
ON public.user_suggestions
FOR SELECT
USING (
  auth.uid() = user_id
  OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'brunoluy.e10@gmail.com'
);

-- Any authenticated user can create a suggestion for themselves
CREATE POLICY "Users can create their own suggestions"
ON public.user_suggestions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only admin can update suggestions (status triage)
CREATE POLICY "Only admin can update suggestions"
ON public.user_suggestions
FOR UPDATE
USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'brunoluy.e10@gmail.com')
WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'brunoluy.e10@gmail.com');

-- Only admin can delete suggestions
CREATE POLICY "Only admin can delete suggestions"
ON public.user_suggestions
FOR DELETE
USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'brunoluy.e10@gmail.com');

-- Trigger for updated_at
CREATE TRIGGER update_user_suggestions_updated_at
BEFORE UPDATE ON public.user_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

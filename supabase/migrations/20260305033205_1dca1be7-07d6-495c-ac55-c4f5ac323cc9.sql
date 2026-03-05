
CREATE TABLE public.saved_tax_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_tax_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved responses"
  ON public.saved_tax_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved responses"
  ON public.saved_tax_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved responses"
  ON public.saved_tax_responses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

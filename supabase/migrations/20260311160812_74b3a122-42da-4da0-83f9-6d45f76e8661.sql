
CREATE TABLE public.investment_watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT,
  notes TEXT,
  target_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.investment_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view watchlist" ON public.investment_watchlist
  FOR SELECT TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can insert watchlist" ON public.investment_watchlist
  FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can update watchlist" ON public.investment_watchlist
  FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete watchlist" ON public.investment_watchlist
  FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

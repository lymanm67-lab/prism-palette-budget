
ALTER TABLE public.investment_watchlist
  ADD COLUMN current_price NUMERIC,
  ADD COLUMN price_updated_at TIMESTAMP WITH TIME ZONE;


ALTER TABLE public.investment_watchlist
  ADD COLUMN alert_sent BOOLEAN NOT NULL DEFAULT false;

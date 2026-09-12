-- ============ SHARED MARKET DATA (service-written only) ============

CREATE TABLE public.se_market_data_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  interval TEXT NOT NULL,
  datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  open NUMERIC(18,6) NOT NULL,
  high NUMERIC(18,6) NOT NULL,
  low NUMERIC(18,6) NOT NULL,
  close NUMERIC(18,6) NOT NULL,
  volume NUMERIC(20,2) NOT NULL DEFAULT 0,
  provider TEXT NOT NULL DEFAULT 'TWELVE_DATA',
  is_final BOOLEAN NOT NULL DEFAULT true,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (provider, symbol, interval, datetime)
);
CREATE INDEX idx_se_cache_lookup ON public.se_market_data_cache (symbol, interval, datetime DESC);

GRANT SELECT ON public.se_market_data_cache TO authenticated;
GRANT ALL ON public.se_market_data_cache TO service_role;
ALTER TABLE public.se_market_data_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can read market candles"
  ON public.se_market_data_cache FOR SELECT TO authenticated USING (true);

CREATE TABLE public.se_market_symbols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT,
  asset_type TEXT NOT NULL DEFAULT 'stock',
  exchange TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  in_curated_universe BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.se_market_symbols TO authenticated;
GRANT ALL ON public.se_market_symbols TO service_role;
ALTER TABLE public.se_market_symbols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can read symbols"
  ON public.se_market_symbols FOR SELECT TO authenticated USING (true);

CREATE TABLE public.se_api_provider_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE DEFAULT 'TWELVE_DATA',
  connection_status TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  last_error_at TIMESTAMP WITH TIME ZONE,
  credits_used_reported INTEGER,
  credits_left_reported INTEGER,
  minute_window_started_at TIMESTAMP WITH TIME ZONE,
  minute_requests INTEGER NOT NULL DEFAULT 0,
  day_window_date DATE,
  day_requests INTEGER NOT NULL DEFAULT 0,
  cache_hits INTEGER NOT NULL DEFAULT 0,
  cache_misses INTEGER NOT NULL DEFAULT 0,
  failed_requests INTEGER NOT NULL DEFAULT 0,
  rate_limit_events INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  supports_earnings BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.se_api_provider_status TO authenticated;
GRANT ALL ON public.se_api_provider_status TO service_role;
ALTER TABLE public.se_api_provider_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can read provider status"
  ON public.se_api_provider_status FOR SELECT TO authenticated USING (true);

INSERT INTO public.se_api_provider_status (provider) VALUES ('TWELVE_DATA');

-- ============ HOUSEHOLD-SCOPED TRADING DATA ============

CREATE TABLE public.se_trading_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  data_mode TEXT NOT NULL DEFAULT 'DEMO',
  api_provider TEXT NOT NULL DEFAULT 'TWELVE_DATA',
  api_minute_limit INTEGER NOT NULL DEFAULT 8,
  api_daily_limit INTEGER NOT NULL DEFAULT 800,
  trading_capital NUMERIC(14,2) NOT NULL DEFAULT 5000,
  risk_per_trade_pct NUMERIC(6,3) NOT NULL DEFAULT 1,
  max_portfolio_risk_pct NUMERIC(6,3) NOT NULL DEFAULT 5,
  advanced_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (household_id)
);

CREATE TABLE public.se_watchlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_universe BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.se_watchlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  watchlist_id UUID NOT NULL REFERENCES public.se_watchlists(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (watchlist_id, symbol)
);

CREATE TABLE public.se_trade_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  setup_type TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  verdict TEXT,
  swingedge_score NUMERIC(6,2),
  planned_entry NUMERIC(18,6) NOT NULL,
  planned_stop NUMERIC(18,6) NOT NULL,
  planned_target NUMERIC(18,6) NOT NULL,
  shares INTEGER,
  position_value NUMERIC(14,2),
  risk_per_share NUMERIC(18,6),
  dollar_risk NUMERIC(14,2),
  potential_gain NUMERIC(14,2),
  reward_risk NUMERIC(8,3),
  why_qualifies TEXT,
  invalidation TEXT,
  score_breakdown JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.se_paper_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  trade_plan_id UUID REFERENCES public.se_trade_plans(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  setup_type TEXT,
  entry_price NUMERIC(18,6) NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  stop_price NUMERIC(18,6) NOT NULL,
  target_price NUMERIC(18,6) NOT NULL,
  shares INTEGER NOT NULL,
  initial_dollar_risk NUMERIC(14,2),
  exit_price NUMERIC(18,6),
  exit_date DATE,
  exit_reason TEXT,
  realized_pl NUMERIC(14,2),
  rules_followed BOOLEAN,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.se_journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  paper_trade_id UUID REFERENCES public.se_paper_trades(id) ON DELETE CASCADE,
  symbol TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT,
  what_i_planned TEXT,
  what_happened TEXT,
  mistakes TEXT,
  lessons TEXT,
  rules_followed BOOLEAN,
  rating INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.se_backtests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  symbols TEXT[] NOT NULL DEFAULT '{}',
  interval TEXT NOT NULL DEFAULT '1day',
  start_date DATE,
  end_date DATE,
  settings JSONB,
  results JSONB,
  trades JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.se_academy_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  lesson_key TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  quiz_score NUMERIC(6,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_key)
);

-- Grants, RLS and policies for household tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_trading_settings TO authenticated;
GRANT ALL ON public.se_trading_settings TO service_role;
ALTER TABLE public.se_trading_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage trading settings" ON public.se_trading_settings
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_watchlists TO authenticated;
GRANT ALL ON public.se_watchlists TO service_role;
ALTER TABLE public.se_watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage watchlists" ON public.se_watchlists
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_watchlist_items TO authenticated;
GRANT ALL ON public.se_watchlist_items TO service_role;
ALTER TABLE public.se_watchlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage watchlist items" ON public.se_watchlist_items
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_trade_plans TO authenticated;
GRANT ALL ON public.se_trade_plans TO service_role;
ALTER TABLE public.se_trade_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage trade plans" ON public.se_trade_plans
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_paper_trades TO authenticated;
GRANT ALL ON public.se_paper_trades TO service_role;
ALTER TABLE public.se_paper_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage paper trades" ON public.se_paper_trades
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_journal_entries TO authenticated;
GRANT ALL ON public.se_journal_entries TO service_role;
ALTER TABLE public.se_journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage journal entries" ON public.se_journal_entries
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_backtests TO authenticated;
GRANT ALL ON public.se_backtests TO service_role;
ALTER TABLE public.se_backtests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage backtests" ON public.se_backtests
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_academy_progress TO authenticated;
GRANT ALL ON public.se_academy_progress TO service_role;
ALTER TABLE public.se_academy_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage academy progress" ON public.se_academy_progress
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

-- updated_at triggers
CREATE TRIGGER trg_se_market_data_cache_updated BEFORE UPDATE ON public.se_market_data_cache FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_se_market_symbols_updated BEFORE UPDATE ON public.se_market_symbols FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_se_api_provider_status_updated BEFORE UPDATE ON public.se_api_provider_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_se_trading_settings_updated BEFORE UPDATE ON public.se_trading_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_se_watchlists_updated BEFORE UPDATE ON public.se_watchlists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_se_watchlist_items_updated BEFORE UPDATE ON public.se_watchlist_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_se_trade_plans_updated BEFORE UPDATE ON public.se_trade_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_se_paper_trades_updated BEFORE UPDATE ON public.se_paper_trades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_se_journal_entries_updated BEFORE UPDATE ON public.se_journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_se_backtests_updated BEFORE UPDATE ON public.se_backtests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_se_academy_progress_updated BEFORE UPDATE ON public.se_academy_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed curated universe (~25 highly liquid US stocks and ETFs)
INSERT INTO public.se_market_symbols (symbol, name, asset_type, exchange, in_curated_universe) VALUES
  ('SPY','SPDR S&P 500 ETF Trust','etf','NYSE',true),
  ('QQQ','Invesco QQQ Trust','etf','NASDAQ',true),
  ('DIA','SPDR Dow Jones Industrial Average ETF','etf','NYSE',true),
  ('IWM','iShares Russell 2000 ETF','etf','NYSE',true),
  ('XLF','Financial Select Sector SPDR Fund','etf','NYSE',true),
  ('XLE','Energy Select Sector SPDR Fund','etf','NYSE',true),
  ('XLK','Technology Select Sector SPDR Fund','etf','NYSE',true),
  ('XLV','Health Care Select Sector SPDR Fund','etf','NYSE',true),
  ('AAPL','Apple Inc.','stock','NASDAQ',true),
  ('MSFT','Microsoft Corporation','stock','NASDAQ',true),
  ('AMZN','Amazon.com Inc.','stock','NASDAQ',true),
  ('GOOGL','Alphabet Inc. Class A','stock','NASDAQ',true),
  ('META','Meta Platforms Inc.','stock','NASDAQ',true),
  ('NVDA','NVIDIA Corporation','stock','NASDAQ',true),
  ('AMD','Advanced Micro Devices Inc.','stock','NASDAQ',true),
  ('TSLA','Tesla Inc.','stock','NASDAQ',true),
  ('JPM','JPMorgan Chase & Co.','stock','NYSE',true),
  ('BAC','Bank of America Corporation','stock','NYSE',true),
  ('V','Visa Inc.','stock','NYSE',true),
  ('UNH','UnitedHealth Group Inc.','stock','NYSE',true),
  ('JNJ','Johnson & Johnson','stock','NYSE',true),
  ('PG','Procter & Gamble Company','stock','NYSE',true),
  ('HD','Home Depot Inc.','stock','NYSE',true),
  ('COST','Costco Wholesale Corporation','stock','NASDAQ',true),
  ('WMT','Walmart Inc.','stock','NYSE',true),
  ('DIS','Walt Disney Company','stock','NYSE',true);
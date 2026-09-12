ALTER TABLE public.se_trade_plans
  ADD COLUMN IF NOT EXISTS stop_strategy text NOT NULL DEFAULT 'STRUCTURE',
  ADD COLUMN IF NOT EXISTS structure_level numeric,
  ADD COLUMN IF NOT EXISTS atr_value numeric,
  ADD COLUMN IF NOT EXISTS atr_multiple numeric,
  ADD COLUMN IF NOT EXISTS stop_buffer_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stop_quality text,
  ADD COLUMN IF NOT EXISTS why_stop_here text,
  ADD COLUMN IF NOT EXISTS target_method text,
  ADD COLUMN IF NOT EXISTS earnings_reviewed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_reason text;

ALTER TABLE public.se_paper_trades
  ADD COLUMN IF NOT EXISTS original_stop numeric,
  ADD COLUMN IF NOT EXISTS original_target numeric,
  ADD COLUMN IF NOT EXISTS original_shares integer,
  ADD COLUMN IF NOT EXISTS original_risk numeric,
  ADD COLUMN IF NOT EXISTS invalidation text,
  ADD COLUMN IF NOT EXISTS stop_strategy text,
  ADD COLUMN IF NOT EXISTS trailing_method text,
  ADD COLUMN IF NOT EXISTS breakeven_trigger text,
  ADD COLUMN IF NOT EXISTS earnings_ack boolean NOT NULL DEFAULT false;

ALTER TABLE public.se_journal_entries
  ADD COLUMN IF NOT EXISTS original_stop numeric,
  ADD COLUMN IF NOT EXISTS final_stop numeric,
  ADD COLUMN IF NOT EXISTS stop_strategy text,
  ADD COLUMN IF NOT EXISTS why_stop_selected text,
  ADD COLUMN IF NOT EXISTS invalidation_thesis text,
  ADD COLUMN IF NOT EXISTS stop_moved boolean,
  ADD COLUMN IF NOT EXISTS why_stop_moved text,
  ADD COLUMN IF NOT EXISTS widened_stop boolean,
  ADD COLUMN IF NOT EXISTS followed_stop_rule boolean,
  ADD COLUMN IF NOT EXISTS original_risk numeric,
  ADD COLUMN IF NOT EXISTS final_risk numeric,
  ADD COLUMN IF NOT EXISTS result_r numeric,
  ADD COLUMN IF NOT EXISTS gap_affected boolean,
  ADD COLUMN IF NOT EXISTS risk_lesson text;

CREATE TABLE IF NOT EXISTS public.se_stop_modifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  paper_trade_id uuid NOT NULL REFERENCES public.se_paper_trades(id) ON DELETE CASCADE,
  old_stop numeric NOT NULL,
  new_stop numeric NOT NULL,
  method text,
  reason text NOT NULL,
  risk_before numeric,
  risk_after numeric,
  widened boolean NOT NULL DEFAULT false,
  rule_followed boolean,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_stop_modifications TO authenticated;
GRANT ALL ON public.se_stop_modifications TO service_role;

ALTER TABLE public.se_stop_modifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members manage stop modifications"
ON public.se_stop_modifications FOR ALL TO authenticated
USING (public.is_household_member(auth.uid(), household_id))
WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE INDEX IF NOT EXISTS se_stop_modifications_trade_idx
  ON public.se_stop_modifications (paper_trade_id, created_at DESC);
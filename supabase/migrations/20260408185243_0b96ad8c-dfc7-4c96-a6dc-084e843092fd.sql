
-- Add cooling-off columns to guardrail_settings
ALTER TABLE public.guardrail_settings
  ADD COLUMN cooling_off_threshold numeric DEFAULT NULL,
  ADD COLUMN cooling_off_hours integer NOT NULL DEFAULT 48,
  ADD COLUMN multi_use_check_enabled boolean NOT NULL DEFAULT false;

-- Create pending purchases table
CREATE TABLE public.guardrail_pending_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  multi_use_score integer DEFAULT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '48 hours'),
  resolved_at timestamp with time zone DEFAULT NULL
);

ALTER TABLE public.guardrail_pending_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view pending purchases"
  ON public.guardrail_pending_purchases FOR SELECT
  TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can insert pending purchases"
  ON public.guardrail_pending_purchases FOR INSERT
  TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can update pending purchases"
  ON public.guardrail_pending_purchases FOR UPDATE
  TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete pending purchases"
  ON public.guardrail_pending_purchases FOR DELETE
  TO authenticated
  USING (is_household_member(auth.uid(), household_id));

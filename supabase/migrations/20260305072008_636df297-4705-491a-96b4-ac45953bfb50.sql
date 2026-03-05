
-- Fix security definer view - recreate as security invoker
DROP VIEW IF EXISTS public.plaid_items_safe;
CREATE VIEW public.plaid_items_safe 
  WITH (security_invoker = true)
  AS SELECT id, household_id, plaid_item_id, institution_id, institution_name, 
         status, consent_expiration, created_at, updated_at
  FROM public.plaid_items;

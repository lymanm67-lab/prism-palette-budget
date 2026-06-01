
ALTER TABLE public.recurring_transactions
  ADD COLUMN IF NOT EXISTS business_split_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS business_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.recurring_transactions
  DROP CONSTRAINT IF EXISTS recurring_business_split_pct_range;
ALTER TABLE public.recurring_transactions
  ADD CONSTRAINT recurring_business_split_pct_range
    CHECK (business_split_pct >= 0 AND business_split_pct <= 100);

-- Replace the advance trigger function so it also auto-creates transaction_splits
-- when a posted transaction matches a split recurring bill.
CREATE OR REPLACE FUNCTION public.advance_recurring_next_due_date()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  biz_amt numeric;
  pers_amt numeric;
BEGIN
  FOR rec IN
    SELECT id, frequency, next_due_date, end_date, category_id,
           business_split_pct, business_category_id
    FROM public.recurring_transactions
    WHERE household_id = NEW.household_id
      AND is_active = true
      AND account_id = NEW.account_id
      AND ABS(amount - NEW.amount) < 0.01
      AND next_due_date <= NEW.date
      AND (merchant IS NULL OR NEW.merchant IS NULL OR LOWER(TRIM(merchant)) = LOWER(TRIM(NEW.merchant)))
  LOOP
    -- Auto-split the posted transaction if the recurring template defines a split
    IF rec.business_split_pct > 0 AND rec.business_split_pct < 100
       AND rec.business_category_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.transaction_splits WHERE transaction_id = NEW.id)
    THEN
      biz_amt  := ROUND(NEW.amount * (rec.business_split_pct / 100.0), 2);
      pers_amt := NEW.amount - biz_amt;
      INSERT INTO public.transaction_splits (transaction_id, category_id, amount, notes)
      VALUES
        (NEW.id, rec.business_category_id, biz_amt,  'Auto split from recurring bill (business)'),
        (NEW.id, rec.category_id,          pers_amt, 'Auto split from recurring bill (personal)');
    END IF;

    UPDATE public.recurring_transactions
    SET next_due_date = CASE rec.frequency
      WHEN 'weekly' THEN rec.next_due_date + INTERVAL '7 days'
      WHEN 'biweekly' THEN rec.next_due_date + INTERVAL '14 days'
      WHEN 'monthly' THEN rec.next_due_date + INTERVAL '1 month'
      WHEN 'quarterly' THEN rec.next_due_date + INTERVAL '3 months'
      WHEN 'yearly' THEN rec.next_due_date + INTERVAL '1 year'
      ELSE rec.next_due_date + INTERVAL '1 month'
    END,
    is_active = CASE
      WHEN rec.end_date IS NOT NULL AND CASE rec.frequency
        WHEN 'weekly' THEN rec.next_due_date + INTERVAL '7 days'
        WHEN 'biweekly' THEN rec.next_due_date + INTERVAL '14 days'
        WHEN 'monthly' THEN rec.next_due_date + INTERVAL '1 month'
        WHEN 'quarterly' THEN rec.next_due_date + INTERVAL '3 months'
        WHEN 'yearly' THEN rec.next_due_date + INTERVAL '1 year'
        ELSE rec.next_due_date + INTERVAL '1 month'
      END > rec.end_date THEN false
      ELSE true
    END
    WHERE id = rec.id;
  END LOOP;
  RETURN NEW;
END;
$function$;

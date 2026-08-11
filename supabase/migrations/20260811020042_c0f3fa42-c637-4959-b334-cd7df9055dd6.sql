ALTER TABLE public.recurring_transactions
  ADD COLUMN IF NOT EXISTS match_text text;

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
    FROM public.recurring_transactions r
    WHERE r.household_id = NEW.household_id
      AND r.is_active = true
      AND r.account_id = NEW.account_id
      AND ABS(r.amount - NEW.amount) <= GREATEST(0.50, ABS(r.amount) * 0.25)
      AND r.next_due_date <= NEW.date
      AND (
        r.merchant IS NULL
        OR NEW.merchant IS NULL
        OR LOWER(TRIM(r.merchant)) = LOWER(TRIM(NEW.merchant))
        OR NEW.merchant ILIKE '%' || TRIM(r.merchant) || '%'
        OR TRIM(r.merchant) ILIKE '%' || NEW.merchant || '%'
        OR (r.match_text IS NOT NULL AND NEW.merchant ILIKE '%' || TRIM(r.match_text) || '%')
      )
  LOOP
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
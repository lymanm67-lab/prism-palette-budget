
CREATE OR REPLACE FUNCTION public.advance_recurring_next_due_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, frequency, next_due_date, end_date
    FROM public.recurring_transactions
    WHERE household_id = NEW.household_id
      AND is_active = true
      AND account_id = NEW.account_id
      AND ABS(amount - NEW.amount) < 0.01
      AND next_due_date <= NEW.date
      AND (merchant IS NULL OR NEW.merchant IS NULL OR LOWER(TRIM(merchant)) = LOWER(TRIM(NEW.merchant)))
  LOOP
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
$$;

CREATE TRIGGER trg_advance_recurring
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.advance_recurring_next_due_date();

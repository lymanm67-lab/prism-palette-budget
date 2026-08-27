ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS baseline_locked boolean NOT NULL DEFAULT false;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS locked_at timestamptz;

CREATE OR REPLACE FUNCTION public.enforce_budget_baseline_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_locked boolean;
BEGIN
  SELECT c.baseline_locked INTO is_locked FROM public.categories c WHERE c.id = NEW.category_id;
  IF COALESCE(is_locked, false) THEN
    IF TG_OP = 'UPDATE' AND NEW.planned_amount IS DISTINCT FROM OLD.planned_amount THEN
      NEW.planned_amount := OLD.planned_amount;
    END IF;
    NEW.locked_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_budget_baseline_lock ON public.budgets;
CREATE TRIGGER enforce_budget_baseline_lock
BEFORE INSERT OR UPDATE ON public.budgets
FOR EACH ROW EXECUTE FUNCTION public.enforce_budget_baseline_lock();
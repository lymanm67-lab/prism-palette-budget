
-- Trigger function: adjust account balance when transactions are inserted, updated, or deleted
CREATE OR REPLACE FUNCTION public.adjust_account_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only adjust if not soft-deleted
    IF NEW.deleted_at IS NULL THEN
      UPDATE public.accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle soft-delete (deleted_at changed from NULL to non-NULL)
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE public.accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
    -- Handle restore (deleted_at changed from non-NULL to NULL)
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE public.accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    -- Handle normal update (amount or account changed)
    ELSIF OLD.deleted_at IS NULL AND NEW.deleted_at IS NULL THEN
      -- Reverse old amount from old account
      UPDATE public.accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
      -- Apply new amount to new account
      UPDATE public.accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.deleted_at IS NULL THEN
      UPDATE public.accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Attach trigger to transactions table
CREATE TRIGGER trg_adjust_account_balance
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.adjust_account_balance();

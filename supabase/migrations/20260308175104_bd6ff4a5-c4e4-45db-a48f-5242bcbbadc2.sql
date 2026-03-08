
ALTER TABLE public.transactions ADD COLUMN deleted_at timestamptz DEFAULT NULL;

-- Update RLS policies to exclude soft-deleted rows from normal SELECT
DROP POLICY IF EXISTS "Members can view transactions" ON public.transactions;
CREATE POLICY "Members can view transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING (is_household_member(auth.uid(), household_id));

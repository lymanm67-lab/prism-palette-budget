DROP POLICY "Members can update debt items" ON public.debt_items;
CREATE POLICY "Members can update debt items" ON public.debt_items
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM debt_plans p
  WHERE p.id = debt_items.plan_id AND is_household_member(auth.uid(), p.household_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM debt_plans p
  WHERE p.id = debt_items.plan_id AND is_household_member(auth.uid(), p.household_id)
));

-- =====================================================
-- FIX 1: Convert ALL RESTRICTIVE policies to PERMISSIVE
-- FIX 2: Add missing SELECT policy for plaid_items
-- =====================================================

-- === accounts ===
DROP POLICY IF EXISTS "Members can delete accounts" ON public.accounts;
DROP POLICY IF EXISTS "Members can insert accounts" ON public.accounts;
DROP POLICY IF EXISTS "Members can update accounts" ON public.accounts;
DROP POLICY IF EXISTS "Members can view accounts" ON public.accounts;

CREATE POLICY "Members can delete accounts" ON public.accounts FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert accounts" ON public.accounts FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update accounts" ON public.accounts FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can view accounts" ON public.accounts FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));

-- === audit_logs ===
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Members can view audit logs" ON public.audit_logs;

CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (household_id IS NOT NULL AND is_household_member(auth.uid(), household_id));

-- === budgets ===
DROP POLICY IF EXISTS "Members can delete budgets" ON public.budgets;
DROP POLICY IF EXISTS "Members can insert budgets" ON public.budgets;
DROP POLICY IF EXISTS "Members can update budgets" ON public.budgets;
DROP POLICY IF EXISTS "Members can view budgets" ON public.budgets;

CREATE POLICY "Members can delete budgets" ON public.budgets FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert budgets" ON public.budgets FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update budgets" ON public.budgets FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can view budgets" ON public.budgets FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));

-- === business_profiles ===
DROP POLICY IF EXISTS "Members can delete business profiles" ON public.business_profiles;
DROP POLICY IF EXISTS "Members can insert business profiles" ON public.business_profiles;
DROP POLICY IF EXISTS "Members can update business profiles" ON public.business_profiles;
DROP POLICY IF EXISTS "Members can view business profiles" ON public.business_profiles;

CREATE POLICY "Members can delete business profiles" ON public.business_profiles FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert business profiles" ON public.business_profiles FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update business profiles" ON public.business_profiles FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can view business profiles" ON public.business_profiles FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));

-- === categories ===
DROP POLICY IF EXISTS "Members can delete categories" ON public.categories;
DROP POLICY IF EXISTS "Members can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Members can update categories" ON public.categories;
DROP POLICY IF EXISTS "Members can view categories" ON public.categories;

CREATE POLICY "Members can delete categories" ON public.categories FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update categories" ON public.categories FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can view categories" ON public.categories FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));

-- === categorization_rules ===
DROP POLICY IF EXISTS "Members can delete categorization rules" ON public.categorization_rules;
DROP POLICY IF EXISTS "Members can insert categorization rules" ON public.categorization_rules;
DROP POLICY IF EXISTS "Members can update categorization rules" ON public.categorization_rules;
DROP POLICY IF EXISTS "Members can view categorization rules" ON public.categorization_rules;

CREATE POLICY "Members can delete categorization rules" ON public.categorization_rules FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert categorization rules" ON public.categorization_rules FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update categorization rules" ON public.categorization_rules FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can view categorization rules" ON public.categorization_rules FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));

-- === category_groups ===
DROP POLICY IF EXISTS "Members can delete category groups" ON public.category_groups;
DROP POLICY IF EXISTS "Members can insert category groups" ON public.category_groups;
DROP POLICY IF EXISTS "Members can update category groups" ON public.category_groups;
DROP POLICY IF EXISTS "Members can view category groups" ON public.category_groups;

CREATE POLICY "Members can delete category groups" ON public.category_groups FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert category groups" ON public.category_groups FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update category groups" ON public.category_groups FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can view category groups" ON public.category_groups FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));

-- === debt_items ===
DROP POLICY IF EXISTS "Members can delete debt items" ON public.debt_items;
DROP POLICY IF EXISTS "Members can insert debt items" ON public.debt_items;
DROP POLICY IF EXISTS "Members can update debt items" ON public.debt_items;
DROP POLICY IF EXISTS "Members can view debt items" ON public.debt_items;

CREATE POLICY "Members can delete debt items" ON public.debt_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM debt_plans p WHERE p.id = debt_items.plan_id AND is_household_member(auth.uid(), p.household_id)));
CREATE POLICY "Members can insert debt items" ON public.debt_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM debt_plans p WHERE p.id = debt_items.plan_id AND is_household_member(auth.uid(), p.household_id)));
CREATE POLICY "Members can update debt items" ON public.debt_items FOR UPDATE TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM debt_plans p WHERE p.id = debt_items.plan_id AND is_household_member(auth.uid(), p.household_id)));
CREATE POLICY "Members can view debt items" ON public.debt_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM debt_plans p WHERE p.id = debt_items.plan_id AND is_household_member(auth.uid(), p.household_id)));

-- === debt_plans ===
DROP POLICY IF EXISTS "Members can delete debt plans" ON public.debt_plans;
DROP POLICY IF EXISTS "Members can insert debt plans" ON public.debt_plans;
DROP POLICY IF EXISTS "Members can update debt plans" ON public.debt_plans;
DROP POLICY IF EXISTS "Members can view debt plans" ON public.debt_plans;

CREATE POLICY "Members can delete debt plans" ON public.debt_plans FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert debt plans" ON public.debt_plans FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update debt plans" ON public.debt_plans FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can view debt plans" ON public.debt_plans FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));

-- === financial_goals ===
DROP POLICY IF EXISTS "Members can delete goals" ON public.financial_goals;
DROP POLICY IF EXISTS "Members can insert goals" ON public.financial_goals;
DROP POLICY IF EXISTS "Members can update goals" ON public.financial_goals;
DROP POLICY IF EXISTS "Members can view goals" ON public.financial_goals;

CREATE POLICY "Members can delete goals" ON public.financial_goals FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert goals" ON public.financial_goals FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update goals" ON public.financial_goals FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can view goals" ON public.financial_goals FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));

-- === financial_insights ===
DROP POLICY IF EXISTS "Members can delete insights" ON public.financial_insights;
DROP POLICY IF EXISTS "Members can insert insights" ON public.financial_insights;
DROP POLICY IF EXISTS "Members can update insights" ON public.financial_insights;
DROP POLICY IF EXISTS "Members can view insights" ON public.financial_insights;

CREATE POLICY "Members can delete insights" ON public.financial_insights FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert insights" ON public.financial_insights FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update insights" ON public.financial_insights FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can view insights" ON public.financial_insights FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));

-- === homebuyer_checklist ===
DROP POLICY IF EXISTS "Members can delete checklist" ON public.homebuyer_checklist;
DROP POLICY IF EXISTS "Members can insert checklist" ON public.homebuyer_checklist;
DROP POLICY IF EXISTS "Members can update checklist" ON public.homebuyer_checklist;
DROP POLICY IF EXISTS "Members can view checklist" ON public.homebuyer_checklist;

CREATE POLICY "Members can delete checklist" ON public.homebuyer_checklist FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert checklist" ON public.homebuyer_checklist FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update checklist" ON public.homebuyer_checklist FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can view checklist" ON public.homebuyer_checklist FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));

-- === household_invitations ===
DROP POLICY IF EXISTS "Owners can create invitations" ON public.household_invitations;
DROP POLICY IF EXISTS "Owners can delete invitations" ON public.household_invitations;
DROP POLICY IF EXISTS "Owners can update invitations" ON public.household_invitations;
DROP POLICY IF EXISTS "Owners can view invitations" ON public.household_invitations;

CREATE POLICY "Owners can create invitations" ON public.household_invitations FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM household_members hm WHERE hm.household_id = household_invitations.household_id AND hm.user_id = auth.uid() AND hm.role = 'owner'));
CREATE POLICY "Owners can delete invitations" ON public.household_invitations FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM household_members hm WHERE hm.household_id = household_invitations.household_id AND hm.user_id = auth.uid() AND hm.role = 'owner'));
CREATE POLICY "Owners can update invitations" ON public.household_invitations FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM household_members hm WHERE hm.household_id = household_invitations.household_id AND hm.user_id = auth.uid() AND hm.role = 'owner'));
CREATE POLICY "Owners can view invitations" ON public.household_invitations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM household_members hm WHERE hm.household_id = household_invitations.household_id AND hm.user_id = auth.uid() AND hm.role = 'owner'));

-- === household_members ===
DROP POLICY IF EXISTS "Members can delete membership" ON public.household_members;
DROP POLICY IF EXISTS "Members can join via invitation" ON public.household_members;
DROP POLICY IF EXISTS "Members can view membership" ON public.household_members;
DROP POLICY IF EXISTS "Owner can update membership" ON public.household_members;

CREATE POLICY "Members can delete membership" ON public.household_members FOR DELETE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM household_members hm WHERE hm.household_id = household_members.household_id AND hm.user_id = auth.uid() AND hm.role = 'owner'));
CREATE POLICY "Members can join via invitation" ON public.household_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM household_invitations hi JOIN auth.users au ON au.email = hi.email WHERE hi.household_id = household_members.household_id AND au.id = auth.uid() AND hi.status = 'pending' AND hi.expires_at > now()));
CREATE POLICY "Members can view membership" ON public.household_members FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Owner can update membership" ON public.household_members FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM household_members hm WHERE hm.household_id = household_members.household_id AND hm.user_id = auth.uid() AND hm.role = 'owner')) WITH CHECK (EXISTS (SELECT 1 FROM household_members hm WHERE hm.household_id = household_members.household_id AND hm.user_id = auth.uid() AND hm.role = 'owner'));

-- === households ===
DROP POLICY IF EXISTS "Authenticated can create household" ON public.households;
DROP POLICY IF EXISTS "Members can update household" ON public.households;
DROP POLICY IF EXISTS "Members can view household" ON public.households;
DROP POLICY IF EXISTS "Owner can delete household" ON public.households;

CREATE POLICY "Authenticated can create household" ON public.households FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Members can update household" ON public.households FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), id));
CREATE POLICY "Members can view household" ON public.households FOR SELECT TO authenticated USING (is_household_member(auth.uid(), id));
CREATE POLICY "Owner can delete household" ON public.households FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = households.id AND household_members.user_id = auth.uid() AND household_members.role = 'owner'));

-- === merchant_normalizations ===
DROP POLICY IF EXISTS "Members can delete normalizations" ON public.merchant_normalizations;
DROP POLICY IF EXISTS "Members can insert normalizations" ON public.merchant_normalizations;
DROP POLICY IF EXISTS "Members can update normalizations" ON public.merchant_normalizations;
DROP POLICY IF EXISTS "Members can view normalizations" ON public.merchant_normalizations;

CREATE POLICY "Members can delete normalizations" ON public.merchant_normalizations FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert normalizations" ON public.merchant_normalizations FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update normalizations" ON public.merchant_normalizations FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can view normalizations" ON public.merchant_normalizations FOR SELECT TO authenticated USING (is_global OR is_household_member(auth.uid(), household_id));

-- === plaid_items (FIX 2: add missing SELECT policy) ===
DROP POLICY IF EXISTS "Members can delete plaid items" ON public.plaid_items;
DROP POLICY IF EXISTS "Members can insert plaid items" ON public.plaid_items;
DROP POLICY IF EXISTS "Owners can update plaid items" ON public.plaid_items;

CREATE POLICY "Members can view plaid items" ON public.plaid_items FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete plaid items" ON public.plaid_items FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert plaid items" ON public.plaid_items FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Owners can update plaid items" ON public.plaid_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM household_members hm WHERE hm.household_id = plaid_items.household_id AND hm.user_id = auth.uid() AND hm.role = 'owner'));

-- === profiles ===
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- === recurring_transactions ===
DROP POLICY IF EXISTS "Members can delete recurring transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Members can insert recurring transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Members can update recurring transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Members can view recurring transactions" ON public.recurring_transactions;

CREATE POLICY "Members can delete recurring transactions" ON public.recurring_transactions FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert recurring transactions" ON public.recurring_transactions FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update recurring transactions" ON public.recurring_transactions FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can view recurring transactions" ON public.recurring_transactions FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));

-- === roadmap_progress ===
DROP POLICY IF EXISTS "Members can delete roadmap progress" ON public.roadmap_progress;
DROP POLICY IF EXISTS "Members can insert roadmap progress" ON public.roadmap_progress;
DROP POLICY IF EXISTS "Members can update roadmap progress" ON public.roadmap_progress;
DROP POLICY IF EXISTS "Members can view roadmap progress" ON public.roadmap_progress;

CREATE POLICY "Members can delete roadmap progress" ON public.roadmap_progress FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert roadmap progress" ON public.roadmap_progress FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update roadmap progress" ON public.roadmap_progress FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can view roadmap progress" ON public.roadmap_progress FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));

-- === saved_tax_responses ===
DROP POLICY IF EXISTS "Users can delete own saved responses" ON public.saved_tax_responses;
DROP POLICY IF EXISTS "Users can insert own saved responses" ON public.saved_tax_responses;
DROP POLICY IF EXISTS "Users can update own saved responses" ON public.saved_tax_responses;
DROP POLICY IF EXISTS "Users can view own saved responses" ON public.saved_tax_responses;

CREATE POLICY "Users can delete own saved responses" ON public.saved_tax_responses FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved responses" ON public.saved_tax_responses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved responses" ON public.saved_tax_responses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own saved responses" ON public.saved_tax_responses FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- === subcategories ===
DROP POLICY IF EXISTS "Members can delete subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Members can insert subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Members can update subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Members can view subcategories" ON public.subcategories;

CREATE POLICY "Members can delete subcategories" ON public.subcategories FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert subcategories" ON public.subcategories FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update subcategories" ON public.subcategories FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can view subcategories" ON public.subcategories FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));

-- === subscriptions ===
DROP POLICY IF EXISTS "Members can delete subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Members can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Members can update subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Members can view subscriptions" ON public.subscriptions;

CREATE POLICY "Members can delete subscriptions" ON public.subscriptions FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert subscriptions" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update subscriptions" ON public.subscriptions FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can view subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));

-- === transaction_splits ===
DROP POLICY IF EXISTS "Members can delete splits" ON public.transaction_splits;
DROP POLICY IF EXISTS "Members can insert splits" ON public.transaction_splits;
DROP POLICY IF EXISTS "Members can update splits" ON public.transaction_splits;
DROP POLICY IF EXISTS "Members can view splits" ON public.transaction_splits;

CREATE POLICY "Members can delete splits" ON public.transaction_splits FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM transactions t WHERE t.id = transaction_splits.transaction_id AND is_household_member(auth.uid(), t.household_id)));
CREATE POLICY "Members can insert splits" ON public.transaction_splits FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM transactions t WHERE t.id = transaction_splits.transaction_id AND is_household_member(auth.uid(), t.household_id)));
CREATE POLICY "Members can update splits" ON public.transaction_splits FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM transactions t WHERE t.id = transaction_splits.transaction_id AND is_household_member(auth.uid(), t.household_id)));
CREATE POLICY "Members can view splits" ON public.transaction_splits FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM transactions t WHERE t.id = transaction_splits.transaction_id AND is_household_member(auth.uid(), t.household_id)));

-- === transactions ===
DROP POLICY IF EXISTS "Members can delete transactions" ON public.transactions;
DROP POLICY IF EXISTS "Members can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Members can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Members can view transactions" ON public.transactions;

CREATE POLICY "Members can delete transactions" ON public.transactions FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update transactions" ON public.transactions FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can view transactions" ON public.transactions FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));

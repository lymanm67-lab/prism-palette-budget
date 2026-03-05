
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ===================== PROFILES =====================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  fiscal_month_start_day INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================== HOUSEHOLDS =====================
CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'My Household',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

-- Security definer to check household membership
CREATE OR REPLACE FUNCTION public.is_household_member(_user_id UUID, _household_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE user_id = _user_id AND household_id = _household_id
  );
$$;

CREATE POLICY "Members can view household" ON public.households FOR SELECT USING (
  public.is_household_member(auth.uid(), id)
);
CREATE POLICY "Members can update household" ON public.households FOR UPDATE USING (
  public.is_household_member(auth.uid(), id)
);
CREATE POLICY "Authenticated can create household" ON public.households FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Members can view membership" ON public.household_members FOR SELECT USING (
  public.is_household_member(auth.uid(), household_id)
);
CREATE POLICY "Members can insert membership" ON public.household_members FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON public.households FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===================== CATEGORY GROUPS & CATEGORIES =====================
CREATE TABLE public.category_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#7c5cf5',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.category_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view category groups" ON public.category_groups FOR SELECT USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert category groups" ON public.category_groups FOR INSERT WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update category groups" ON public.category_groups FOR UPDATE USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete category groups" ON public.category_groups FOR DELETE USING (public.is_household_member(auth.uid(), household_id));

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.category_groups(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#7c5cf5',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view categories" ON public.categories FOR SELECT USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert categories" ON public.categories FOR INSERT WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update categories" ON public.categories FOR UPDATE USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete categories" ON public.categories FOR DELETE USING (public.is_household_member(auth.uid(), household_id));

-- ===================== ACCOUNTS =====================
CREATE TYPE public.account_type AS ENUM ('checking', 'savings', 'credit', 'investment', 'loan', 'other');

CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  institution TEXT,
  account_type public.account_type NOT NULL DEFAULT 'checking',
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view accounts" ON public.accounts FOR SELECT USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert accounts" ON public.accounts FOR INSERT WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update accounts" ON public.accounts FOR UPDATE USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete accounts" ON public.accounts FOR DELETE USING (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===================== TRANSACTIONS =====================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  merchant TEXT,
  amount NUMERIC(14,2) NOT NULL,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  needs_review BOOLEAN NOT NULL DEFAULT false,
  provider_transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view transactions" ON public.transactions FOR SELECT USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert transactions" ON public.transactions FOR INSERT WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update transactions" ON public.transactions FOR UPDATE USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete transactions" ON public.transactions FOR DELETE USING (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX idx_transactions_account ON public.transactions(account_id);
CREATE INDEX idx_transactions_category ON public.transactions(category_id);
CREATE INDEX idx_transactions_household_date ON public.transactions(household_id, date DESC);

-- ===================== BUDGETS =====================
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  planned_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  rollover BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, category_id, month)
);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view budgets" ON public.budgets FOR SELECT USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert budgets" ON public.budgets FOR INSERT WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update budgets" ON public.budgets FOR UPDATE USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete budgets" ON public.budgets FOR DELETE USING (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===================== AUDIT LOG =====================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view audit logs" ON public.audit_logs FOR SELECT USING (
  household_id IS NOT NULL AND public.is_household_member(auth.uid(), household_id)
);
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

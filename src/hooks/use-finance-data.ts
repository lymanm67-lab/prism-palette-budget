import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

// ==================== ACCOUNTS ====================
export function useAccounts() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['accounts', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('household_id', household!.id)
        .order('institution', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  const { household } = useHousehold();
  return useMutation({
    mutationFn: async (account: Omit<TablesInsert<'accounts'>, 'household_id'>) => {
      const { data, error } = await supabase
        .from('accounts')
        .insert({ ...account, household_id: household!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesInsert<'accounts'>>) => {
      const { data, error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: string) => {
      // Delete related transactions first
      const { error: txnError } = await supabase
        .from('transactions')
        .delete()
        .eq('account_id', accountId);
      if (txnError) throw txnError;

      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

// ==================== CATEGORIES ====================
export function useCategoryGroups() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['category_groups', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category_groups')
        .select('*')
        .eq('household_id', household!.id)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

export function useCategories() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['categories', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*, category_groups(name, color)')
        .eq('household_id', household!.id)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCategoryGroup() {
  const qc = useQueryClient();
  const { household } = useHousehold();
  return useMutation({
    mutationFn: async (group: { name: string; color: string; sort_order?: number; budget_type?: string; business_profile_id?: string | null; expense_type?: string }) => {
      const { data, error } = await supabase
        .from('category_groups')
        .insert({ ...group, household_id: household!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['category_groups'] }),
  });
}

export function useUpdateCategoryGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; color?: string; sort_order?: number; budget_type?: string; business_profile_id?: string | null; expense_type?: string }) => {
      const { data, error } = await supabase
        .from('category_groups')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['category_groups'] }),
  });
}

export function useDeleteCategoryGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('category_groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['category_groups'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  const { household } = useHousehold();
  return useMutation({
    mutationFn: async (cat: { name: string; color: string; group_id: string; sort_order?: number }) => {
      const { data, error } = await supabase
        .from('categories')
        .insert({ ...cat, household_id: household!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; color?: string; group_id?: string; sort_order?: number }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

// ==================== SUBCATEGORIES ====================
export function useSubcategories() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['subcategories', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('subcategories') as any)
        .select('*')
        .eq('household_id', household!.id)
        .order('sort_order');
      if (error) throw error;
      return data as { id: string; category_id: string; household_id: string; name: string; color: string; sort_order: number; created_at: string }[];
    },
  });
}

export function useCreateSubcategory() {
  const qc = useQueryClient();
  const { household } = useHousehold();
  return useMutation({
    mutationFn: async (sub: { name: string; color: string; category_id: string; sort_order?: number }) => {
      const { data, error } = await (supabase
        .from('subcategories') as any)
        .insert({ ...sub, household_id: household!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subcategories'] }),
  });
}

export function useUpdateSubcategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; color?: string; category_id?: string; sort_order?: number }) => {
      const { data, error } = await (supabase
        .from('subcategories') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subcategories'] }),
  });
}

export function useDeleteSubcategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('subcategories') as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subcategories'] }),
  });
}

// ==================== TRANSACTIONS ====================
export function useTransactions() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['transactions', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, categories(name, color), accounts(name, balance)')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
}

const PAGE_SIZE = 50;

export function useInfiniteTransactions() {
  const { household } = useHousehold();
  return useInfiniteQuery({
    queryKey: ['transactions_infinite', household?.id],
    initialPageParam: 0,
    enabled: !!household,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, categories(name, color), accounts(name, balance)')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.flat().length;
    },
  });
}

export function useDeletedTransactions() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['transactions_deleted', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, categories(name, color), accounts(name, balance)')
        .eq('household_id', household!.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useTransactionsByDateRange(startDate: string, endDate: string) {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['transactions_range', household?.id, startDate, endDate],
    enabled: !!household && !!startDate && !!endDate,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, categories(name, color), accounts(name, balance)')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAllTransactions() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['transactions_all', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, categories(name, color), accounts(name, balance)')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order('date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  const { household } = useHousehold();
  return useMutation({
    mutationFn: async (txn: Omit<TablesInsert<'transactions'>, 'household_id'>) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...txn, household_id: household!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesInsert<'transactions'>>) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['transactions_all'] });
      qc.invalidateQueries({ queryKey: ['transactions_range'] });
    },
  });
}

export function useBudgets(month: string) {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['budgets', household?.id, month],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*, categories(name, color)')
        .eq('household_id', household!.id)
        .eq('month', month);
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  const { household } = useHousehold();
  return useMutation({
    mutationFn: async (budget: Omit<TablesInsert<'budgets'>, 'household_id'>) => {
      const { data, error } = await supabase
        .from('budgets')
        .upsert({ ...budget, household_id: household!.id }, { onConflict: 'household_id,category_id,month' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budgets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

// ==================== SPENDING AGGREGATION ====================
export function useSpendingByCategory(startDate: string, endDate: string, mode: 'personal' | 'business' | 'all' = 'all') {
  const { household } = useHousehold();
  const { data: accounts } = useAccounts();
  return useQuery({
    queryKey: ['spending_by_category', household?.id, startDate, endDate, mode],
    enabled: !!household,
    queryFn: async () => {
      // Build set of investment account IDs to exclude
      const investmentAccountIds = new Set<string>();
      if (accounts) {
        for (const a of accounts) {
          if (a.account_type === 'investment') investmentAccountIds.add(a.id);
        }
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('amount, category_id, account_id, is_transfer, categories(name, color, group_id, category_groups(budget_type))')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .eq('is_transfer', false)
        .gte('date', startDate)
        .lte('date', endDate)
        .lt('amount', 0); // expenses only
      if (error) throw error;

      // Aggregate by category, excluding investment accounts and filtering by mode
      const map = new Map<string, { name: string; color: string; value: number }>();
      for (const t of data) {
        if (investmentAccountIds.has(t.account_id)) continue;

        // Filter by budget_type when mode is specified
        if (mode !== 'all' && t.categories?.category_groups) {
          const budgetType = (t.categories.category_groups as any)?.budget_type;
          if (mode === 'personal' && budgetType === 'business') continue;
          if (mode === 'business' && budgetType !== 'business') continue;
        }

        const catName = t.categories?.name || 'Uncategorized';
        const catColor = t.categories?.color || '#888';
        const existing = map.get(catName) || { name: catName, color: catColor, value: 0 };
        existing.value += Math.abs(t.amount);
        map.set(catName, existing);
      }
      return Array.from(map.values()).sort((a, b) => b.value - a.value);
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';

export type LeakStatus = 'open' | 'fixed' | 'dismissed' | 'redirected';

export interface MoneyLeak {
  id: string;
  household_id: string;
  leak_type: string;
  title: string;
  merchant: string | null;
  source_id: string | null;
  source_type: string | null;
  monthly_cost: number;
  annual_cost: number;
  three_year_cost: number;
  risk_level: 'low' | 'medium' | 'high';
  recommended_fix: string | null;
  suggested_redirect: string | null;
  detail: Record<string, any>;
  status: LeakStatus;
  detected_at: string;
  fixed_at: string | null;
  dismissed_at: string | null;
}

export function useMoneyLeaks(status: LeakStatus | 'all' = 'open') {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['money-leaks', household?.id, status],
    enabled: !!household,
    queryFn: async () => {
      let q = supabase
        .from('money_leaks' as any)
        .select('*')
        .eq('household_id', household!.id)
        .order('annual_cost', { ascending: false });
      if (status !== 'all') q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any as MoneyLeak[]) || [];
    },
  });
}

export function useScanMoneyLeaks() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('money-leak-scan', {
        body: { household_id: household!.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Scan complete — ${data?.count ?? 0} leak${data?.count === 1 ? '' : 's'} found`);
      qc.invalidateQueries({ queryKey: ['money-leaks'] });
    },
    onError: (e: any) => toast.error(e.message || 'Scan failed'),
  });
}

export function useUpdateMoneyLeak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, redirect }: { id: string; status: LeakStatus; redirect?: string }) => {
      const patch: any = { status };
      if (status === 'dismissed') patch.dismissed_at = new Date().toISOString();
      if (status === 'fixed') patch.fixed_at = new Date().toISOString();
      if (redirect) patch.suggested_redirect = redirect;
      const { error } = await supabase.from('money_leaks' as any).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      const msg = vars.status === 'dismissed' ? 'Dismissed'
        : vars.status === 'fixed' ? 'Marked as fixed'
        : vars.status === 'redirected' ? 'Redirected to wealth goal' : 'Updated';
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ['money-leaks'] });
    },
    onError: (e: any) => toast.error(e.message || 'Update failed'),
  });
}

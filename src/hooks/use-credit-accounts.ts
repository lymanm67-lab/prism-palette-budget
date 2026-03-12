import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';

export interface CreditAccount {
  id: string;
  household_id: string;
  bureau: string;
  account_name: string;
  account_number: string | null;
  account_type: string;
  account_status: string;
  balance: number;
  credit_limit: number | null;
  monthly_payment: number | null;
  payment_history: string | null;
  date_opened: string | null;
  date_closed: string | null;
  date_of_first_delinquency: string | null;
  high_balance: number | null;
  terms: string | null;
  responsibility: string | null;
  remarks_codes: string | null;
  dispute_status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useCreditAccounts() {
  const { household: currentHousehold } = useHousehold();
  const queryClient = useQueryClient();
  const householdId = currentHousehold?.id;

  const query = useQuery({
    queryKey: ['credit-accounts', householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await (supabase as any)
        .from('credit_accounts')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CreditAccount[];
    },
    enabled: !!householdId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('credit_accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-accounts'] });
      toast.success('Account deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['credit-accounts'] });

  return { ...query, accounts: query.data || [], deleteAccount: deleteMutation.mutate, refetch };
}

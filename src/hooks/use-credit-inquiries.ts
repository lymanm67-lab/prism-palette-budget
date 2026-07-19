import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';

export interface CreditInquiry {
  id: string;
  household_id: string;
  bureau: string;
  inquiry_date: string;
  creditor_name: string;
  inquiry_type: 'hard' | 'soft';
  is_authorized: boolean | null;
  dispute_status: 'none' | 'draft' | 'submitted' | 'removed' | 'verified';
  dispute_submitted_date: string | null;
  dispute_outcome: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type InquiryInsert = Omit<CreditInquiry, 'id' | 'created_at' | 'updated_at'>;

export function useCreditInquiries() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const householdId = household?.id;

  const query = useQuery({
    queryKey: ['credit-inquiries', householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await (supabase as any)
        .from('credit_inquiries')
        .select('*')
        .eq('household_id', householdId)
        .order('inquiry_date', { ascending: false });
      if (error) throw error;
      return (data || []) as CreditInquiry[];
    },
    enabled: !!householdId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['credit-inquiries'] });

  const createInquiry = useMutation({
    mutationFn: async (i: Partial<InquiryInsert>) => {
      if (!householdId) throw new Error('No household');
      const { error } = await (supabase as any).from('credit_inquiries').insert({ ...i, household_id: householdId });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Inquiry added'); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateInquiry = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreditInquiry> & { id: string }) => {
      const { error } = await (supabase as any).from('credit_inquiries').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Inquiry updated'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteInquiry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('credit_inquiries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Inquiry deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const inquiries = query.data || [];
  const hard = inquiries.filter(i => i.inquiry_type === 'hard');
  const disputed = inquiries.filter(i => i.dispute_status !== 'none');
  const removed = inquiries.filter(i => i.dispute_status === 'removed');

  return {
    ...query,
    inquiries,
    hard,
    disputed,
    removed,
    createInquiry: createInquiry.mutate,
    updateInquiry: updateInquiry.mutate,
    deleteInquiry: deleteInquiry.mutate,
    isCreating: createInquiry.isPending,
  };
}

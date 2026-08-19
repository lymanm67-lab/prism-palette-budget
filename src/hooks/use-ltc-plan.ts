import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { defaultState, type LtcState } from '@/lib/ltc/model';

const sb = supabase as any;
const BUCKET = 'ltc-documents';

export interface LtcPlanRecord { id: string | null; state: LtcState }

export function useLtcPlan() {
  const { household } = useHousehold();
  return useQuery<LtcPlanRecord>({
    queryKey: ['ltc_plan', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from('ltc_plan').select('id, state').eq('household_id', household!.id).maybeSingle();
      if (error) throw error;
      if (!data) return { id: null, state: defaultState() };
      return { id: data.id as string, state: defaultState(data.state || {}) };
    },
  });
}

export function useSaveLtcPlan() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (state: LtcState) => {
      const { data, error } = await sb
        .from('ltc_plan')
        .upsert({ household_id: household!.id, state }, { onConflict: 'household_id' })
        .select('id').single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ltc_plan'] }),
  });
}

export interface LtcDocument {
  id: string;
  category: string;
  carrier: string | null;
  product: string | null;
  agent: string | null;
  quote_date: string | null;
  monthly_premium: number | null;
  monthly_benefit: number | null;
  inflation_pct: number | null;
  notes: string | null;
  file_path: string | null;
  file_name: string | null;
  created_at: string;
}

export function useLtcDocuments() {
  const { household } = useHousehold();
  return useQuery<LtcDocument[]>({
    queryKey: ['ltc_documents', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from('ltc_documents').select('*')
        .eq('household_id', household!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as LtcDocument[];
    },
  });
}

export function useLtcDocumentMutations() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['ltc_documents'] });

  const add = useMutation({
    mutationFn: async ({ file, ...row }: Partial<LtcDocument> & { file?: File | null }) => {
      let file_path: string | null = null;
      let file_name: string | null = null;
      if (file) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${household!.id}/${Date.now()}-${safe}`;
        const { error: upErr } = await sb.storage.from(BUCKET).upload(path, file);
        if (upErr) throw upErr;
        file_path = path;
        file_name = file.name;
      }
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await sb.from('ltc_documents').insert({
        household_id: household!.id, created_by: auth.user?.id ?? null,
        ...row, file_path, file_name,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (doc: LtcDocument) => {
      if (doc.file_path) await sb.storage.from(BUCKET).remove([doc.file_path]);
      const { error } = await sb.from('ltc_documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, remove };
}

export async function ltcSignedUrl(path: string) {
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl as string;
}

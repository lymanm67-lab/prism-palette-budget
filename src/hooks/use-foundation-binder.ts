import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';
import type { BinderDoc } from '@/lib/legacy/foundationBinder';

const sb = supabase as any;
const TABLE = 'fdn_binder_documents';

export function useBinderDocs() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: [TABLE, household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from(TABLE)
        .select('*')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as BinderDoc[];
    },
  });
}

export function useSaveBinderDoc() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, any>) => {
      const { id, ...rest } = row;
      if (id) {
        const { error } = await sb.from(TABLE).update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await sb.from(TABLE).insert({ ...rest, household_id: household!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TABLE, household?.id] });
      toast.success('Document saved');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not save document'),
  });
}

export function useDeleteBinderDoc() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from(TABLE).update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TABLE, household?.id] });
      toast.success('Document removed');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not remove document'),
  });
}

/** Marks the current row superseded and inserts a copy at version + 1 as a draft. */
export function useNewBinderVersion() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: BinderDoc) => {
      const { error: upErr } = await sb.from(TABLE).update({ status: 'superseded' }).eq('id', doc.id);
      if (upErr) throw upErr;
      const { error } = await sb.from(TABLE).insert({
        household_id: household!.id,
        section: doc.section,
        doc_code: doc.doc_code,
        title: doc.title,
        purpose: doc.purpose,
        body: doc.body,
        version: doc.version + 1,
        status: 'draft',
        prepared_by: doc.prepared_by,
        cross_refs: doc.cross_refs ?? [],
        tags: doc.tags ?? [],
        sort_order: doc.sort_order,
        supersedes_id: doc.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TABLE, household?.id] });
      toast.success('New draft version created');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not create version'),
  });
}

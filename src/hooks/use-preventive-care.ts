// Data layer for Preventive Care & Medical Documents.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';
import type { PreventiveItem } from '@/lib/health/sleepRecovery';

const sb = supabase as any;
const BUCKET = 'medical-documents';

export type ParsedResult = {
  name: string;
  value: string;
  unit?: string | null;
  reference_range?: string | null;
  flag?: 'normal' | 'low' | 'high' | 'abnormal' | 'unknown';
};

export type ParsedReport = {
  report_type?: string;
  report_date?: string | null;
  provider?: string | null;
  patient?: string | null;
  results?: ParsedResult[];
  diagnoses?: string[];
  medications?: string[];
  vitals?: { name: string; value: string }[];
  key_findings?: string[];
  follow_ups?: string[];
  summary?: string;
  confidence?: 'high' | 'medium' | 'low';
};

export type MedicalDocument = {
  parse_status?: string | null;
  parsed_at?: string | null;
  parsed_summary?: ParsedReport | null;
  id: string;
  title: string;
  doc_type: string;
  document_date: string | null;
  provider: string | null;
  person: string | null;
  file_path: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  notes: string | null;
  preventive_care_id: string | null;
  created_at: string;
};

// ------------------------------------------------------------ preventive care

export function usePreventiveCare() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['health_preventive_care', household?.id],
    enabled: !!household,
    queryFn: async (): Promise<PreventiveItem[]> => {
      const { data, error } = await sb
        .from('health_preventive_care')
        .select('*')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PreventiveItem[];
    },
  });
}

export function useSavePreventiveCare() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, unknown> & { id?: string }) => {
      if (!household) throw new Error('No household');
      if (row.id) {
        const { id, ...patch } = row;
        const { error } = await sb.from('health_preventive_care').update(patch).eq('id', id);
        if (error) throw error;
        return;
      }
      const { error } = await sb
        .from('health_preventive_care')
        .insert({ ...row, household_id: household.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health_preventive_care', household?.id] });
      toast.success('Saved');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not save'),
  });
}

export function useSeedPreventiveCare() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Record<string, unknown>[]) => {
      if (!household) throw new Error('No household');
      const { error } = await sb
        .from('health_preventive_care')
        .insert(rows.map((r, i) => ({ ...r, household_id: household.id, sort_order: i })));
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health_preventive_care', household?.id] });
      toast.success('Standard preventive schedule added');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not add the schedule'),
  });
}

export function useDeletePreventiveCare() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb
        .from('health_preventive_care')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health_preventive_care', household?.id] });
      toast.success('Removed');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not remove'),
  });
}

// -------------------------------------------------------- medical documents

export function useMedicalDocuments() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['health_medical_documents', household?.id],
    enabled: !!household,
    queryFn: async (): Promise<MedicalDocument[]> => {
      const { data, error } = await sb
        .from('health_medical_documents')
        .select('*')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MedicalDocument[];
    },
  });
}

export function useUploadMedicalDocument() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      meta,
    }: {
      file: File;
      meta: {
        title: string;
        doc_type: string;
        document_date: string | null;
        provider: string | null;
        person: string | null;
        notes: string | null;
        preventive_care_id: string | null;
      };
    }) => {
      if (!household) throw new Error('No household');
      const safe = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${household.id}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type || 'application/octet-stream' });
      if (upErr) throw upErr;

      const { error } = await sb.from('health_medical_documents').insert({
        household_id: household.id,
        ...meta,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health_medical_documents', household?.id] });
      toast.success('Report uploaded');
    },
    onError: (e: any) => toast.error(e.message ?? 'Upload failed'),
  });
}

export function useDeleteMedicalDocument() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: MedicalDocument) => {
      await supabase.storage.from(BUCKET).remove([doc.file_path]);
      const { error } = await sb
        .from('health_medical_documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health_medical_documents', household?.id] });
      toast.success('Report removed');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not remove'),
  });
}

/** Opens a private medical document via a short-lived signed URL. */
export async function openMedicalDocument(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) {
    toast.error(error?.message ?? 'Could not open the file');
    return;
  }
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}

/** Runs AI extraction on an uploaded medical/lab report. */
export function useParseMedicalDocument() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.functions.invoke('parse-medical-report', {
        body: { documentId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return (data as any)?.parsed as ParsedReport;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health_medical_documents', household?.id] });
      toast.success('Report parsed');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not parse the report'),
  });
}

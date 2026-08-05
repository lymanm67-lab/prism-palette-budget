// Data layer for the Foundation operations tables: funding, investments,
// governance, compliance, impact metrics, succession, and the document vault.
import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';
import {
  COMPLIANCE_SEEDS,
  GOVERNANCE_SEEDS,
  SUCCESSION_SEEDS,
  IMPACT_SEEDS,
} from '@/lib/legacy/foundationOps';
import { INSURANCE_SEEDS, BENCHMARK_SEEDS } from '@/lib/legacy/foundationGrants';

const sb = supabase as any;

export type FdnOpsTable =
  | 'fdn_gifts'
  | 'fdn_investments'
  | 'fdn_governance'
  | 'fdn_compliance'
  | 'fdn_impact_metrics'
  | 'fdn_succession'
  | 'fdn_documents'
  | 'fdn_grants'
  | 'fdn_insurance'
  | 'fdn_benchmarks';

function useOpsList(table: FdnOpsTable, orderBy = 'created_at', ascending = true) {
  const { household } = useHousehold();
  return useQuery({
    queryKey: [table, household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from(table)
        .select('*')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order(orderBy, { ascending });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export const useFdnGifts = () => useOpsList('fdn_gifts', 'gift_date', false);
export const useFdnInvestments = () => useOpsList('fdn_investments', 'market_value', false);
export const useFdnGovernance = () => useOpsList('fdn_governance', 'sort_order');
export const useFdnCompliance = () => useOpsList('fdn_compliance', 'sort_order');
export const useFdnImpactMetrics = () => useOpsList('fdn_impact_metrics', 'sort_order');
export const useFdnSuccession = () => useOpsList('fdn_succession', 'sort_order');
export const useFdnDocuments = () => useOpsList('fdn_documents', 'created_at', false);
export const useFdnGrants = () => useOpsList('fdn_grants', 'created_at', false);
export const useFdnInsurance = () => useOpsList('fdn_insurance', 'sort_order');
export const useFdnBenchmarks = () => useOpsList('fdn_benchmarks', 'sort_order');


export function useSaveFdnOpsRow(table: FdnOpsTable) {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, any>) => {
      const { id, ...rest } = row;
      if (id) {
        const { error } = await sb.from(table).update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await sb.from(table).insert({ ...rest, household_id: household!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table, household?.id] });
      toast.success('Saved');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not save'),
  });
}

export function useDeleteFdnOpsRow(table: FdnOpsTable) {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table, household?.id] });
      toast.success('Removed');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not remove'),
  });
}

/** Seeds the compliance checklist, governance roster, succession bench, and impact metrics once. */
export function useFdnOpsSeed() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const done = useRef(false);
  const compliance = useFdnCompliance();
  const governance = useFdnGovernance();
  const succession = useFdnSuccession();
  const impact = useFdnImpactMetrics();
  const insurance = useFdnInsurance();
  const benchmarks = useFdnBenchmarks();

  useEffect(() => {
    if (!household || done.current) return;
    if (
      compliance.isLoading ||
      governance.isLoading ||
      succession.isLoading ||
      impact.isLoading ||
      insurance.isLoading ||
      benchmarks.isLoading
    )
      return;
    const jobs: { table: FdnOpsTable; rows: any[] }[] = [];
    if ((compliance.data ?? []).length === 0) jobs.push({ table: 'fdn_compliance', rows: COMPLIANCE_SEEDS });
    if ((governance.data ?? []).length === 0) jobs.push({ table: 'fdn_governance', rows: GOVERNANCE_SEEDS });
    if ((succession.data ?? []).length === 0) jobs.push({ table: 'fdn_succession', rows: SUCCESSION_SEEDS });
    if ((impact.data ?? []).length === 0) jobs.push({ table: 'fdn_impact_metrics', rows: IMPACT_SEEDS });
    if ((insurance.data ?? []).length === 0) jobs.push({ table: 'fdn_insurance', rows: INSURANCE_SEEDS });
    if ((benchmarks.data ?? []).length === 0) jobs.push({ table: 'fdn_benchmarks', rows: BENCHMARK_SEEDS });
    done.current = true;
    if (jobs.length === 0) return;

    (async () => {
      for (const job of jobs) {
        const { error } = await sb
          .from(job.table)
          .insert(job.rows.map((r) => ({ ...r, household_id: household.id })));
        if (error) {
          console.error('Foundation ops seed failed', job.table, error);
          continue;
        }
        qc.invalidateQueries({ queryKey: [job.table, household.id] });
      }
    })();
  }, [
    household,
    compliance.isLoading,
    governance.isLoading,
    succession.isLoading,
    impact.isLoading,
    insurance.isLoading,
    benchmarks.isLoading,
    compliance.data,
    governance.data,
    succession.data,
    impact.data,
    insurance.data,
    benchmarks.data,
    qc,
  ]);

}

/* --------------------------- document vault ------------------------------ */

export function useUploadFdnDocument() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, title, doc_category, expires_at, notes }: {
      file: File;
      title: string;
      doc_category: string;
      expires_at?: string | null;
      notes?: string | null;
    }) => {
      const path = `${household!.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
      const { error: upErr } = await sb.storage.from('foundation-documents').upload(path, file);
      if (upErr) throw upErr;
      const { error } = await sb.from('fdn_documents').insert({
        household_id: household!.id,
        title: title || file.name,
        doc_category,
        file_path: path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        expires_at: expires_at || null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fdn_documents', household?.id] });
      toast.success('Document stored');
    },
    onError: (e: any) => toast.error(e.message ?? 'Upload failed'),
  });
}

export async function openFdnDocument(path: string) {
  const { data, error } = await sb.storage.from('foundation-documents').createSignedUrl(path, 300);
  if (error || !data?.signedUrl) {
    toast.error('Could not open document');
    return;
  }
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}

/* ------------------------ OCR + full-text search -------------------------- */

/** Runs OCR/indexing on one stored document so its contents become searchable. */
export function useOcrFdnDocument() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await sb.functions.invoke('ocr-foundation-document', {
        body: { documentId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fdn_documents', household?.id] });
      toast.success('Document indexed — its text is now searchable');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not index the document'),
  });
}

/**
 * Full-text search across document titles, notes, and OCR'd contents using the
 * generated `search_vector` column. Falls back to substring matching so partial
 * words and clause fragments still find results.
 */
export function useSearchFdnDocuments(query: string) {
  const { household } = useHousehold();
  const term = query.trim();
  return useQuery({
    queryKey: ['fdn_documents_search', household?.id, term],
    enabled: !!household && term.length >= 2,
    queryFn: async () => {
      const base = () =>
        sb
          .from('fdn_documents')
          .select('id, title, doc_category, file_name, file_path, notes, ocr_text, extracted, ocr_status, ocr_at')
          .eq('household_id', household!.id)
          .is('deleted_at', null)
          .limit(40);

      const { data, error } = await base().textSearch('search_vector', term, {
        type: 'websearch',
        config: 'english',
      });
      if (error) throw error;
      if ((data ?? []).length > 0) return data as any[];

      const like = `%${term.replace(/[%_]/g, '')}%`;
      const { data: fuzzy, error: fuzzyErr } = await base().or(
        `title.ilike.${like},notes.ilike.${like},ocr_text.ilike.${like}`,
      );
      if (fuzzyErr) throw fuzzyErr;
      return (fuzzy ?? []) as any[];
    },
  });
}

/** Returns short surrounding snippets for each place the term appears. */
export function documentSnippets(text: string | null, term: string, max = 3) {
  if (!text || !term.trim()) return [] as string[];
  const words = term.trim().split(/\s+/).filter((w) => w.length > 2);
  const needles = words.length > 0 ? words : [term.trim()];
  const lower = text.toLowerCase();
  const hits: string[] = [];
  const seen = new Set<number>();

  for (const needle of needles) {
    let from = 0;
    const n = needle.toLowerCase();
    while (hits.length < max) {
      const at = lower.indexOf(n, from);
      if (at === -1) break;
      const block = Math.floor(at / 200);
      if (!seen.has(block)) {
        seen.add(block);
        const start = Math.max(0, at - 90);
        const end = Math.min(text.length, at + needle.length + 110);
        hits.push(`${start > 0 ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${end < text.length ? '…' : ''}`);
      }
      from = at + n.length;
    }
    if (hits.length >= max) break;
  }
  return hits;
}

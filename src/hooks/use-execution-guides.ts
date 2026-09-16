// SwingEdge — saved Thinkorswim execution guides.
//
// A saved guide is a record of the sheet the trader actually used: which guide,
// which version, the trade values it was built from, and whether it was printed
// or downloaded. Nothing is inferred — only what the trader saved.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import type { ExecutionGuide, GuideKind } from '@/lib/swingedge/thinkorswimGuide';

export type GuideDestination = 'JOURNAL' | 'BINDER';

export interface SavedGuide {
  id: string;
  guide_key: string;
  guide_kind: GuideKind;
  guide_version: string;
  title: string;
  symbol: string | null;
  saved_to: GuideDestination;
  trade_plan_id: string | null;
  paper_trade_id: string | null;
  execution_ticket_id: string | null;
  trade_values: Record<string, unknown>;
  orientation: string;
  printed_at: string | null;
  downloaded_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface SaveGuideInput {
  guide: ExecutionGuide;
  savedTo: GuideDestination;
  orientation?: 'PORTRAIT' | 'LANDSCAPE';
  tradePlanId?: string | null;
  paperTradeId?: string | null;
  executionTicketId?: string | null;
  notes?: string | null;
  printed?: boolean;
  downloaded?: boolean;
}

export function useExecutionGuides() {
  const { household } = useHousehold();
  const householdId = household?.id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['se-execution-guides', householdId],
    enabled: !!householdId,
    staleTime: 30_000,
    queryFn: async (): Promise<SavedGuide[]> => {
      const { data, error } = await supabase
        .from('se_execution_guides')
        .select('*')
        .eq('household_id', householdId!)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as SavedGuide[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['se-execution-guides', householdId] });

  const save = useMutation({
    mutationFn: async (input: SaveGuideInput) => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('se_execution_guides')
        .insert({
          household_id: householdId!,
          guide_key: input.guide.key,
          guide_kind: input.guide.kind,
          guide_version: input.guide.version,
          title: input.guide.title,
          symbol: input.guide.trade?.symbol ?? null,
          saved_to: input.savedTo,
          orientation: input.orientation ?? 'PORTRAIT',
          trade_plan_id: input.tradePlanId ?? null,
          paper_trade_id: input.paperTradeId ?? null,
          execution_ticket_id: input.executionTicketId ?? null,
          trade_values: (input.guide.trade ?? {}) as unknown as Record<string, unknown>,
          notes: input.notes ?? null,
          printed_at: input.printed ? now : null,
          downloaded_at: input.downloaded ? now : null,
        })
        .select('id')
        .single();
      if (error) throw error;
      return String(data.id);
    },
    onSuccess: invalidate,
  });

  /** Records that an already-saved guide was printed or downloaded. */
  const markUsed = useMutation({
    mutationFn: async ({ id, printed, downloaded }: { id: string; printed?: boolean; downloaded?: boolean }) => {
      const now = new Date().toISOString();
      const patch: Record<string, string> = {};
      if (printed) patch.printed_at = now;
      if (downloaded) patch.downloaded_at = now;
      if (!Object.keys(patch).length) return;
      const { error } = await supabase.from('se_execution_guides').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('se_execution_guides').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const guides = query.data ?? [];

  return {
    guides,
    journalGuides: guides.filter((g) => g.saved_to === 'JOURNAL'),
    binderGuides: guides.filter((g) => g.saved_to === 'BINDER'),
    isLoading: query.isLoading,
    save,
    markUsed,
    remove,
  };
}

/** Saved guides attached to one paper trade, for the journal entry. */
export function useGuidesForTrade(paperTradeId?: string | null) {
  const { guides, isLoading } = useExecutionGuides();
  return {
    guides: paperTradeId ? guides.filter((g) => g.paper_trade_id === paperTradeId) : [],
    isLoading,
  };
}

// SwingEdge AI Mentor — recorded behaviour in, mentor verdict out.
//
// The discipline report is computed locally from trades and journal entries the
// owner already recorded. The mentor reads that report as fact; it never makes
// up numbers. Every verdict is saved so repeat habits can be called out later.

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import {
  assessDiscipline,
  type DisciplineJournalEntry,
  type DisciplineReport,
  type DisciplineTrade,
} from '@/lib/swingedge/discipline';

export type MentorScope = 'TRADE' | 'REVIEW';

export interface MentorRuleBreak {
  rule?: string;
  what_happened?: string;
  fix?: string;
}

export interface MentorEmotionalFlag {
  pattern?: string;
  evidence?: string;
  counter_move?: string;
}

export interface MentorResult {
  verdict?: string;
  headline?: string;
  rules_kept?: string[];
  rule_breaks?: MentorRuleBreak[];
  emotional_flags?: MentorEmotionalFlag[];
  repeat_offences?: string[];
  doing_well?: string[];
  discipline_note?: string;
  next_action?: string;
  note?: string;
}

export interface MentorVerdictRow {
  id: string;
  created_at: string;
  scope: string;
  page: string | null;
  symbol: string | null;
  verdict: string | null;
  discipline_score: number | null;
  headline: string | null;
  acknowledged_at: string | null;
}

/** Recorded trades + journal entries, turned into a discipline report. */
export function useDisciplineReport() {
  const { household } = useHousehold();
  const householdId = household?.id ?? null;

  const query = useQuery({
    queryKey: ['se-discipline', householdId],
    enabled: !!householdId,
    staleTime: 60_000,
    queryFn: async (): Promise<DisciplineReport> => {
      const [tradesRes, journalRes] = await Promise.all([
        supabase
          .from('se_paper_trades')
          .select(
            'id, symbol, entry_date, exit_date, status, setup_type, initial_dollar_risk, realized_pl, stop_price, original_stop, entry_price, rules_followed, readiness_score, earnings_within_hold, event_decision, revalidated_at, exit_reason',
          )
          .eq('household_id', householdId!)
          .order('entry_date', { ascending: false })
          .limit(500),
        supabase
          .from('se_journal_entries')
          .select(
            'id, symbol, entry_date, rules_followed, followed_stop_rule, widened_stop, stop_moved, mistakes, result_r',
          )
          .eq('household_id', householdId!)
          .order('entry_date', { ascending: false })
          .limit(500),
      ]);
      if (tradesRes.error) throw tradesRes.error;
      if (journalRes.error) throw journalRes.error;

      const trades: DisciplineTrade[] = (tradesRes.data ?? []).map((t) => ({
        id: String(t.id),
        symbol: t.symbol ?? null,
        entryDate: t.entry_date ?? null,
        exitDate: t.exit_date ?? null,
        status: t.status ?? null,
        setupType: t.setup_type ?? null,
        initialDollarRisk: t.initial_dollar_risk ?? null,
        realizedPl: t.realized_pl ?? null,
        stopPrice: t.stop_price ?? null,
        originalStop: t.original_stop ?? null,
        entryPrice: t.entry_price ?? null,
        rulesFollowed: t.rules_followed ?? null,
        readinessScore: t.readiness_score ?? null,
        earningsWithinHold: t.earnings_within_hold ?? null,
        eventDecision: t.event_decision ?? null,
        revalidatedAt: t.revalidated_at ?? null,
        exitReason: t.exit_reason ?? null,
      }));

      const journal: DisciplineJournalEntry[] = (journalRes.data ?? []).map((j) => ({
        id: String(j.id),
        symbol: j.symbol ?? null,
        entryDate: j.entry_date ?? null,
        rulesFollowed: j.rules_followed ?? null,
        followedStopRule: j.followed_stop_rule ?? null,
        widenedStop: j.widened_stop ?? null,
        stopMoved: j.stop_moved ?? null,
        mistakes: j.mistakes ?? null,
        resultR: j.result_r ?? null,
      }));

      return assessDiscipline(trades, journal);
    },
  });

  return { report: query.data ?? null, isLoading: query.isLoading, error: query.error };
}

/** Past mentor verdicts, newest first. */
export function useMentorVerdicts(limit = 10) {
  const { household } = useHousehold();
  const householdId = household?.id ?? null;

  const query = useQuery({
    queryKey: ['se-mentor-verdicts', householdId, limit],
    enabled: !!householdId,
    staleTime: 30_000,
    queryFn: async (): Promise<MentorVerdictRow[]> => {
      const { data, error } = await supabase
        .from('se_mentor_verdicts')
        .select('id, created_at, scope, page, symbol, verdict, discipline_score, headline, acknowledged_at')
        .eq('household_id', householdId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as MentorVerdictRow[];
    },
  });

  return { verdicts: query.data ?? [], isLoading: query.isLoading };
}

export interface AskMentorInput {
  scope: MentorScope;
  page: string;
  symbol?: string | null;
  context?: Record<string, unknown> | null;
  question?: string | null;
}

/** Ask the mentor, then record the verdict against the household. */
export function useAskMentor() {
  const { household } = useHousehold();
  const householdId = household?.id ?? null;
  const queryClient = useQueryClient();
  const { report } = useDisciplineReport();
  const { verdicts } = useMentorVerdicts(6);
  const [result, setResult] = useState<MentorResult | null>(null);

  const history = useMemo(
    () =>
      verdicts.map((v) => ({
        when: v.created_at,
        scope: v.scope,
        symbol: v.symbol,
        verdict: v.verdict,
        headline: v.headline,
      })),
    [verdicts],
  );

  const mutation = useMutation({
    mutationFn: async (input: AskMentorInput): Promise<MentorResult> => {
      const { data, error } = await supabase.functions.invoke('swingedge-mentor', {
        body: {
          scope: input.scope,
          page: input.page,
          symbol: input.symbol ?? null,
          context: input.context ?? null,
          discipline: report
            ? {
                score: report.score,
                scored: report.scored,
                tradesConsidered: report.tradesConsidered,
                closedTrades: report.closedTrades,
                medianRisk: report.medianRisk,
                findings: report.findings,
                clean: report.clean,
                notRecorded: report.notRecorded,
              }
            : null,
          history,
          question: input.question ?? null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const parsed = data as MentorResult;

      if (householdId) {
        const { data: auth } = await supabase.auth.getUser();
        const { error: saveError } = await supabase.from('se_mentor_verdicts').insert({
          household_id: householdId,
          created_by: auth?.user?.id ?? null,
          scope: input.scope,
          page: input.page,
          symbol: input.symbol ?? null,
          verdict: parsed.verdict ?? null,
          discipline_score: report?.scored ? report.score : null,
          headline: parsed.headline ?? null,
          rule_breaks: parsed.rule_breaks ?? [],
          emotional_flags: parsed.emotional_flags ?? [],
          coaching: parsed.doing_well ?? [],
          payload: parsed as unknown as Record<string, unknown>,
        });
        if (saveError) console.error('Could not save the mentor verdict:', saveError.message);
        queryClient.invalidateQueries({ queryKey: ['se-mentor-verdicts'] });
      }

      setResult(parsed);
      return parsed;
    },
  });

  const ask = useCallback((input: AskMentorInput) => mutation.mutateAsync(input), [mutation]);

  return {
    ask,
    result,
    report,
    verdicts,
    isAsking: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
}

/** Mark a verdict as read so it stops being surfaced as outstanding. */
export function useAcknowledgeVerdict() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('se_mentor_verdicts')
        .update({ acknowledged_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['se-mentor-verdicts'] }),
  });
}

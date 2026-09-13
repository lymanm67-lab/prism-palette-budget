// SwingEdge — recall hook: what happened the last times this symbol or setup
// was traded. Reads recorded paper trades and journal notes only.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import {
  buildTrackRecord,
  type TrackRecord,
  type TrackRecordJournalInput,
  type TrackRecordTradeInput,
} from '@/lib/swingedge/trackRecord';

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export function useTrackRecord(symbol: string | null, setup: string | null, limit = 3) {
  const { household } = useHousehold();
  const householdId = household?.id;

  const query = useQuery({
    queryKey: ['se-track-record', householdId],
    enabled: !!householdId,
    staleTime: 60_000,
    queryFn: async (): Promise<{
      trades: TrackRecordTradeInput[];
      journal: TrackRecordJournalInput[];
    }> => {
      const [tradesRes, journalRes] = await Promise.all([
        supabase
          .from('se_paper_trades')
          .select(
            'id, symbol, setup_type, status, entry_date, exit_date, exit_price, exit_reason, realized_pl, initial_dollar_risk, rules_followed',
          )
          .eq('household_id', householdId!)
          .order('exit_date', { ascending: false }),
        supabase
          .from('se_journal_entries')
          .select('paper_trade_id, symbol, lessons, mistakes, result_r')
          .eq('household_id', householdId!),
      ]);
      if (tradesRes.error) throw tradesRes.error;
      if (journalRes.error) throw journalRes.error;

      return {
        trades: (tradesRes.data ?? []).map((t) => ({
          id: t.id,
          symbol: t.symbol,
          setup_type: t.setup_type,
          status: t.status,
          entry_date: t.entry_date,
          exit_date: t.exit_date,
          exit_price: num(t.exit_price),
          exit_reason: t.exit_reason,
          realized_pl: num(t.realized_pl),
          initial_dollar_risk: num(t.initial_dollar_risk),
          rules_followed: t.rules_followed,
        })),
        journal: (journalRes.data ?? []).map((j) => ({
          paper_trade_id: j.paper_trade_id,
          symbol: j.symbol,
          lessons: j.lessons,
          mistakes: j.mistakes,
          result_r: num(j.result_r),
        })),
      };
    },
  });

  const record: TrackRecord = useMemo(
    () =>
      buildTrackRecord(
        query.data?.trades ?? [],
        query.data?.journal ?? [],
        symbol,
        setup,
        limit,
      ),
    [query.data, symbol, setup, limit],
  );

  return { record, isLoading: query.isLoading, error: query.error as Error | null };
}

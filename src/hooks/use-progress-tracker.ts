import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

export interface ProgressStats {
  totalDays: number;
  daysWithinBudget: number;
  daysMissed: number;
  currentStreak: number;
  longestStreak: number;
  dayNumber: number; // Day X of 90
  progressPercent: number;
  history: { date: string; within_budget: boolean }[];
}

export function useDailyProgress() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['daily-progress', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_progress' as any)
        .select('*')
        .eq('household_id', household!.id)
        .order('date', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useRecordDailyProgress() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: { date: string; safe_to_spend: number; actual_spent: number; within_budget: boolean; mode: string }) => {
      const { data, error } = await supabase
        .from('daily_progress' as any)
        .upsert(
          { household_id: household!.id, ...entry },
          { onConflict: 'household_id,date' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-progress'] }),
  });
}

export function useProgressStats(): ProgressStats {
  const { data: progress } = useDailyProgress();

  return useMemo(() => {
    const entries = progress || [];
    const totalDays = entries.length;
    const daysWithinBudget = entries.filter((e: any) => e.within_budget).length;
    const daysMissed = totalDays - daysWithinBudget;

    // Streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < entries.length; i++) {
      if ((entries[i] as any).within_budget) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    // Current streak = streak from the end
    for (let i = entries.length - 1; i >= 0; i--) {
      if ((entries[i] as any).within_budget) currentStreak++;
      else break;
    }

    const dayNumber = Math.min(totalDays + 1, 90); // Current day of 90
    const progressPercent = Math.min(100, (daysWithinBudget / 90) * 100);

    return {
      totalDays,
      daysWithinBudget,
      daysMissed,
      currentStreak,
      longestStreak,
      dayNumber: totalDays === 0 ? 1 : dayNumber,
      progressPercent,
      history: entries.map((e: any) => ({ date: e.date, within_budget: e.within_budget })),
    };
  }, [progress]);
}

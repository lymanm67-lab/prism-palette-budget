import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useTransactions } from '@/hooks/use-finance-data';

// ==================== SETTINGS CRUD ====================

export function useGuardrailSettings() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['guardrail-settings', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guardrail_settings' as any)
        .select('*')
        .eq('household_id', household!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any | null;
    },
  });
}

export function useUpsertGuardrailSettings() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: { daily_limit?: number | null; weekly_limit?: number | null; is_enabled?: boolean }) => {
      const { data: existing } = await supabase
        .from('guardrail_settings' as any)
        .select('id')
        .eq('household_id', household!.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('guardrail_settings' as any)
          .update(settings)
          .eq('id', (existing as any).id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('guardrail_settings' as any)
          .insert({ household_id: household!.id, ...settings })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guardrail-settings'] }),
  });
}

// ==================== SPENDING CALCULATIONS ====================

export interface GuardrailStatus {
  dailySpent: number;
  weeklySpent: number;
  dailyLimit: number | null;
  weeklyLimit: number | null;
  dailyPercent: number;
  weeklyPercent: number;
  dailyThreshold: 'green' | 'yellow' | 'red';
  weeklyThreshold: 'green' | 'yellow' | 'red';
  isEnabled: boolean;
  daysUntilExceed: number | null;
  weekdaysLeft: number;
  dailyBudgetRemaining: number | null;
  weeklyBudgetRemaining: number | null;
  daysWithinBudget: number;
  totalDaysTracked: number;
}

function getThreshold(percent: number): 'green' | 'yellow' | 'red' {
  if (percent >= 100) return 'red';
  if (percent >= 70) return 'yellow';
  return 'green';
}

export function useSpendGuardrails(): GuardrailStatus {
  const { data: settings } = useGuardrailSettings();
  const { data: transactions } = useTransactions();

  return useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Week boundaries (Monday–Sunday)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    const mondayStr = monday.toISOString().split('T')[0];

    const weekdaysLeft = 7 - mondayOffset - 1; // days remaining after today
    const daysSoFar = mondayOffset + 1;

    const dailyLimit = settings?.daily_limit ?? null;
    const weeklyLimit = settings?.weekly_limit ?? null;
    const isEnabled = settings?.is_enabled ?? false;

    // Filter expense transactions
    const expenses = (transactions || []).filter(t => t.amount < 0 && !t.is_transfer);

    const dailySpent = expenses
      .filter(t => t.date === todayStr)
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const weeklySpent = expenses
      .filter(t => t.date >= mondayStr && t.date <= todayStr)
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const dailyPercent = dailyLimit ? (dailySpent / dailyLimit) * 100 : 0;
    const weeklyPercent = weeklyLimit ? (weeklySpent / weeklyLimit) * 100 : 0;

    // Predictive: at current pace, how many days until weekly limit exceeded
    let daysUntilExceed: number | null = null;
    if (weeklyLimit && daysSoFar > 0) {
      const avgDailySpend = weeklySpent / daysSoFar;
      if (avgDailySpend > 0) {
        const remaining = weeklyLimit - weeklySpent;
        daysUntilExceed = remaining > 0 ? Math.floor(remaining / avgDailySpend) : 0;
      }
    }

    // Days within budget this week
    const dailySpendMap = new Map<string, number>();
    for (const t of expenses) {
      if (t.date >= mondayStr && t.date <= todayStr) {
        dailySpendMap.set(t.date, (dailySpendMap.get(t.date) || 0) + Math.abs(t.amount));
      }
    }
    let daysWithinBudget = 0;
    for (let i = 0; i < daysSoFar; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      const daySpend = dailySpendMap.get(ds) || 0;
      if (!dailyLimit || daySpend <= dailyLimit) daysWithinBudget++;
    }

    return {
      dailySpent,
      weeklySpent,
      dailyLimit,
      weeklyLimit,
      dailyPercent,
      weeklyPercent,
      dailyThreshold: getThreshold(dailyPercent),
      weeklyThreshold: getThreshold(weeklyPercent),
      isEnabled,
      daysUntilExceed,
      weekdaysLeft,
      dailyBudgetRemaining: dailyLimit ? Math.max(0, dailyLimit - dailySpent) : null,
      weeklyBudgetRemaining: weeklyLimit ? Math.max(0, weeklyLimit - weeklySpent) : null,
      daysWithinBudget,
      totalDaysTracked: daysSoFar,
    };
  }, [settings, transactions]);
}

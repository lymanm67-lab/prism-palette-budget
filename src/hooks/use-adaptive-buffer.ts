import { useMemo } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useTransactions, useAccounts } from '@/hooks/use-finance-data';
import { useSubscriptions } from '@/hooks/use-subscriptions';
import { useRecurringTransactions } from '@/hooks/use-recurring';
import { useModeSettings } from '@/hooks/use-financial-mode';
import { toast } from 'sonner';

export interface BufferTrigger {
  key: string;
  label: string;
  weight: number; // 0-20 buffer points added
  detail?: string;
}

export interface AdaptiveBufferResult {
  tier: 10 | 15 | 20 | 25 | 30;
  score: number;
  triggers: BufferTrigger[];
  explanation: string;
}

function tierFromScore(score: number): 10 | 15 | 20 | 25 | 30 {
  if (score >= 35) return 30;
  if (score >= 25) return 25;
  if (score >= 15) return 20;
  if (score >= 7) return 15;
  return 10;
}

export function useAdaptiveBuffer(): AdaptiveBufferResult {
  const { data: txns } = useTransactions();
  const { data: accounts } = useAccounts();
  const { data: subs } = useSubscriptions();
  const { data: recurring } = useRecurringTransactions();

  return useMemo(() => {
    const triggers: BufferTrigger[] = [];
    const now = Date.now();
    const cutoff90 = now - 90 * 86400_000;

    const recent = (txns || []).filter(t => !t.is_transfer && new Date(t.date).getTime() >= cutoff90);

    // 1) Overdraft / NSF history (last 90d)
    const overdrafts = recent.filter(t => /overdraft|nsf|insufficient/i.test(`${t.merchant || ''}`));
    if (overdrafts.length > 0) {
      triggers.push({ key: 'overdraft', label: 'Recent overdraft activity', weight: 12, detail: `${overdrafts.length} in 90d` });
    }

    // 2) Late fees (last 90d)
    const lateFees = recent.filter(t => /late\s*fee|past\s*due/i.test(`${t.merchant || ''}`));
    if (lateFees.length > 0) {
      triggers.push({ key: 'late_fee', label: 'Recent late fees', weight: 8, detail: `${lateFees.length} in 90d` });
    }

    // 3) Low cash buffer (cash < 1 month of bills)
    const cash = (accounts || []).filter((a: any) => ['checking', 'savings', 'cash'].includes(a.type || a.subtype || '')).reduce((s: number, a: any) => s + Number(a.balance || 0), 0);
    const monthlyRecurring = (recurring || []).reduce((s: number, r: any) => s + Math.abs(Number(r.amount || 0)), 0);
    if (monthlyRecurring > 0 && cash < monthlyRecurring) {
      triggers.push({ key: 'low_cash', label: 'Cash is below one month of bills', weight: 10, detail: `Cash ${Math.round(cash)} vs bills ${Math.round(monthlyRecurring)}` });
    }

    // 4) Income variance — std dev / mean of last 6 income txns
    const incomeTxns = recent.filter(t => Number(t.amount) > 0).map(t => Number(t.amount));
    if (incomeTxns.length >= 3) {
      const mean = incomeTxns.reduce((a, b) => a + b, 0) / incomeTxns.length;
      const variance = incomeTxns.reduce((s, x) => s + (x - mean) ** 2, 0) / incomeTxns.length;
      const cv = Math.sqrt(variance) / (mean || 1);
      if (cv > 0.35) {
        triggers.push({ key: 'variable_income', label: 'Variable income detected', weight: 8, detail: `${Math.round(cv * 100)}% variance` });
      }
    }

    // 5) Subscription density — many active subs
    const activeSubs = (subs || []).filter((s: any) => s.is_active && !s.is_cancelled);
    if (activeSubs.length >= 10) {
      triggers.push({ key: 'sub_density', label: 'High subscription density', weight: 5, detail: `${activeSubs.length} active` });
    }

    // 6) Large upcoming bill within 14 days > 25% of monthly bills
    const soon = (recurring || []).filter((r: any) => r.next_due_date && new Date(r.next_due_date).getTime() - now < 14 * 86400_000);
    const largeBill = soon.find((r: any) => monthlyRecurring > 0 && Math.abs(Number(r.amount || 0)) > monthlyRecurring * 0.25);
    if (largeBill) {
      triggers.push({ key: 'large_bill', label: 'Large bill within 2 weeks', weight: 6, detail: `${largeBill.merchant}` });
    }

    // 7) Recent spending spike — last 14d vs prior 14d
    const last14 = recent.filter(t => Number(t.amount) < 0 && new Date(t.date).getTime() >= now - 14 * 86400_000);
    const prev14 = recent.filter(t => Number(t.amount) < 0 && new Date(t.date).getTime() < now - 14 * 86400_000 && new Date(t.date).getTime() >= now - 28 * 86400_000);
    const sumLast = last14.reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    const sumPrev = prev14.reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    if (sumPrev > 0 && sumLast / sumPrev > 1.3) {
      triggers.push({ key: 'spending_spike', label: 'Spending up 30%+ vs prior 2 weeks', weight: 6, detail: `${Math.round((sumLast / sumPrev - 1) * 100)}% higher` });
    }

    const score = triggers.reduce((s, t) => s + t.weight, 0);
    const tier = tierFromScore(score);

    let explanation: string;
    if (tier <= 10) explanation = 'Your finances look steady — a minimum buffer keeps Safe-to-Spend honest without being overly cautious.';
    else if (tier <= 15) explanation = 'Mild risk signals — keeping a modest buffer protects against small surprises.';
    else if (tier <= 20) explanation = 'Several factors suggest holding back more headroom this cycle.';
    else if (tier <= 25) explanation = 'Multiple risks stacked up — a stronger buffer protects your next paycheck.';
    else explanation = 'High-risk window — Coach recommends the strongest buffer until conditions improve.';

    return { tier, score, triggers, explanation };
  }, [txns, accounts, subs, recurring]);
}

export function useApplyAdaptiveBuffer() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ mode, percent, triggers }: { mode: 'manual' | 'adaptive'; percent?: number; triggers?: BufferTrigger[] }) => {
      const { data: existing } = await supabase
        .from('financial_mode_settings' as any)
        .select('id').eq('household_id', household!.id).maybeSingle();

      const patch: any = { buffer_mode: mode };
      if (typeof percent === 'number') patch.buffer_percent = percent;
      if (triggers) patch.buffer_triggers = triggers;
      if (mode === 'adaptive') patch.buffer_last_computed_at = new Date().toISOString();

      if (existing) {
        const { error } = await supabase.from('financial_mode_settings' as any).update(patch).eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('financial_mode_settings' as any).insert({ household_id: household!.id, ...patch });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.mode === 'adaptive' ? 'Adaptive buffer applied' : 'Manual buffer applied');
      qc.invalidateQueries({ queryKey: ['financial-mode'] });
      qc.invalidateQueries({ queryKey: ['safe-to-spend'] });
    },
    onError: (e: any) => toast.error(e.message || 'Could not save buffer'),
  });
}

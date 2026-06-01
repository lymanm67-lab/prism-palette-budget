import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeToSpend } from '@/hooks/use-safe-to-spend';
import { useSubscriptions } from '@/hooks/use-subscriptions';
import { useGoals } from '@/hooks/use-goals';
import { useDebtPlans } from '@/hooks/use-debt-plans';

// ---------- FOMO detection ----------
const FOMO_PATTERNS = [
  { rx: /\b(limited time|last chance|ends (today|tonight|soon)|deal expires)\b/i, label: 'Urgency cue' },
  { rx: /\b(only \d+ left|while supplies last|selling fast|low stock)\b/i, label: 'Scarcity cue' },
  { rx: /\b(i deserve|treat myself|earned it|reward myself)\b/i, label: 'Emotional reward' },
  { rx: /\b(everyone (has|is)|all my friends|going viral|trending)\b/i, label: 'Social pressure' },
  { rx: /\b(flash sale|black friday|cyber|prime day|doorbuster)\b/i, label: 'Sale event' },
  { rx: /\b(impulse|just because|why not|yolo)\b/i, label: 'Impulse language' },
];

export function detectFomo(text: string): string[] {
  if (!text) return [];
  const signals = new Set<string>();
  for (const p of FOMO_PATTERNS) if (p.rx.test(text)) signals.add(p.label);
  return Array.from(signals);
}

// ---------- Fit Score ----------
export interface FitInput {
  amount: number;
  classification: 'need' | 'want' | 'strategic';
  fomoCount: number;
  safeToSpendMonthly: number;
  monthlyIncome: number;
  hasHighInterestDebt: boolean;
  hasUnderfundedGoal: boolean;
  bufferPercent: number;
}
export interface FitResult {
  score: number;
  breakdown: Array<{ label: string; delta: number; reason: string }>;
  verdict: 'great-fit' | 'ok-fit' | 'risky' | 'wait';
}

export function computeFitScore(input: FitInput): FitResult {
  const breakdown: FitResult['breakdown'] = [];
  let score = 60; // neutral baseline

  // Classification weight
  if (input.classification === 'need') { score += 20; breakdown.push({ label: 'Classified as need', delta: +20, reason: 'Needs protect your plan.' }); }
  if (input.classification === 'strategic') { score += 10; breakdown.push({ label: 'Strategic investment', delta: +10, reason: 'Adds to assets, skills, or income.' }); }
  if (input.classification === 'want') { score -= 5; breakdown.push({ label: 'Classified as want', delta: -5, reason: 'Wants are fine — but they compete with goals.' }); }

  // Affordability vs Safe-to-Spend
  if (input.safeToSpendMonthly > 0) {
    const pct = (input.amount / input.safeToSpendMonthly) * 100;
    if (pct < 5) { score += 10; breakdown.push({ label: 'Fits easily in Safe-to-Spend', delta: +10, reason: `${pct.toFixed(0)}% of monthly Safe-to-Spend.` }); }
    else if (pct < 20) { score += 0; breakdown.push({ label: 'Moderate share of Safe-to-Spend', delta: 0, reason: `${pct.toFixed(0)}% of monthly Safe-to-Spend.` }); }
    else if (pct < 50) { score -= 15; breakdown.push({ label: 'Large share of Safe-to-Spend', delta: -15, reason: `${pct.toFixed(0)}% of monthly Safe-to-Spend.` }); }
    else { score -= 30; breakdown.push({ label: 'Exceeds safe headroom', delta: -30, reason: `${pct.toFixed(0)}% of monthly Safe-to-Spend.` }); }
  } else {
    score -= 10; breakdown.push({ label: 'Safe-to-Spend unknown', delta: -10, reason: 'Not enough data to gauge headroom.' });
  }

  // FOMO penalty
  if (input.fomoCount > 0) {
    const penalty = Math.min(20, input.fomoCount * 8);
    score -= penalty;
    breakdown.push({ label: 'FOMO signals detected', delta: -penalty, reason: `${input.fomoCount} urgency or pressure cue${input.fomoCount === 1 ? '' : 's'} in your reason.` });
  }

  // Competing priorities
  if (input.hasHighInterestDebt && input.classification !== 'need') {
    score -= 10; breakdown.push({ label: 'High-interest debt active', delta: -10, reason: 'Every $ on a want is a $ not on debt.' });
  }
  if (input.hasUnderfundedGoal && input.classification === 'want') {
    score -= 5; breakdown.push({ label: 'Underfunded goal', delta: -5, reason: 'A goal is currently behind plan.' });
  }

  // Buffer protection bonus
  if (input.bufferPercent >= 20) { score += 5; breakdown.push({ label: 'Strong Smart Buffer', delta: +5, reason: `${input.bufferPercent}% buffer keeps you protected.` }); }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const verdict: FitResult['verdict'] = score >= 80 ? 'great-fit' : score >= 60 ? 'ok-fit' : score >= 40 ? 'risky' : 'wait';
  return { score, breakdown, verdict };
}

// ---------- Hooks ----------
export function usePurchaseGuardChecks(limit = 20) {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['purchase-guard-checks', household?.id, limit],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_guard_checks')
        .select('*')
        .eq('household_id', household!.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreatePurchaseGuardCheck() {
  const { household } = useHousehold();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      amount: number;
      merchant?: string;
      purpose: string;
      classification: 'need' | 'want' | 'strategic';
      fit_score: number;
      fit_breakdown: any;
      fomo_signals: string[];
      wait_required_hours: number;
      decision: 'pending' | 'approved' | 'waiting' | 'skipped' | 'overridden' | 'planned';
      override_reason?: string;
      planned_target_date?: string;
      strategic_proof?: any;
      swap_subscription_id?: string;
    }) => {
      const wait_until = input.wait_required_hours > 0
        ? new Date(Date.now() + input.wait_required_hours * 3600_000).toISOString()
        : null;
      const decided_at = ['approved', 'skipped', 'overridden', 'planned'].includes(input.decision)
        ? new Date().toISOString() : null;
      const post_review_due_at = input.decision === 'approved' || input.decision === 'overridden'
        ? new Date(Date.now() + 7 * 86400_000).toISOString() : null;

      const { data, error } = await supabase
        .from('purchase_guard_checks')
        .insert({
          household_id: household!.id,
          user_id: user!.id,
          fomo_detected: input.fomo_signals.length > 0,
          wait_until,
          decided_at,
          post_review_due_at,
          ...input,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-guard-checks'] }),
  });
}

export function useUpdatePurchaseGuardCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; [k: string]: any }) => {
      const { error } = await supabase
        .from('purchase_guard_checks')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-guard-checks'] }),
  });
}

// Detect override pattern: 2+ overrides in last 6 months
export function useOverridePattern() {
  const { data } = usePurchaseGuardChecks(100);
  const sixMonthsAgo = Date.now() - 180 * 86400_000;
  const overrides = (data || []).filter(
    (c: any) => c.decision === 'overridden' && new Date(c.created_at).getTime() > sixMonthsAgo,
  );
  return {
    count: overrides.length,
    hasPattern: overrides.length >= 2,
    recent: overrides.slice(0, 3),
  };
}

// Pull context for the Fit Score
export function usePurchaseGuardContext() {
  const sts = useSafeToSpend('personal');
  const { data: subs } = useSubscriptions();
  const { data: goals } = useGoals();
  const { data: debts } = useDebtPlans();

  const hasHighInterestDebt = (debts || []).some((d: any) =>
    (d.apr ?? d.interest_rate ?? 0) >= 10 && (d.current_balance ?? d.balance ?? 0) > 0,
  );
  const hasUnderfundedGoal = (goals || []).some((g: any) => {
    const target = g.target_amount ?? 0;
    const current = g.current_amount ?? 0;
    const deadline = g.target_date ? new Date(g.target_date).getTime() : 0;
    return target > 0 && current < target * 0.5 && deadline > Date.now();
  });

  const activeSubs = (subs || [])
    .filter((s: any) => s.is_active && !s.is_cancelled)
    .map((s: any) => ({ id: s.id, merchant: s.merchant, monthly: Math.abs(s.average_amount || 0) }))
    .sort((a: any, b: any) => b.monthly - a.monthly);

  return {
    safeToSpendMonthly: sts.monthly,
    monthlyIncome: sts.monthlyIncome,
    bufferPercent: sts.bufferPercent,
    hasHighInterestDebt,
    hasUnderfundedGoal,
    activeSubs,
  };
}

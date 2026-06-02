import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PoolEntry {
  app_name: string;
  amount_usd: number;
  credits_used: number;
  created_at: string;
  note: string | null;
  source: string;
}

export interface PoolAppSummary {
  app_name: string;
  amount_usd: number;
  credits_used: number;
  count: number;
}

export interface PoolSummary {
  isLoading: boolean;
  entries: PoolEntry[];
  byApp: PoolAppSummary[];
  totalUsd: number;
  totalCredits: number;
  spendLimit: number;
  creditLimit: number;
  spendPct: number;
  creditPct: number;
  worstPct: number;
  status: 'ok' | 'warn' | 'over';
  periodLabel: string;
}

const SPEND_LIMIT = 100;
const CREDIT_LIMIT = 400;

export function useAppDevPool(): PoolSummary {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['app-dev-pool', user?.email],
    enabled: !!user?.email,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) return { entries: [] as PoolEntry[] };
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/app-dev-pool`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`pool fetch failed: ${res.status}`);
      return (await res.json()) as { entries: PoolEntry[] };
    },
  });

  return useMemo(() => {
    const entries = data?.entries ?? [];
    const map = new Map<string, PoolAppSummary>();
    let totalUsd = 0;
    let totalCredits = 0;
    for (const e of entries) {
      totalUsd += Number(e.amount_usd) || 0;
      totalCredits += Number(e.credits_used) || 0;
      const cur = map.get(e.app_name) ?? { app_name: e.app_name, amount_usd: 0, credits_used: 0, count: 0 };
      cur.amount_usd += Number(e.amount_usd) || 0;
      cur.credits_used += Number(e.credits_used) || 0;
      cur.count += 1;
      map.set(e.app_name, cur);
    }
    const byApp = Array.from(map.values()).sort((a, b) => b.amount_usd - a.amount_usd);
    const spendPct = (totalUsd / SPEND_LIMIT) * 100;
    const creditPct = (totalCredits / CREDIT_LIMIT) * 100;
    const worstPct = Math.max(spendPct, creditPct);
    const status: 'ok' | 'warn' | 'over' = worstPct >= 100 ? 'over' : worstPct >= 70 ? 'warn' : 'ok';
    const now = new Date();
    const periodLabel = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    return {
      isLoading,
      entries,
      byApp,
      totalUsd,
      totalCredits,
      spendLimit: SPEND_LIMIT,
      creditLimit: CREDIT_LIMIT,
      spendPct,
      creditPct,
      worstPct,
      status,
      periodLabel,
    };
  }, [data, isLoading]);
}

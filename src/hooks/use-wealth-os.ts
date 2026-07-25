import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

const sb = supabase as any;

const LIAB_TYPES = new Set(['credit', 'loan', 'credit_card', 'mortgage']);

export interface WealthOSData {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  buckets: {
    retirement: number;
    business: number;
    realEstate: number;
    intellectualProperty: number;
    personalProperty: number;
    brokerage: number;
    hsa: number;
    emergency: number;
  };
  liabilities: { name: string; balance: number }[];
  estate: { complete: number; total: number; pct: number };
  history: { date: string; netWorth: number }[];
}

function bucketFor(name: string, type: string) {
  const n = name.toLowerCase();
  const t = type.toLowerCase();
  if (/intellectual|ip\b|royalt|patent|trademark/.test(n)) return 'intellectualProperty';
  if (/business|llc|holdings|equity in/.test(n)) return 'business';
  if (/real.?estate|home|house|property|cambridge|allies/.test(n)) return 'realEstate';
  if (/hsa/.test(n)) return 'hsa';
  if (/emergency/.test(n)) return 'emergency';
  if (/vehicle|car|jaguar|jewel|firearm|personal property|collect/.test(n)) return 'personalProperty';
  if (/brokerage|taxable/.test(n)) return 'brokerage';
  if (/401|403|457|ira|roth|pension|retire/.test(n) || t === 'investment') return 'retirement';
  if (t === 'savings' || t === 'checking' || t === 'cash') return 'emergency';
  return 'brokerage';
}

export function useWealthOSData() {
  const { household } = useHousehold();
  return useQuery<WealthOSData>({
    queryKey: ['wealth_os_data', household?.id],
    enabled: !!household,
    staleTime: 60_000,
    queryFn: async () => {
      const hid = household!.id;
      const { data: planRows } = await sb.from('debt_plans').select('id').eq('household_id', hid);
      const planIds = (planRows || []).map((p: any) => p.id);

      const [accounts, debts, estate, snaps] = await Promise.all([
        sb.from('accounts').select('name,account_type,balance').eq('household_id', hid).is('deleted_at', null),
        planIds.length
          ? sb.from('debt_items').select('name,balance').in('plan_id', planIds)
          : Promise.resolve({ data: [] }),
        sb.from('estate_planning_checklist').select('item_key,is_complete').eq('household_id', hid),
        sb.from('legacy_worth_snapshots').select('snapshot_date,net_worth').eq('household_id', hid).order('snapshot_date').limit(400),
      ]);

      const buckets = {
        retirement: 0, business: 0, realEstate: 0, intellectualProperty: 0,
        personalProperty: 0, brokerage: 0, hsa: 0, emergency: 0,
      };
      let totalAssets = 0;
      const liabilities: { name: string; balance: number }[] = [];

      for (const a of accounts.data || []) {
        const type = String(a.account_type || '');
        const bal = Number(a.balance || 0);
        if (LIAB_TYPES.has(type.toLowerCase())) {
          liabilities.push({ name: a.name || 'Account', balance: Math.abs(bal) });
        } else {
          totalAssets += bal;
          (buckets as any)[bucketFor(String(a.name || ''), type)] += bal;
        }
      }
      for (const d of debts.data || []) {
        liabilities.push({ name: d.name || 'Debt', balance: Number(d.balance || 0) });
      }

      const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
      const est = estate.data || [];
      const complete = est.filter((e: any) => e.is_complete).length;

      return {
        netWorth: totalAssets - totalLiabilities,
        totalAssets,
        totalLiabilities,
        buckets,
        liabilities: liabilities.sort((a, b) => b.balance - a.balance),
        estate: { complete, total: est.length || 10, pct: est.length ? (complete / est.length) * 100 : 0 },
        history: (snaps.data || [])
          .filter((s: any) => s.net_worth != null)
          .map((s: any) => ({ date: s.snapshot_date, netWorth: Number(s.net_worth) })),
      };
    },
  });
}

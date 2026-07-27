import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { makeDebtDeduper } from '@/lib/liability-dedupe';



const sb = supabase as any;

const LIAB_TYPES = new Set(['credit', 'loan', 'credit_card', 'mortgage']);

export type Owner = 'lyman' | 'kateri' | 'joint';
export type Classification = 'Individual' | 'Separate Property' | 'Joint Household';

export interface HouseholdAsset {
  id?: string;
  name: string;
  balance: number;
  owner: Owner;
  ownerTag?: Owner | null;
  ownerLabel: string;
  classification: Classification;
  bucket: string;
}


export interface Buckets {
  retirement: number;
  business: number;
  realEstate: number;
  intellectualProperty: number;
  personalProperty: number;
  vehicles: number;
  brokerage: number;
  hsa: number;
  emergency: number;
  cash: number;
}

export interface WealthOSData {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  buckets: Buckets;
  byOwner: Record<Owner, { total: number; buckets: Buckets; assets: HouseholdAsset[] }>;
  assets: HouseholdAsset[];
  vehicles: HouseholdAsset[];
  realEstate: HouseholdAsset[];
  retirementAssets: HouseholdAsset[];
  liabilities: { name: string; balance: number }[];
  estate: { complete: number; total: number; pct: number };
  history: { date: string; netWorth: number }[];
  untaggedAssets: number;
}


const emptyBuckets = (): Buckets => ({
  retirement: 0, business: 0, realEstate: 0, intellectualProperty: 0,
  personalProperty: 0, vehicles: 0, brokerage: 0, hsa: 0, emergency: 0, cash: 0,
});

export const BUCKET_LABELS: Record<keyof Buckets, string> = {
  retirement: 'Retirement Assets',
  business: 'Business Interests',
  intellectualProperty: 'Intellectual Property',
  realEstate: 'Real Estate',
  vehicles: 'Vehicles',
  personalProperty: 'Personal Property',
  brokerage: 'Brokerage',
  hsa: 'HSA',
  emergency: 'Emergency Fund',
  cash: 'Cash',
};

function bucketFor(name: string, type: string): keyof Buckets {
  const n = name.toLowerCase();
  const t = type.toLowerCase();
  if (/intellectual|ip\b|royalt|patent|trademark/.test(n)) return 'intellectualProperty';
  if (/business|llc|holdings|equity in/.test(n)) return 'business';
  if (/real.?estate|home|house|property|cambridge|allies|street|avenue/.test(n)) return 'realEstate';
  if (/hsa/.test(n)) return 'hsa';
  if (/jaguar|equinox|vehicle|\bcar\b|truck|suv/.test(n)) return 'vehicles';
  if (/emergency/.test(n)) return 'emergency';
  if (/jewel|firearm|personal property|collect/.test(n)) return 'personalProperty';
  if (/brokerage|taxable|self-directed|schwab/.test(n)) return 'brokerage';
  if (/401|403|457|ira|roth|pension|retire|opers|deferred comp/.test(n) || t === 'investment') return 'retirement';
  if (t === 'savings' || t === 'checking' || t === 'cash') return 'cash';
  return 'brokerage';
}

const OWNER_META: Record<Owner, { classification: Classification; label: string }> = {
  lyman: { classification: 'Individual', label: 'Lyman Montgomery' },
  kateri: { classification: 'Separate Property', label: 'Kateri Montgomery' },
  joint: { classification: 'Joint Household', label: 'Joint Household' },
};

function ownerFor(
  institution: string | null,
  name: string,
  tag?: string | null,
): { owner: Owner; classification: Classification; label: string; tagged: boolean } {
  if (tag === 'lyman' || tag === 'kateri' || tag === 'joint') {
    return { owner: tag, ...OWNER_META[tag], tagged: true };
  }
  const src = `${institution || ''} ${name}`.toLowerCase();
  if (/kateri/.test(src)) return { owner: 'kateri', ...OWNER_META.kateri, tagged: false };
  if (/joint/.test(src)) return { owner: 'joint', ...OWNER_META.joint, tagged: false };
  return { owner: 'lyman', ...OWNER_META.lyman, tagged: false };
}


export function useWealthOSData() {
  const { household } = useHousehold();
  return useQuery<WealthOSData>({
    queryKey: ['wealth_os_data_v2', household?.id],
    enabled: !!household,
    staleTime: 60_000,
    queryFn: async () => {
      const hid = household!.id;
      const { data: planRows } = await sb.from('debt_plans').select('id').eq('household_id', hid);
      const planIds = (planRows || []).map((p: any) => p.id);

      const [accounts, debts, estate, snaps] = await Promise.all([
        sb.from('accounts').select('id,name,institution,account_type,balance,owner_tag').eq('household_id', hid).is('deleted_at', null),
        planIds.length
          ? sb.from('debt_items').select('name,balance').in('plan_id', planIds)
          : Promise.resolve({ data: [] }),
        sb.from('estate_planning_checklist').select('item_key,is_complete').eq('household_id', hid),
        sb.from('legacy_worth_snapshots').select('snapshot_date,net_worth').eq('household_id', hid).order('snapshot_date').limit(400),
      ]);

      const buckets = emptyBuckets();
      const byOwner: WealthOSData['byOwner'] = {
        lyman: { total: 0, buckets: emptyBuckets(), assets: [] },
        kateri: { total: 0, buckets: emptyBuckets(), assets: [] },
        joint: { total: 0, buckets: emptyBuckets(), assets: [] },
      };
      const assets: HouseholdAsset[] = [];
      let totalAssets = 0;
      let untagged = 0;
      const liabilities: { name: string; balance: number }[] = [];

      for (const a of accounts.data || []) {
        const type = String(a.account_type || '');
        const name = String(a.name || 'Account');
        const bal = Number(a.balance || 0);
        if (LIAB_TYPES.has(type.toLowerCase())) {
          liabilities.push({ name, balance: Math.abs(bal) });
          continue;
        }
        const bucket = bucketFor(name, type);
        const o = ownerFor(a.institution ?? null, name, a.owner_tag ?? null);
        if (!o.tagged) untagged += 1;
        const asset: HouseholdAsset = {
          id: a.id, name, balance: bal, bucket, ownerTag: (a.owner_tag ?? null) as any,
          owner: o.owner, ownerLabel: o.label, classification: o.classification,
        };
        assets.push(asset);
        totalAssets += bal;
        buckets[bucket] += bal;
        byOwner[o.owner].total += bal;
        byOwner[o.owner].buckets[bucket] += bal;
        byOwner[o.owner].assets.push(asset);
      }

      const keepDebt = makeDebtDeduper(liabilities.map((l) => l.name));
      for (const d of debts.data || []) {
        const dn = d.name || 'Debt';
        if (!keepDebt(dn)) continue; // already counted as an account liability
        liabilities.push({ name: dn, balance: Number(d.balance || 0) });
      }


      const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
      const est = estate.data || [];
      const complete = est.filter((e: any) => e.is_complete).length;
      const byBucket = (b: string) => assets.filter((a) => a.bucket === b).sort((x, y) => y.balance - x.balance);

      return {
        netWorth: totalAssets - totalLiabilities,
        totalAssets,
        totalLiabilities,
        buckets,
        byOwner,
        assets: assets.sort((a, b) => b.balance - a.balance),
        vehicles: byBucket('vehicles'),
        realEstate: byBucket('realEstate'),
        retirementAssets: byBucket('retirement'),
        liabilities: liabilities.sort((a, b) => b.balance - a.balance),
        estate: { complete, total: est.length || 10, pct: est.length ? (complete / est.length) * 100 : 0 },
        history: (snaps.data || [])
          .filter((s: any) => s.net_worth != null)
          .map((s: any) => ({ date: s.snapshot_date, netWorth: Number(s.net_worth) })),
        untaggedAssets: untagged,
      };

    },
  });
}

/** Persist the ownership classification for a single asset account. */
export function useSetAssetOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ accountId, owner }: { accountId: string; owner: Owner }) => {
      const { error } = await sb.from('accounts').update({ owner_tag: owner }).eq('id', accountId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wealth_os_data_v2'] }),
  });
}


import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from 'recharts';
import { GitBranch, Landmark, Lock } from 'lucide-react';
import {
  NW, NW_SURRENDER_NOTE, NW_SURRENDER_VALUES, NW_VALUE_PATHS, policyYearFor,
} from '@/lib/ltc/nationwide';
import { contractValue, DOUBLE_COUNT_RULES, FORBIDDEN_BUCKETS, NET_WORTH_BUCKET } from '@/lib/ltc/safeguards';
import { money, StatCard } from '../shared';
import { IllustrationTag, PlanningNotice } from './PlanningNotice';

export function PolicyValuePaths({
  includeSurrenderValue, onToggle,
}: { includeSurrenderValue: boolean; onToggle: (v: boolean) => void }) {
  const cv = contractValue({ includeSurrenderValueInNetWorth: includeSurrenderValue });
  const policyYear = policyYearFor(new Date().getFullYear());

  return (
    <div className="space-y-4">
      {/* ---------------- Three ways the policy creates value ---------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-prism-amber" /> Three Ways the Policy Can Create Value
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-center">
            <span className="font-semibold">Premiums Paid → LTC Protection</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {NW_VALUE_PATHS.map((p) => (
                <div key={p.key} className="rounded border border-border/60 bg-card/60 p-2">{p.branch}</div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {NW_VALUE_PATHS.map((p) => (
              <div key={p.key} className="rounded-lg border border-border/60 bg-card/60 p-3">
                <p className="text-sm font-semibold">{p.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{p.body}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Initial specified amount" value={`≈ ${money(NW.initialSpecifiedAmount)}`} sub="Life insurance component" />
            <StatCard label="Guaranteed minimum death benefit" value={`≈ ${money(NW.guaranteedMinimumDeathBenefit)}`} sub="If LTC benefits are fully used" />
            <StatCard label="If we never need care" value="Death benefit to beneficiaries" sub="Per policy terms" tone="good" />
          </div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">If We Never Need Long-Term Care</p>
          <p className="text-xs text-muted-foreground">
            Applicable life insurance proceeds pass to beneficiaries according to the policy, subject to policy terms,
            indebtedness, loans, withdrawals, and other adjustments.
          </p>
        </CardContent>
      </Card>

      {/* ---------------- Policy Exit Value ---------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="h-4 w-4 text-prism-sky" /> Policy Exit Value
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Nationwide CareMatters Together builds a surrender value. If the household later decides the policy is no longer
            needed, the policy may be surrendered for its applicable net surrender value.
          </p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={NW_SURRENDER_VALUES} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="year" tickFormatter={(v) => `Yr ${v}`} fontSize={11} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} fontSize={11} />
                <RTooltip formatter={(v: number) => money(v)} labelFormatter={(l) => `Policy year ${l}`} />
                <Line type="monotone" dataKey="value" name="Illustrated surrender value" stroke="hsl(var(--prism-sky))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label={`Current policy year (${policyYear})`} value={money(cv.surrenderValue)} sub={cv.illustrated ? 'Illustrated value' : 'Interpolated between illustrated years'} />
            <StatCard label="Year 20 illustrated" value={money(31337)} />
            <StatCard label="Year 40 illustrated" value={money(63623)} />
          </div>
          <div className="flex items-center gap-2">
            <IllustrationTag illustrated />
            <span className="text-xs text-muted-foreground">Years 1, 5, 10, 15, 20, 25, 30, 35 and 40 are illustrated; other years are interpolated planning estimates.</span>
          </div>
          <p className="text-xs text-muted-foreground">{NW_SURRENDER_NOTE}</p>
        </CardContent>
      </Card>

      {/* ---------------- Double-count safeguards ---------------- */}
      <Card className="border-prism-lime/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-prism-lime" /> Net Worth Safeguards — No Double Counting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
            <div>
              <p className="text-sm font-semibold">Include Insurance Surrender Value in Expanded Net Worth</p>
              <p className="text-xs text-muted-foreground">
                Default OFF. When enabled the value is reported only under <strong>{NET_WORTH_BUCKET}</strong> — never under{' '}
                {FORBIDDEN_BUCKETS.join(', ')}.
              </p>
            </div>
            <Switch checked={includeSurrenderValue} onCheckedChange={onToggle} aria-label="Include surrender value in expanded net worth" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              label={NET_WORTH_BUCKET}
              value={money(cv.includedInNetWorth)}
              sub={includeSurrenderValue ? `Policy year ${cv.policyYear} net surrender value` : 'Toggle is off — nothing added to net worth'}
              tone={includeSurrenderValue ? 'info' : 'default'}
            />
            <StatCard label="LTC benefits in net worth" value="Excluded" sub="Risk transfer, not an investment asset" tone="good" />
          </div>

          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Explicitly excluded from household totals</p>
            {cv.excluded.map((e) => (
              <div key={e.label} className="flex flex-wrap items-baseline justify-between gap-2 rounded border border-border/50 p-2">
                <span className="text-sm">{e.label}</span>
                <span className="text-xs text-muted-foreground">{e.reason}</span>
                <Badge variant="outline" className="text-[10px]">{money(e.amount)} not counted</Badge>
              </div>
            ))}
          </div>

          <ul className="space-y-1">
            {DOUBLE_COUNT_RULES.map((r) => (
              <li key={r} className="text-xs text-muted-foreground">• {r}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{cv.note}</p>
        </CardContent>
      </Card>

      <PlanningNotice />
    </div>
  );
}

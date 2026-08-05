import { useMemo, useState } from 'react';
import { ArrowDown, Printer, TrendingUp, TrendingDown, Minus, ShieldAlert, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  EXECUTIVE_VISION,
  FAMILY_LEGACY_CHAIN,
  FUNDING_PHASES,
  FUNDING_SOURCES,
  FUNDING_TIERS,
  FUNDING_WATERFALL,
  MISSION_FIRST_PRINCIPLE,
  MISSION_STATEMENT,
  STRATEGIC_PRINCIPLES,
  summarizeFunding,
  trendFor,
  type FundingSourceMap,
} from '@/lib/legacy/charitableLegacy';
import { useFdnReadinessState } from '@/hooks/use-foundation-readiness';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const TIER_ACCENT: Record<number, string> = {
  1: 'text-prism-amber',
  2: 'text-emerald-500',
  3: 'text-purple-400',
  4: 'text-primary',
};

export default function CharitableLegacyTab() {
  const { state, patch } = useFdnReadinessState();
  const saved: FundingSourceMap = (state.funding?.sources ?? {}) as FundingSourceMap;
  const [draft, setDraft] = useState<FundingSourceMap>({});
  const sources: FundingSourceMap = useMemo(() => ({ ...saved, ...draft }), [saved, draft]);
  const totals = useMemo(() => summarizeFunding(sources), [sources]);

  const setField = (key: string, field: keyof FundingSourceMap[string], value: number | boolean) => {
    const next = { ...sources, [key]: { ...(sources[key] ?? {}), [field]: value } };
    setDraft(next);
    patch({ funding: { ...(state.funding ?? {}), sources: next } });
  };

  return (
    <div className="space-y-6">
      {/* Mission-first banner */}
      <Card className="glass-card border-prism-amber/40">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-prism-amber">
            <Heart className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Mission First, Tax-Aware Second</span>
          </div>
          <p className="text-sm font-medium leading-relaxed">{MISSION_FIRST_PRINCIPLE}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{MISSION_STATEMENT}</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Montgomery Charitable Legacy Funding Strategy</h2>
          <p className="text-xs text-muted-foreground">
            A permanent charitable institution funded through multiple coordinated sources over a lifetime and beyond.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print Strategy Report
        </Button>
      </div>

      {/* Rollup */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Funded to date', value: money(totals.current) },
          { label: 'Annual goal', value: money(totals.annualGoal) },
          { label: 'Lifetime goal', value: money(totals.lifetimeGoal) },
          { label: 'Awaiting professional review', value: `${totals.reviewNeeded} source${totals.reviewNeeded === 1 ? '' : 's'}` },
        ].map((s) => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-xl font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card">
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress toward this year&apos;s charitable budget</span>
            <span className="font-medium">{Math.round(totals.annualPct)}%</span>
          </div>
          <Progress value={totals.annualPct} />
        </CardContent>
      </Card>

      {/* Funding waterfall */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Funding Waterfall</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 p-4 pt-0">
          {FUNDING_WATERFALL.map((step, i) => (
            <div key={step}>
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm font-medium">
                <span className="mr-2 text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                {step}
              </div>
              {i < FUNDING_WATERFALL.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <ArrowDown className="h-3.5 w-3.5 text-prism-amber" />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Four phases */}
      <div className="grid gap-4 lg:grid-cols-2">
        {FUNDING_PHASES.map((p) => (
          <Card key={p.key} className="glass-card">
            <CardHeader className="pb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-prism-amber">{p.step}</p>
              <CardTitle className="text-base">{p.title}</CardTitle>
              <p className="text-xs text-muted-foreground">{p.window}</p>
            </CardHeader>
            <CardContent className="grid gap-4 p-4 pt-0 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold">Funding sources</p>
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {p.sources.map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold">Objectives</p>
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {p.objectives.map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Priority tiers */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Funding Priority Model</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-4">
          {FUNDING_TIERS.map((t, i) => (
            <div key={t.tier} className="rounded-lg border border-border/60 p-3">
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${TIER_ACCENT[i + 1]}`}>{t.tier}</p>
              <p className="text-sm font-medium">{t.title}</p>
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {t.items.map((it) => (
                  <li key={it}>• {it}</li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Funding dashboard */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Funding Dashboard</CardTitle>
          <p className="text-xs text-muted-foreground">
            Track each source separately. Amounts save automatically to your foundation plan.
          </p>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Tier</th>
                  <th className="py-2 pr-3">Current</th>
                  <th className="py-2 pr-3">Annual goal</th>
                  <th className="py-2 pr-3">Lifetime goal</th>
                  <th className="py-2 pr-3">Trend</th>
                  <th className="py-2">Professional review</th>
                </tr>
              </thead>
              <tbody>
                {FUNDING_SOURCES.map((src) => {
                  const s = sources[src.key] ?? {};
                  const trend = trendFor(s);
                  return (
                    <tr key={src.key} className="border-b border-border/40">
                      <td className="py-2 pr-3 font-medium">{src.label}</td>
                      <td className={`py-2 pr-3 text-xs ${TIER_ACCENT[src.tier]}`}>Tier {src.tier}</td>
                      {(['current', 'annualGoal', 'lifetimeGoal'] as const).map((f) => (
                        <td key={f} className="py-2 pr-3">
                          <Input
                            type="number"
                            className="h-8 w-28"
                            value={s[f] ?? ''}
                            onChange={(e) => setField(src.key, f, Number(e.target.value) || 0)}
                          />
                        </td>
                      ))}
                      <td className="py-2 pr-3">
                        {trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                        {trend === 'down' && <TrendingDown className="h-4 w-4 text-destructive" />}
                        {trend === 'flat' && <Minus className="h-4 w-4 text-muted-foreground" />}
                      </td>
                      <td className="py-2">
                        {src.needsReview ? (
                          <label className="flex items-center gap-2 text-xs">
                            <Checkbox
                              checked={!!s.reviewed}
                              onCheckedChange={(v) => setField(src.key, 'reviewed', !!v)}
                            />
                            {s.reviewed ? 'Reviewed' : 'CPA / attorney review needed'}
                          </label>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not required</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Family legacy model */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Family Legacy Model</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 p-4 pt-0">
          {FAMILY_LEGACY_CHAIN.map((n, i) => (
            <div key={n} className="flex items-center gap-2">
              <span className="rounded-full border border-prism-amber/40 bg-prism-amber/10 px-3 py-1 text-xs font-medium">
                {n}
              </span>
              {i < FAMILY_LEGACY_CHAIN.length - 1 && <ArrowDown className="h-3.5 w-3.5 -rotate-90 text-muted-foreground" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Principles + vision */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Key Strategic Principles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {STRATEGIC_PRINCIPLES.map((p) => (
              <p key={p} className="text-xs leading-relaxed text-muted-foreground">
                • {p}
              </p>
            ))}
          </CardContent>
        </Card>
        <Card className="glass-card border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Executive Vision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            {EXECUTIVE_VISION.map((p) => (
              <p key={p.slice(0, 24)} className="text-xs leading-relaxed">
                {p}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-prism-amber" />
        <p className="text-xs text-muted-foreground">
          Planning tool only — not legal, tax, or investment advice. Every strategy involving retirement accounts, trusts,
          business interests, or appreciated assets requires professional legal and tax review before implementation.
        </p>
      </div>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Printer, ArrowRight, Info, Loader2 } from 'lucide-react';
import {
  READINESS_GROUPS,
  BUCKETS,
  computeReadiness,
  READINESS_MILESTONES,
  milestoneKey,
  SCENARIOS,
  STRATEGY_STAGES,
  EXECUTIVE_SUMMARY,
  money,
} from '@/lib/legacy/foundationReadiness';
import { useFdnReadinessState } from '@/hooks/use-foundation-readiness';

function Gauge({ value, label, tone }: { value: number; label: string; tone: string }) {
  const size = 176;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${value}% readiness`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className={
              value >= 90
                ? 'stroke-emerald-500'
                : value >= 75
                  ? 'stroke-prism-lime'
                  : value >= 50
                    ? 'stroke-prism-amber'
                    : value >= 25
                      ? 'stroke-prism-teal'
                      : 'stroke-prism-indigo'
            }
            style={{ transition: 'stroke-dashoffset 600ms ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums">{value}%</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Readiness</span>
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Foundation Readiness Index</p>
        <p className={`mt-1 text-2xl font-semibold ${tone}`}>{label}</p>
      </div>
    </div>
  );
}

export default function ReadinessIndexTab({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { state, patch, isSaving, isLoading } = useFdnReadinessState();
  const checked = state.checked ?? {};
  const milestones = state.milestones ?? {};
  const r = computeReadiness(checked);

  const printReport = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = READINESS_GROUPS.map(
      (g) => `<h3>${g.title}</h3><ul>${g.items
        .map((i) => `<li>${checked[i.key] ? '☑' : '☐'} ${i.label}</li>`)
        .join('')}</ul>`,
    ).join('');
    w.document.write(`<html><head><title>Foundation Readiness Report</title>
      <style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;line-height:1.5;color:#111}
      h1{font-size:22px}h2{font-size:16px;margin-top:28px}h3{font-size:13px;margin-bottom:4px}
      ul{margin:0 0 12px 18px;padding:0;font-size:12px}p{font-size:12px}
      .score{font-size:44px;font-weight:700}.muted{color:#555;font-size:11px}</style></head><body>
      <h1>Dr. Lyman A. Montgomery Family Foundation — Readiness Report</h1>
      <p class="muted">${new Date().toLocaleDateString()}</p>
      <p class="score">${r.overall}% — ${r.stage.label}</p>
      <p>${r.stage.blurb}</p>
      <h2>Category scores</h2><ul>${BUCKETS.map(
        (b) => `<li>${b.label}: ${r.buckets[b.key].score}% (${r.buckets[b.key].done}/${r.buckets[b.key].total})</li>`,
      ).join('')}</ul>
      <h2>Checklist</h2>${rows}
      <h2>Executive summary</h2><p>${EXECUTIVE_SUMMARY}</p>
      <p class="muted">Planning tool only. Not legal, tax, accounting, or investment advice.</p>
      </body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card border-prism-amber/30">
        <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
          <Gauge value={r.overall} label={r.stage.label} tone={r.stage.tone} />
          <div className="w-full max-w-md space-y-3">
            {BUCKETS.map((b) => (
              <div key={b.key}>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{b.label}</span>
                  <span>
                    {r.buckets[b.key].score}% · {r.buckets[b.key].done}/{r.buckets[b.key].total}
                  </span>
                </div>
                <Progress value={r.buckets[b.key].score} className="mt-1 h-2" />
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">
              Each category contributes equally to the overall index.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Executive summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed">{EXECUTIVE_SUMMARY}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={printReport}>
              <Printer className="h-4 w-4" /> Print readiness report
            </Button>
            {onNavigate && (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => onNavigate('sustainability')}>
                Sustainability analyzer <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {isSaving && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* $1M myth */}
      <Card className="glass-card border-prism-indigo/30">
        <CardHeader>
          <CardTitle className="text-base">Do I Need $1 Million Before Starting a Foundation?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            There is no IRS requirement to have $1 million before forming a private foundation. Many financial planners
            recommend roughly that amount because administrative expenses can consume a significant percentage of
            investment earnings in a small foundation.
          </p>
          <p className="text-sm font-medium text-prism-amber">
            This is a financial planning guideline, not a legal requirement.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                title: 'Example A',
                assets: 100000,
                ret: 7000,
                admin: 8000,
                result: 'Most or all annual investment earnings may be consumed by administration.',
                border: 'border-prism-rose/40',
              },
              {
                title: 'Example B',
                assets: 1000000,
                ret: 70000,
                admin: 10000,
                result:
                  'The Foundation has substantially greater capacity to fund grants, programs, and future growth.',
                border: 'border-prism-lime/40',
              },
            ].map((e) => (
              <div key={e.title} className={`rounded-lg border p-4 ${e.border}`}>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{e.title}</p>
                <p className="mt-1 text-2xl font-semibold">{money(e.assets)}</p>
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. annual return (7%)</span>
                    <span>{money(e.ret)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. administrative costs</span>
                    <span>{money(e.admin)}</span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{e.result}</p>
              </div>
            ))}
          </div>
          <p className="flex items-start gap-1.5 text-xs italic text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            Actual investment returns and administrative expenses vary. These examples are planning illustrations only.
          </p>
        </CardContent>
      </Card>

      {/* Checklists */}
      <div className="grid gap-4 lg:grid-cols-2">
        {READINESS_GROUPS.map((g) => {
          const done = g.items.filter((i) => checked[i.key]).length;
          return (
            <Card key={g.category} className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  {g.title}
                  <Badge variant="secondary">
                    {done}/{g.items.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {g.items.map((i) => (
                  <button
                    key={i.key}
                    type="button"
                    disabled={isLoading}
                    onClick={() => patch({ checked: { [i.key]: !checked[i.key] } })}
                    className="flex w-full items-start gap-2.5 rounded-md border border-border/50 p-2.5 text-left transition-colors hover:bg-muted/30 disabled:opacity-60"
                    aria-pressed={!!checked[i.key]}
                  >
                    <Checkbox checked={!!checked[i.key]} className="pointer-events-none mt-0.5" tabIndex={-1} />
                    <span className={`text-sm ${checked[i.key] ? 'text-muted-foreground line-through' : ''}`}>
                      {i.label}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recommendations */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Remaining action items & recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {r.recommendations.map((rec, idx) => (
            <div key={idx} className="rounded-md border border-border/50 p-3 text-sm">
              {rec}
            </div>
          ))}
          {r.remaining.length > 4 && (
            <p className="text-xs text-muted-foreground">
              {r.remaining.length - 4} more open items across the five readiness categories.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Scenarios */}
      <div className="grid gap-4 lg:grid-cols-3">
        {SCENARIOS.map((s) => (
          <Card key={s.id} className={`glass-card ${s.tone}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{s.name}</CardTitle>
              <p className="text-xs text-muted-foreground">Planning example: {s.range}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <ul className="space-y-1 text-xs text-muted-foreground">
                {s.characteristics.map((c) => (
                  <li key={c}>• {c}</li>
                ))}
              </ul>
              <p className="text-xs font-medium">{s.recommendation}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        These ranges are planning examples only and are not legal or IRS requirements.
      </p>

      {/* Strategy stages */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Montgomery Foundation strategy</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {STRATEGY_STAGES.map((s) => (
            <div key={s.stage} className="rounded-lg border border-border/50 p-4">
              <p className="text-sm font-semibold text-prism-amber">{s.stage}</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {s.items.map((i) => (
                  <li key={i}>• {i}</li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] italic text-muted-foreground">{s.note}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            Milestone tracker
            <Badge variant="secondary">
              {READINESS_MILESTONES.filter((m) => milestones[milestoneKey(m)]).length}/{READINESS_MILESTONES.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {READINESS_MILESTONES.map((m, idx) => {
            const k = milestoneKey(m);
            return (
              <button
                key={k}
                type="button"
                disabled={isLoading}
                onClick={() => patch({ milestones: { [k]: !milestones[k] } })}
                className="flex items-center gap-2.5 rounded-md border border-border/50 p-2.5 text-left transition-colors hover:bg-muted/30 disabled:opacity-60"
                aria-pressed={!!milestones[k]}
              >
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <Checkbox checked={!!milestones[k]} className="pointer-events-none" tabIndex={-1} />
                <span className={`text-sm ${milestones[k] ? 'text-muted-foreground line-through' : ''}`}>{m}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Planning tool only. Not legal, tax, accounting, or investment advice. Confirm formation timing, filings, and
        investment policy with a licensed attorney, CPA, and advisor.
      </p>
    </div>
  );
}

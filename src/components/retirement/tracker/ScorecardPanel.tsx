import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  PLAN_STATUS_TONE,
  RETURN_SCENARIOS,
  money,
  pct,
  planStatus,
  projectMilestone,
  type MonthPoint,
  type ProjectionInputs,
  type ProjectionYear,
  type RetirementAccountRow,
  type RetirementStatementRow,
} from '@/lib/retirement/investmentTracker';
import { deriveStatement } from '@/lib/retirement/investmentTracker';

interface Props {
  timeline: MonthPoint[];
  statements: RetirementStatementRow[];
  accounts: RetirementAccountRow[];
  projection: ProjectionYear[];
  inputs: ProjectionInputs;
  totalPortfolio: number;
  ytd: { contributions: number; gain: number; returnPct: number | null; employer: number };
  trailing12Pct: number | null;
}

export function ScorecardPanel({
  timeline,
  statements,
  accounts,
  projection,
  inputs,
  totalPortfolio,
  ytd,
  trailing12Pct,
}: Props) {
  const latest = timeline[timeline.length - 1];
  const prior = timeline[timeline.length - 2];

  const bestAccount = (() => {
    if (!latest) return null;
    const rows = statements.filter((s) => String(s.period_month).slice(0, 7) === latest.month);
    let best: { name: string; gain: number } | null = null;
    for (const r of rows) {
      const gain = deriveStatement(r).estimatedInvestmentGain;
      const name = accounts.find((a) => a.id === r.account_id)?.name ?? 'Account';
      if (!best || gain > best.gain) best = { name, gain };
    }
    return best;
  })();

  const status = planStatus(trailing12Pct, 7);
  const m250 = projectMilestone(250_000, totalPortfolio, projection, inputs.currentAge);
  const m500 = projectMilestone(500_000, totalPortfolio, projection, inputs.currentAge);
  const m1 = projectMilestone(1_000_000, totalPortfolio, projection, inputs.currentAge);
  const m4 = projectMilestone(4_000_000, totalPortfolio, projection, inputs.currentAge);

  const year = new Date().getFullYear();
  const yearMonths = timeline.filter((m) => m.month.startsWith(String(year)));
  const janBalance = yearMonths[0] ? yearMonths[0].balance - yearMonths[0].investmentGain - yearMonths[0].contributions : 0;
  const bestMonth = [...yearMonths].sort((a, b) => b.investmentGain - a.investmentGain)[0];
  const worstMonth = [...yearMonths].sort((a, b) => a.investmentGain - b.investmentGain)[0];

  return (
    <div className="space-y-4">
      <Card className="border-prism-amber/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Montgomery monthly retirement scorecard</CardTitle>
          <p className="text-xs text-muted-foreground">
            {latest ? latest.label : 'No statements yet'} · status{' '}
            <span className={`font-semibold ${PLAN_STATUS_TONE[status]}`}>{status}</span>
          </p>
        </CardHeader>
        <CardContent className="grid gap-x-6 gap-y-2 sm:grid-cols-2 text-xs">
          <Row label="Beginning portfolio balance" value={money(prior?.balance ?? 0, 2)} />
          <Row label="Ending portfolio balance" value={money(latest?.balance ?? totalPortfolio, 2)} />
          <Row label="Employee contributions" value={money(latest?.employeeContributions ?? 0, 2)} />
          <Row label="Employer contributions" value={money(latest?.employerContributions ?? 0, 2)} />
          <Row label="Total contributions" value={money(latest?.contributions ?? 0, 2)} />
          <Row
            label="Estimated investment gain / loss"
            value={money(latest?.investmentGain ?? 0, 2)}
            tone={(latest?.investmentGain ?? 0) >= 0 ? 'up' : 'down'}
          />
          <Row
            label="Reported personal return"
            value={(() => {
              if (!latest) return '—';
              const rows = statements.filter(
                (s) => String(s.period_month).slice(0, 7) === latest.month && s.reported_prr != null,
              );
              if (rows.length === 0) return 'Not reported';
              const avg = rows.reduce((s, r) => s + Number(r.reported_prr), 0) / rows.length;
              return pct(avg);
            })()}
          />
          <Row label="YTD investment gain" value={money(ytd.gain, 2)} tone={ytd.gain >= 0 ? 'up' : 'down'} />
          <Row label="YTD contributions" value={money(ytd.contributions, 2)} />
          <Row label="YTD return (estimated)" value={pct(ytd.returnPct)} />
          <Row label="12-month return (estimated)" value={pct(trailing12Pct)} />
          <Row label="Best performing account" value={bestAccount ? bestAccount.name : '—'} />
          <Row label="Largest monthly gain" value={bestAccount ? money(bestAccount.gain, 2) : '—'} />
          <Row label="Progress toward $250K" value={`${m250.progressPct.toFixed(2)}%`} />
          <Row label="Progress toward $500K" value={`${m500.progressPct.toFixed(2)}%`} />
          <Row label="Progress toward $1M" value={`${m1.progressPct.toFixed(2)}%`} />
          <Row label="Progress toward $4M" value={`${m4.progressPct.toFixed(2)}%`} />
          <Row label="Projected age at $1M" value={m1.projectedAge ? String(m1.projectedAge) : 'Reached'} />
          <Row label="Projected age at $4M" value={m4.projectedAge ? String(m4.projectedAge) : 'Beyond target age'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Month-over-month comparison</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!prior || !latest ? (
            <p className="text-xs text-muted-foreground">
              Two months of statements are needed for a comparison. Save this month above.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Tile label={prior.label} value={money(prior.balance, 2)} />
                <Tile label={latest.label} value={money(latest.balance, 2)} />
                <Tile
                  label="Change"
                  value={`${latest.balance - prior.balance >= 0 ? '+' : ''}${money(latest.balance - prior.balance, 2)}`}
                  tone={latest.balance - prior.balance >= 0 ? 'up' : 'down'}
                  hint={
                    prior.balance > 0
                      ? `${(((latest.balance - prior.balance) / prior.balance) * 100).toFixed(2)}%`
                      : undefined
                  }
                />
              </div>
              <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 text-xs pt-1">
                <Row label="New employee contributions" value={money(latest.employeeContributions, 2)} />
                <Row label="Employer contributions" value={money(latest.employerContributions, 2)} />
                <Row label="Investment growth" value={money(latest.investmentGain, 2)} tone={latest.investmentGain >= 0 ? 'up' : 'down'} />
                <Row label="Transfers (not new wealth)" value={money(latest.transfersNet, 2)} />
                <Row label="Withdrawals" value={money(latest.withdrawals, 2)} />
                <Row label="Fees" value={money(latest.fees, 2)} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Annual performance review · {year}</CardTitle>
          <p className="text-xs text-muted-foreground">
            Generated from the months on record this year. Complete in December.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 text-xs">
            <Row label="January 1 balance (derived)" value={money(Math.max(0, janBalance), 2)} />
            <Row label="Latest balance" value={money(latest?.balance ?? totalPortfolio, 2)} />
            <Row label="Total employee contributions" value={money(ytd.contributions - ytd.employer, 2)} />
            <Row label="Total employer contributions" value={money(ytd.employer, 2)} />
            <Row label="Total investment gains" value={money(ytd.gain, 2)} tone={ytd.gain >= 0 ? 'up' : 'down'} />
            <Row
              label="Total portfolio growth"
              value={money((latest?.balance ?? totalPortfolio) - Math.max(0, janBalance), 2)}
            />
            <Row label="Annual personal return (estimated)" value={pct(ytd.returnPct)} />
            <Row label="Best month" value={bestMonth ? `${bestMonth.label} · ${money(bestMonth.investmentGain, 2)}` : '—'} />
            <Row label="Worst month" value={worstMonth ? `${worstMonth.label} · ${money(worstMonth.investmentGain, 2)}` : '—'} />
            <Row label="Best performing account" value={bestAccount?.name ?? '—'} />
            <Row label="Progress toward $1M" value={`${m1.progressPct.toFixed(2)}%`} />
            <Row label="Progress toward $4M" value={`${m4.progressPct.toFixed(2)}%`} />
          </div>
          <div className="pt-2 border-t border-border/60 space-y-2">
            <p className="text-xs font-medium">This year versus planning scenarios</p>
            {RETURN_SCENARIOS.map((s) => {
              const diff = ytd.returnPct == null ? null : ytd.returnPct - s.pct;
              return (
                <div key={s.pct} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {s.label} ({s.pct}%)
                  </span>
                  <span className="flex items-center gap-2">
                    <Progress
                      className="h-1.5 w-24"
                      value={ytd.returnPct == null ? 0 : Math.min(100, Math.max(0, (ytd.returnPct / s.pct) * 100))}
                    />
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${diff == null ? '' : diff >= 0 ? 'text-emerald-500' : 'text-destructive'}`}
                    >
                      {diff == null ? '—' : `${diff >= 0 ? '+' : ''}${diff.toFixed(2)} pts`}
                    </Badge>
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'up' | 'down' | 'neutral' }) {
  const cls = tone === 'up' ? 'text-emerald-500' : tone === 'down' ? 'text-destructive' : 'text-foreground';
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums font-medium text-right ${cls}`}>{value}</span>
    </div>
  );
}

function Tile({
  label,
  value,
  tone = 'neutral',
  hint,
}: {
  label: string;
  value: string;
  tone?: 'up' | 'down' | 'neutral';
  hint?: string;
}) {
  const cls = tone === 'up' ? 'text-emerald-500' : tone === 'down' ? 'text-destructive' : 'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold tabular-nums mt-0.5 ${cls}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { money } from '@/lib/retirement/investmentTracker';
import {
  monthLabel, RETIREMENT_BASELINE, SELF_DIRECTED_BASELINE, TOTAL_PORTFOLIO_BASELINE,
  type ProjectionResult, type PslfStatus, type EngineConfig,
} from '@/lib/retirement/cashflowEngine';

interface Props {
  retirementTotal: number;
  selfDirectedTotal: number;
  investmentTotal: number;
  currentMonthly: number;
  employee: number;
  employer: number;
  nextIncrease: { month: string; amount: number; total: number } | null;
  pslf: PslfStatus;
  projection: ProjectionResult;
  config: EngineConfig;
}

export function CashflowExecutive({
  retirementTotal, selfDirectedTotal, investmentTotal, currentMonthly, employee, employer,
  nextIncrease, pslf, projection, config,
}: Props) {
  const hit = (t: number) => projection.milestones.find((m) => m.target === t);
  const m200 = hit(200_000)!;
  const m250 = hit(250_000)!;
  const m500 = hit(500_000)!;
  const m1 = hit(1_000_000)!;
  const m4 = hit(4_000_000)!;
  const atAge85 = projection.endingBalance;

  const fmtHit = (label: string, m = m200) =>
    m.reached && m.month ? `${monthLabel(m.month)} · age ${m.age}` : `Beyond age ${config.projectToAge}`;

  return (
    <div className="space-y-4">
      <Card className="border-prism-amber/30 bg-gradient-to-br from-primary/10 via-background to-emerald-500/5">
        <CardContent className="p-5 md:p-6 space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-prism-amber">
              Montgomery Retirement Wealth
            </p>
            <p className="text-xs text-muted-foreground mt-2">Current retirement portfolio</p>
            <p className="text-4xl md:text-5xl font-semibold tabular-nums">{money(retirementTotal, 2)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Self-directed {money(selfDirectedTotal, 2)} tracked separately · total investment wealth{' '}
              {money(investmentTotal, 2)}. HSA is excluded from this milestone math.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Next milestone" value={money(200_000)} hint={`${money(Math.max(0, 200_000 - retirementTotal), 2)} to go · ${((retirementTotal / 200_000) * 100).toFixed(2)}%`} progress={(retirementTotal / 200_000) * 100} />
            <Tile label="Compounding milestone" value={money(250_000)} hint={`${money(Math.max(0, 250_000 - retirementTotal), 2)} to go · ${((retirementTotal / 250_000) * 100).toFixed(2)}%`} progress={(retirementTotal / 250_000) * 100} />
            <Tile label="Monthly retirement funding" value={money(currentMonthly, 2)} hint={`Employee ${money(employee, 2)} + employer ${money(employer, 2)}`} />
            <Tile
              label="Next contribution increase"
              value={nextIncrease ? `+${money(nextIncrease.amount, 2)}` : '—'}
              hint={nextIncrease ? `${monthLabel(nextIncrease.month)} → ${money(nextIncrease.total, 2)}/mo` : 'No scheduled increase'}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="PSLF payments remaining" value={String(pslf.remaining)} hint={`${pslf.completed} of ${pslf.startingRemaining} complete`} progress={pslf.pctComplete} />
            <Tile label="Cash flow released after PSLF" value={money(390)} hint="Redirects to retirement once confirmed" />
            <Tile label="Monthly Wealth Accelerator" value={`+${money(250)}/mo`} hint="From January 2028 · $3,000/year invested systematically" />
            <Tile label="Projected value at age 85" value={money(atAge85)} hint={`At ${config.returnPct}% illustrative return`} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5 text-xs">
            <Mini label="Projected $200K" value={fmtHit('200k', m200)} />
            <Mini label="Projected $250K" value={fmtHit('250k', m250)} />
            <Mini label="Projected $500K" value={fmtHit('500k', m500)} />
            <Mini label="Projected $1M" value={fmtHit('1m', m1)} />
            <Mini label="Projected $4M" value={fmtHit('4m', m4)} />
          </div>

          <p className="text-[10px] text-muted-foreground">
            Projections are mathematical illustrations at a constant {config.returnPct}% assumption. Real
            returns fluctuate year to year and are not guaranteed. Baseline {money(RETIREMENT_BASELINE, 2)}{' '}
            retirement + {money(SELF_DIRECTED_BASELINE, 2)} self-directed = {money(TOTAL_PORTFOLIO_BASELINE, 2)}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cash flow to wealth</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-[11px] text-muted-foreground">
          <pre className="font-mono text-[10px] leading-relaxed whitespace-pre overflow-x-auto">{`INCOME → RETIREMENT CONTRIBUTIONS ($335 employee + $532.05 employer)
DEBT PAYOFF ($888) → $390 student loan obligation + $498 retirement
PSLF FORGIVENESS (confirmed) → releases $390/month → retirement
MONTHLY WEALTH ACCELERATOR → $250/month from January 2028 ($3,000/year)
FUTURE RAISE REALLOCATIONS → only when confirmed
      ↓
COMPOUNDING → $200K → $250K → $500K → $1M → $4M → GENERATIONAL WEALTH`}</pre>
          <p>
            Every dollar freed from debt receives a new assignment before it can become lifestyle spending.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant="outline" className="text-[10px]">Student loan payment is never an investment</Badge>
            <Badge variant="outline" className="text-[10px]">$390 is either a payment or a contribution — never both</Badge>
            <Badge variant="outline" className="text-[10px]">Employer money kept separate from employee money</Badge>
            <Badge variant="outline" className="text-[10px]">$250/month replaces the $3,000 annual refund — never both</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Tile({ label, value, hint, progress }: { label: string; value: string; hint?: string; progress?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums mt-0.5">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
      {progress != null && <Progress value={Math.min(100, progress)} className="mt-2 h-1.5" />}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-medium mt-0.5">{value}</p>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  deriveStatement,
  money,
  pct,
  type RetirementAccountRow,
  type RetirementStatementRow,
} from '@/lib/retirement/investmentTracker';

interface Props {
  accounts: RetirementAccountRow[];
  statements: RetirementStatementRow[];
  totalPortfolio: number;
}

export function AccountCards({ accounts, statements, totalPortfolio }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {accounts.map((acc) => {
        const rows = statements
          .filter((s) => s.account_id === acc.id)
          .sort((a, b) => String(a.period_month).localeCompare(String(b.period_month)));
        const latest = rows[rows.length - 1];
        const d = latest ? deriveStatement(latest) : null;
        const share = totalPortfolio > 0 ? (Number(acc.current_balance) / totalPortfolio) * 100 : 0;

        return (
          <Card key={acc.id} className="border-border/70">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm">{acc.name}</CardTitle>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {share.toFixed(1)}%
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">{acc.institution ?? '—'}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {money(Number(acc.current_balance), 2)}
              </p>
              {acc.fund_name ? (
                <p className="text-[11px] text-muted-foreground">
                  {acc.fund_name}
                  {acc.ticker ? ` · ${acc.ticker}` : ''}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Tracked separately from the Fidelity/IU accounts.
                </p>
              )}
              <div className="pt-2 border-t border-border/60 space-y-1 text-[11px]">
                <Row label="Baseline" value={money(Number(acc.baseline_balance), 2)} />
                <Row
                  label="Est. gain (latest month)"
                  value={d ? money(d.estimatedInvestmentGain, 2) : '—'}
                  tone={d ? (d.estimatedInvestmentGain >= 0 ? 'up' : 'down') : 'neutral'}
                />
                <Row
                  label="Reported personal return"
                  value={latest?.reported_prr != null ? pct(Number(latest.reported_prr)) : 'Not reported'}
                />
                <Row label="Months on record" value={String(rows.length)} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Row({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'up' | 'down' | 'neutral' }) {
  const cls = tone === 'up' ? 'text-emerald-500' : tone === 'down' ? 'text-destructive' : 'text-foreground';
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums font-medium ${cls}`}>{value}</span>
    </div>
  );
}

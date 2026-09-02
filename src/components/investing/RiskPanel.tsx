import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle } from 'lucide-react';
import { ROLE_META, money, pct } from '@/lib/investing/roles';
import { useInvestingMetrics } from '@/hooks/use-investing-metrics';

export function RiskPanel() {
  const { concentration, risk, stress, overlap, totals } = useInvestingMetrics();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Risk budget</CardTitle>
            <CardDescription>Share of the portfolio in higher-risk roles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold">{pct(risk.higherRiskPct)}</div>
            <Progress value={Math.min(100, risk.higherRiskPct)} />
            <p className="text-sm text-muted-foreground">
              CONVICTION + CATALYST = {money(risk.higherRiskValue)}. Your warning line is {pct(risk.warnPct, 0)}.
            </p>
            {risk.overBudget && (
              <Badge variant="outline" className="border-amber-500/40 text-amber-400">
                <AlertTriangle className="mr-1 h-3 w-3" /> Above your own risk line
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Largest position</CardTitle>
            <CardDescription>Single-holding concentration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold">{concentration.largest ? concentration.largest.ticker : '—'}</div>
            <p className="text-sm text-muted-foreground">
              {concentration.largest ? `${pct(concentration.largest.pctOfPortfolio)} of ${money(totals.value)}` : 'No positions yet'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Decline stress test</CardTitle>
            <CardDescription>Estimated portfolio value in a drawdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {stress.map((s) => (
              <div key={s.label} className="flex justify-between">
                <span className="text-muted-foreground">{s.label}</span>
                <span>{money(s.value)} <span className="text-muted-foreground">({money(-s.loss)})</span></span>
              </div>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">Illustrative estimates, not predictions.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Position guardrails</CardTitle>
          <CardDescription>Each holding against the cap you set for it. Prism warns; it never trades.</CardDescription>
        </CardHeader>
        <CardContent>
          {concentration.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add positions to see concentration checks.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Holding</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">% of portfolio</TableHead>
                  <TableHead className="text-right">Cap</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {concentration.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.ticker}</TableCell>
                    <TableCell><Badge variant="outline" className={ROLE_META[r.role].accent}>{r.role}</Badge></TableCell>
                    <TableCell className="text-right">{money(r.value, 2)}</TableCell>
                    <TableCell className="text-right">{pct(r.pctOfPortfolio)}</TableCell>
                    <TableCell className="text-right">{r.cap ? pct(r.cap, 0) : '—'}</TableCell>
                    <TableCell>
                      {r.breach ? (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-400">Over cap</Badge>
                      ) : (
                        <Badge variant="secondary">Within cap</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Overlap analysis</CardTitle>
          <CardDescription>
            Where funds hold the same underlying companies, so "diversified" holdings can move together. Based on published fund holdings where available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overlap.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No underlying fund holdings on file yet. Look up an ETF ticker on a position to pull its published holdings.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Held through</TableHead>
                  <TableHead className="text-right">Effective portfolio weight</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overlap.rows.slice(0, 15).map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.viaTickers.join(', ')}</TableCell>
                    <TableCell className="text-right">{pct(r.effectivePct)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

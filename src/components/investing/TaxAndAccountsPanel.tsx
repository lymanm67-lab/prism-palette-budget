import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ACCOUNT_TYPES, ROLE_META, holdingPeriodStatus, money, pct, positionValue } from '@/lib/investing/roles';
import { useInvestingMetrics } from '@/hooks/use-investing-metrics';

export function TaxAndAccountsPanel() {
  const { positions, totals, byAccount } = useInvestingMetrics();

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Where each role is held</CardTitle>
          <CardDescription>
            Account type drives tax treatment. Retirement and taxable money are tracked separately and never mixed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Tax treatment</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">% of investments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byAccount.map((a) => (
                <TableRow key={a.account_type}>
                  <TableCell className="font-medium">{ACCOUNT_TYPES.find((x) => x.value === a.account_type)?.label ?? a.account_type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{ACCOUNT_TYPES.find((x) => x.value === a.account_type)?.tax ?? '—'}</TableCell>
                  <TableCell className="text-right">{money(a.value, 2)}</TableCell>
                  <TableCell className="text-right">{pct(totals.value > 0 ? (a.value / totals.value) * 100 : 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            SoFi Emergency Cash is a reserve, not an investment — it is excluded here and never counts toward investment targets.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tax awareness by holding</CardTitle>
          <CardDescription>
            Holding period and unrealized position — informational only. Prism does not compute your tax liability.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add positions to see tax context.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Holding</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Holding period</TableHead>
                  <TableHead className="text-right">Unrealized</TableHead>
                  <TableHead className="text-right">Dividends YTD</TableHead>
                  <TableHead>Dividend instruction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((p) => {
                  const gain = positionValue(p) - Number(p.cost_basis ?? 0);
                  const taxable = p.account_type === 'sofi_investments' || p.account_type === 'taxable_brokerage';
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.ticker}</TableCell>
                      <TableCell><Badge variant="outline" className={ROLE_META[p.role].accent}>{p.role}</Badge></TableCell>
                      <TableCell className="text-sm">{ACCOUNT_TYPES.find((x) => x.value === p.account_type)?.label ?? p.account_type}</TableCell>
                      <TableCell className="text-sm">{taxable ? holdingPeriodStatus(p.entry_date) : 'Not taxable while held'}</TableCell>
                      <TableCell className={`text-right ${gain >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>{money(gain, 2)}</TableCell>
                      <TableCell className="text-right">{money(Number(p.dividend_income_ytd ?? 0), 2)}</TableCell>
                      <TableCell className="capitalize text-sm">{(p.dividend_instruction ?? 'reinvest').replace('_', ' ')}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tax-aware habits this plan follows</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Rebalance with contributions before selling anything.</li>
            <li>Do trimming inside retirement accounts where no taxable event is created.</li>
            <li>Check the holding period before selling a taxable position.</li>
            <li>Keep speculative roles smaller in taxable accounts where turnover costs more.</li>
            <li>Treat dividends as a decision: reinvest in role, or redirect to the most underweight role.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

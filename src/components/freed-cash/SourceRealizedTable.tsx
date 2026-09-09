import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { FreedCashRedirect, FreedCashSource } from '@/hooks/use-freed-cash';
import { sourceRealizedRows } from '@/lib/freed-cash/reality';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

interface Props {
  sources: FreedCashSource[];
  redirects: FreedCashRedirect[];
}

/** One row per saving: what it has actually produced versus what it is worth annually. */
export function SourceRealizedTable({ sources, redirects }: Props) {
  const rows = useMemo(() => sourceRealizedRows(sources, redirects, new Date()), [sources, redirects]);

  const totals = rows.reduce(
    (t, r) => ({
      ytd: t.ytd + r.realizedYtd,
      lifetime: t.lifetime + r.realizedLifetime,
      annual: t.annual + (r.isPipeline ? 0 : r.annualizedValue),
    }),
    { ytd: 0, lifetime: 0, annual: 0 },
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Realized savings by source</CardTitle>
        <CardDescription>
          Future-dated savings show $0 realized until their effective date arrives. Annualized value is what the
          saving is worth over a full year, not what it has already produced.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No savings logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Monthly savings</TableHead>
                  <TableHead>Effective date</TableHead>
                  <TableHead className="text-right">Realized YTD</TableHead>
                  <TableHead className="text-right">Lifetime realized</TableHead>
                  <TableHead className="text-right">Annualized value</TableHead>
                  <TableHead>Pipeline?</TableHead>
                  <TableHead className="text-right">Redirected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>{r.name}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {r.confidence}
                        </Badge>
                        {r.estimatedMonths && (
                          <Badge variant="outline" className="text-[10px]">
                            est. months
                          </Badge>
                        )}
                      </div>
                      {r.vendor && <p className="text-[11px] text-muted-foreground">{r.vendor}</p>}
                    </TableCell>
                    <TableCell className="text-right">{money(r.monthly)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {r.effectiveDate || '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      {money(r.realizedYtd)}
                    </TableCell>
                    <TableCell className="text-right">{money(r.realizedLifetime)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{money(r.annualizedValue)}</TableCell>
                    <TableCell>
                      {r.isPipeline ? (
                        <Badge className="text-[10px]" variant="secondary">
                          Yes
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.redirected > 0 ? money(r.redirected) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right">{money(totals.ytd)}</TableCell>
                  <TableCell className="text-right">{money(totals.lifetime)}</TableCell>
                  <TableCell className="text-right">{money(totals.annual)}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

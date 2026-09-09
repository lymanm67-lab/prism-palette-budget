import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FlowResult, FundCategory, money, money2, monthLabel } from '@/lib/wealth/sourceOfFunds';

const COLS: { key: FundCategory; label: string }[] = [
  { key: 'employee', label: 'Employee' },
  { key: 'employer', label: 'Employer' },
  { key: 'employee_hsa', label: 'HSA' },
  { key: 'employer_hsa', label: 'Employer HSA' },
  { key: 'accelerator', label: 'Accelerator' },
  { key: 'tax_refund', label: 'Refunds' },
  { key: 'raise', label: 'Raises' },
  { key: 'scheduled_increase', label: 'Scheduled' },
  { key: 'freed_cash', label: 'Freed cash' },
  { key: 'released_debt', label: 'Debt releases' },
];

export function YearlyFundingLedger({ result }: { result: FlowResult }) {
  const [openYear, setOpenYear] = useState<number | null>(null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Funding ledger</CardTitle>
        <CardDescription>
          Each year, by source. Open a year to see the month-by-month flow including the buffer, debt and
          savings allocations.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Year</TableHead>
              {COLS.map((c) => (
                <TableHead key={c.key} className="text-right">
                  {c.label}
                </TableHead>
              ))}
              <TableHead className="text-right">Total invested</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.years.map((y) => (
              <>
                <TableRow key={y.year}>
                  <TableCell className="font-medium">{y.year}</TableCell>
                  {COLS.map((c) => (
                    <TableCell key={c.key} className="text-right text-xs tabular-nums">
                      {(y.byCategory[c.key] || 0) > 0.5 ? money(y.byCategory[c.key] || 0) : '—'}
                    </TableCell>
                  ))}
                  <TableCell className="text-right text-sm font-semibold tabular-nums">
                    {money(y.invested)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setOpenYear(openYear === y.year ? null : y.year)}
                    >
                      {openYear === y.year ? 'Hide' : 'Months'}
                    </Button>
                  </TableCell>
                </TableRow>
                {openYear === y.year && (
                  <TableRow key={`${y.year}-months`}>
                    <TableCell colSpan={COLS.length + 3} className="bg-muted/30 p-0">
                      <div className="overflow-x-auto p-2">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Month</TableHead>
                              <TableHead className="text-right">Beginning</TableHead>
                              <TableHead className="text-right">Core in</TableHead>
                              <TableHead className="text-right">Freed cash</TableHead>
                              <TableHead className="text-right">Buffer</TableHead>
                              <TableHead className="text-right">Debt</TableHead>
                              <TableHead className="text-right">Savings</TableHead>
                              <TableHead className="text-right">Net invested</TableHead>
                              <TableHead className="text-right">Growth</TableHead>
                              <TableHead className="text-right">Ending</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {y.months.map((m) => (
                              <TableRow key={m.month}>
                                <TableCell className="whitespace-nowrap text-xs">{monthLabel(m.month)}</TableCell>
                                <Num v={m.beginning} />
                                <Num v={m.coreTotal} />
                                <Num v={m.flexibleAvailable} />
                                <Num v={m.bufferAllocation} />
                                <Num v={m.debtAllocation} />
                                <Num v={m.savingsAllocation + m.otherAllocation} />
                                <Num v={m.investedTotal} bold />
                                <Num v={m.growth} />
                                <Num v={m.ending} />
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Num({ v, bold }: { v: number; bold?: boolean }) {
  return (
    <TableCell className={`text-right text-xs tabular-nums ${bold ? 'font-semibold' : ''}`}>
      {money2(v)}
    </TableCell>
  );
}

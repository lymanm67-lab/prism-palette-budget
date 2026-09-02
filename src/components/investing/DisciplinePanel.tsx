import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ROLE_META, holdingPeriodStatus, money, pct, saleEstimate } from '@/lib/investing/roles';
import { useInvestingMetrics } from '@/hooks/use-investing-metrics';
import { useSaveDecision, useInvDecisions } from '@/hooks/use-investing';

const BUY_CHECKS = [
  'Which of the five roles is this filling, and is that role underweight?',
  'What is the written thesis or identifiable catalyst?',
  'What would prove this wrong?',
  'What is the expected holding period?',
  'Does it keep the position inside its cap and the risk budget?',
  'Which account should hold it, given the tax treatment?',
  'Is the capital priority sequence clear (reserve floor, high-interest debt, committed funds)?',
];

const SELL_REASONS = [
  { value: 'thesis_broken', label: 'The thesis or catalyst is no longer valid' },
  { value: 'role_filled_elsewhere', label: 'Another holding now does this job better' },
  { value: 'above_cap', label: 'Position grew past its cap' },
  { value: 'rebalance', label: 'Rebalancing back to target' },
  { value: 'need_cash', label: 'Plan needs the cash for a higher priority' },
  { value: 'tax_management', label: 'Tax management (loss harvest or gain timing)' },
];

export function DisciplinePanel() {
  const { positions } = useInvestingMetrics();
  const decisions = useInvDecisions();
  const journal = useSaveDecision();
  const [ticker, setTicker] = useState('');
  const [reasonCode, setReasonCode] = useState('rebalance');
  const [shares, setShares] = useState(0);
  const [notes, setNotes] = useState('');

  const selected = positions.find((p) => p.ticker === ticker);
  const estimate = selected ? saleEstimate(selected as any, shares) : null;
  const rows = (decisions.data ?? []) as any[];

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Buy discipline</CardTitle>
          <CardDescription>Answer these before adding any holding. A position without a job is not a position.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {BUY_CHECKS.map((c) => <li key={c}>{c}</li>)}
          </ol>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sell discipline</CardTitle>
          <CardDescription>
            Record the reason before you sell. Prism estimates the holding period and proceeds — it does not calculate your tax bill or place trades.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label>Holding</Label>
              <Select value={ticker} onValueChange={setTicker}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {positions.map((p) => <SelectItem key={p.id} value={p.ticker}>{p.ticker} · {p.role}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Shares to sell</Label>
              <Input type="number" step="0.0001" value={shares} onChange={(e) => setShares(Number(e.target.value))} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Reason</Label>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SELL_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selected && (
            <div className="rounded-md border border-border/60 bg-background/40 p-3 text-sm">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span>Estimated proceeds: <strong>{money(estimate?.proceeds ?? 0, 2)}</strong></span>
                <span>Estimated cost basis sold: {money(estimate?.basis ?? 0, 2)}</span>
                <span>Estimated gain/loss: {money(estimate?.gain ?? 0, 2)}</span>
                <span>Holding period: {holdingPeriodStatus(selected.entry_date).label}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Estimates only, using the price and cost basis on file. Sale proceeds are not taxable gain. Confirm actual figures with your brokerage and tax advisor.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <Label>What changed</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button
            disabled={!selected || journal.isPending}
            onClick={() =>
              journal.mutate({
                action: 'sell',
                role: selected?.role,
                ticker: selected?.ticker,
                amount: estimate?.proceeds ?? null,
                reason: [SELL_REASONS.find((r) => r.value === reasonCode)?.label, `${shares} shares`, notes]
                  .filter(Boolean)
                  .join(' · '),
                expected_outcome: 'Recorded in the decision journal for later review',
              })
            }
          >
            Log sell decision
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Rebalancing rules</CardTitle>
          <CardDescription>How your plan restores role weights</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="a">
              <AccordionTrigger>1. Direct new money first</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Send contributions to the most underweight role. No sale, no tax consequence, no transaction friction.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="b">
              <AccordionTrigger>2. Trim inside tax-advantaged accounts next</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Rebalancing inside an IRA or HSA does not create a taxable event, so prefer it over trimming taxable holdings.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="c">
              <AccordionTrigger>3. Trim taxable holdings last, and only past the drift band</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Only act when a role is outside the drift band you set, and check the holding period before selling.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent decisions</CardTitle>
          <CardDescription>Your journal — decisions, reasons, and what you expected</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No decisions logged yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Holding</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 15).map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{(d.decided_on ?? d.created_at ?? '').slice(0, 10)}</TableCell>
                    <TableCell className="capitalize">{String(d.action).replace('_', ' ')}</TableCell>
                    <TableCell>
                      {d.ticker ?? '—'}{' '}
                      {d.role && <Badge variant="outline" className={ROLE_META[d.role as keyof typeof ROLE_META]?.accent}>{d.role}</Badge>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.reason ?? d.notes ?? '—'}</TableCell>
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

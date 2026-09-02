import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ROLE_META, money, pct, positionGain, positionValue } from '@/lib/investing/roles';
import { useInvestingMetrics } from '@/hooks/use-investing-metrics';
import { useInvReviews, useSaveReview } from '@/hooks/use-investing';

const MONTHLY_AGENDA = [
  'Are the role weights still inside the drift band?',
  'Did any position pass its cap or the risk budget?',
  'Are contributions going to the most underweight role?',
  'Is the emergency reserve floor still intact?',
  'Any thesis or catalyst that no longer holds?',
];

const ANNUAL_AGENDA = [
  'Do the five role targets still match the plan and the horizon?',
  'How did each role contribute to the portfolio result?',
  'Are the accounts holding each role still the right ones for tax treatment?',
  'Does the risk budget still match your tolerance and the legacy plan?',
  'Which decisions from the journal worked, and which did not?',
];

export function ReviewsPanel() {
  const { allocation, totals, positions, fit } = useInvestingMetrics();
  const reviews = useInvReviews();
  const save = useSaveReview();
  const [kind, setKind] = useState('monthly');
  const [notes, setNotes] = useState('');

  const rows = (reviews.data ?? []) as any[];

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Strategy Fit Score</CardTitle>
          <CardDescription>How closely today's portfolio matches the plan you wrote. Not a performance score.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-3">
            <div className="text-3xl font-semibold">{Math.round(fit.score)}</div>
            <span className="pb-1 text-sm text-muted-foreground">/ 100</span>
          </div>
          <Progress value={fit.score} />
          <ul className="space-y-1 text-sm">
            {fit.factors.length === 0 ? (
              <li className="text-muted-foreground">No plan gaps detected — targets, drift, overlap and reserves all check out.</li>
            ) : (
              fit.factors.map((f) => (
                <li key={f} className="text-muted-foreground">{f}</li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Attribution by role</CardTitle>
          <CardDescription>Unrealized gain or loss plus dividends recorded, by role. Uses the prices and cost basis on file.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Weight</TableHead>
                <TableHead className="text-right">Gain/loss</TableHead>
                <TableHead className="text-right">Dividends recorded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocation.rows.map((r) => {
                const gain = r.positions.reduce((s, p) => s + positionGain(p), 0);
                const div = r.positions.reduce((s, p) => s + Number(p.dividend_income_ytd ?? 0), 0);
                return (
                  <TableRow key={r.role}>
                    <TableCell><Badge variant="outline" className={ROLE_META[r.role].accent}>{r.role}</Badge></TableCell>
                    <TableCell className="text-right">{money(r.value, 2)}</TableCell>
                    <TableCell className="text-right">{pct(r.currentPct)}</TableCell>
                    <TableCell className={`text-right ${gain >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>{money(gain, 2)}</TableCell>
                    <TableCell className="text-right">{money(div, 2)}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold">{money(totals.value, 2)}</TableCell>
                <TableCell className="text-right">100%</TableCell>
                <TableCell className="text-right font-semibold">{money(positions.reduce((s, p) => s + positionGain(p), 0), 2)}</TableCell>
                <TableCell className="text-right font-semibold">{money(positions.reduce((s, p) => s + Number(p.dividend_income_ytd ?? 0), 0), 2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            A role doing its job is not the same as the role with the highest return. GUARDRAIL is expected to lag in strong markets.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Reviews</CardTitle>
          <CardDescription>Monthly check-in and annual strategy review</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label>Review type</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly check-in</SelectItem>
                  <SelectItem value="annual">Annual strategy review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3">
              <Label>Agenda</Label>
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                {(kind === 'monthly' ? MONTHLY_AGENDA : ANNUAL_AGENDA).map((a) => <li key={a}>{a}</li>)}
              </ul>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes and decisions</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button
            disabled={save.isPending}
            onClick={async () => {
              await save.mutateAsync({
                review_type: kind,
                period_label: new Date().toISOString().slice(0, 10),
                answers: {},
                metrics: { fit_score: Math.round(fit.score), portfolio_value: totals.value },
                notes,
              });
              setNotes('');
            }}
          >
            Save review
          </Button>

          {rows.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Fit score</TableHead>
                  <TableHead className="text-right">Portfolio</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 10).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.reviewed_on}</TableCell>
                    <TableCell className="capitalize">{r.kind}</TableCell>
                    <TableCell className="text-right">{r.fit_score ?? '—'}</TableCell>
                    <TableCell className="text-right">{money(Number(r.portfolio_value ?? 0))}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.notes ?? '—'}</TableCell>
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

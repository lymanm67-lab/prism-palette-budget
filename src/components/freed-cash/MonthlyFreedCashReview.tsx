import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  FreedCashRedirect,
  FreedCashSource,
  redirectCapacity,
  useFreedCashReviews,
  useSaveFreedCashReview,
} from '@/hooks/use-freed-cash';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

interface Props {
  sources: FreedCashSource[];
  redirects: FreedCashRedirect[];
}

export function MonthlyFreedCashReview({ sources, redirects }: Props) {
  const { data: reviews } = useFreedCashReviews();
  const save = useSaveFreedCashReview();

  const capacity = useMemo(() => redirectCapacity(sources, redirects), [sources, redirects]);
  const captureRate =
    capacity.verifiedMonthly > 0 ? (capacity.assignedMonthly / capacity.verifiedMonthly) * 100 : 0;

  const [reviewMonth, setReviewMonth] = useState(monthStart());
  const [wins, setWins] = useState('');
  const [leaks, setLeaks] = useState('');
  const [next, setNext] = useState('');

  const submit = async () => {
    await save.mutateAsync({
      review_month: reviewMonth,
      verified_monthly: Number(capacity.verifiedMonthly.toFixed(2)),
      redirected_monthly: Number(capacity.assignedMonthly.toFixed(2)),
      unassigned_monthly: Number(capacity.unassignedMonthly.toFixed(2)),
      capture_rate: Number(captureRate.toFixed(1)),
      wins: wins || null,
      leaks_found: leaks || null,
      next_actions: next || null,
    });
    setWins('');
    setLeaks('');
    setNext('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Log this month's review</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Snapshot the freed cash you verified, where it went, and what still needs a job.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Review month</Label>
              <Input type="date" value={reviewMonth} onChange={(e) => setReviewMonth(e.target.value)} />
            </div>
            <Metric label="Verified freed cash" value={`${money(capacity.verifiedMonthly)}/mo`} />
            <Metric label="Redirected" value={`${money(capacity.assignedMonthly)}/mo`} />
            <Metric label="Capture rate" value={`${captureRate.toFixed(1)}%`} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Wins</Label>
              <Textarea rows={3} value={wins} onChange={(e) => setWins(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Leaks found</Label>
              <Textarea rows={3} value={leaks} onChange={(e) => setLeaks(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Next actions</Label>
              <Textarea rows={3} value={next} onChange={(e) => setNext(e.target.value)} />
            </div>
          </div>

          <Button onClick={submit} disabled={save.isPending}>
            Save monthly review
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Review history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(reviews ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No reviews logged yet.</p>
          )}
          {(reviews ?? []).map((r) => (
            <div key={r.id} className="rounded-lg border border-border/60 bg-card/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {new Date(r.review_month + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  Verified {money(Number(r.verified_monthly))} · redirected {money(Number(r.redirected_monthly))}{' '}
                  · unassigned {money(Number(r.unassigned_monthly))} · capture {Number(r.capture_rate).toFixed(1)}%
                </p>
              </div>
              {r.wins && <p className="mt-1 text-xs text-muted-foreground">Wins: {r.wins}</p>}
              {r.leaks_found && <p className="text-xs text-muted-foreground">Leaks: {r.leaks_found}</p>}
              {r.next_actions && <p className="text-xs text-muted-foreground">Next: {r.next_actions}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <p className="pt-1.5 text-lg font-semibold">{value}</p>
    </div>
  );
}

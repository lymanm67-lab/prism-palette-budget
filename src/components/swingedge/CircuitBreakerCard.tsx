import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useCircuitBreaker } from '@/hooks/use-swingedge-training';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/**
 * The pause card. It never tells the user they traded badly — it reports a
 * pattern and asks for a written review before the next plan.
 */
export default function CircuitBreakerCard() {
  const { assessment, tally, limits, lastReview, completeReview, isSaving } = useCircuitBreaker();
  const [notes, setNotes] = useState('');

  const tripped = assessment.tripped;
  const pct = (used: number, limit: number) =>
    limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  const submit = async () => {
    if (notes.trim().length < 40) {
      toast.error('Write a little more — the review is the point of the pause');
      return;
    }
    try {
      await completeReview(notes.trim());
      toast.success('Review saved — you can plan again');
      setNotes('');
    } catch {
      toast.error('Could not save that review');
    }
  };

  return (
    <Card className={tripped ? 'border-prism-amber/50' : undefined}>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {tripped ? (
            <AlertTriangle className="h-4 w-4 text-prism-amber" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-prism-lime" />
          )}
          Trading pause
          <Badge
            variant="outline"
            className={
              tripped
                ? 'border-prism-amber/50 bg-prism-amber/10 text-prism-amber text-[10px]'
                : 'border-prism-lime/50 bg-prism-lime/10 text-prism-lime text-[10px]'
            }
          >
            {assessment.headline}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {assessment.reason ??
            'Nothing is stopping you from planning a trade. These limits are the ones you set yourself, and they are here to catch a losing run before it turns into a bigger decision.'}
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Losses in a row</p>
            <p className="mt-1 text-lg font-semibold">
              {tally.consecutiveLosses}
              <span className="text-xs font-normal text-muted-foreground">
                {' '}
                of {limits.consecutiveLosses}
              </span>
            </p>
            <Progress value={pct(tally.consecutiveLosses, limits.consecutiveLosses)} className="mt-2 h-1.5" />
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Lost today</p>
            <p className="mt-1 text-lg font-semibold">
              {money(tally.dailyLoss)}
              <span className="text-xs font-normal text-muted-foreground">
                {' '}
                {limits.dailyLossLimit > 0 ? `of ${money(limits.dailyLossLimit)}` : '· no limit set'}
              </span>
            </p>
            <Progress value={pct(tally.dailyLoss, limits.dailyLossLimit)} className="mt-2 h-1.5" />
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Lost this week</p>
            <p className="mt-1 text-lg font-semibold">
              {money(tally.weeklyLoss)}
              <span className="text-xs font-normal text-muted-foreground">
                {' '}
                {limits.weeklyLossLimit > 0 ? `of ${money(limits.weeklyLossLimit)}` : '· no limit set'}
              </span>
            </p>
            <Progress value={pct(tally.weeklyLoss, limits.weeklyLossLimit)} className="mt-2 h-1.5" />
          </div>
        </div>

        {tripped ? (
          <div className="space-y-3 rounded-lg border border-prism-amber/40 bg-prism-amber/5 p-3">
            <p className="text-sm font-medium">Work through these before the next plan</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {assessment.reviewSteps.map((step) => (
                <li key={step} className="flex gap-2">
                  <span className="text-prism-amber">·</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened across these trades, and what will you do differently?"
              rows={4}
            />
            <Button onClick={submit} disabled={isSaving} size="sm">
              Save review and continue
            </Button>
            <p className="text-xs text-muted-foreground">
              This does not stop an order at your broker. It stops SwingEdge approving the next plan, which is
              usually the trade that costs the most.
            </p>
          </div>
        ) : lastReview ? (
          <div className="flex gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-prism-lime" />
            <span>
              <span className="font-medium text-foreground">Last review: </span>
              {lastReview}
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

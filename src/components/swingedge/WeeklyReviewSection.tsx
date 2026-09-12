import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import CollapsibleSection from '@/components/swingedge/CollapsibleSection';
import { usePaperTradeManagement } from '@/hooks/use-swingedge-stops';
import { useWeeklyReviews } from '@/hooks/use-swingedge-training';
import { downloadCsv, toCsv } from '@/lib/swingedge/training';
import { weekStartOf } from '@/lib/swingedge/circuitBreaker';

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface Props {
  /** Stable collapse id so several copies of this panel remember separately. */
  id?: string;
  /** Extra questions for the specific training week being reviewed. */
  prompts?: string[];
  defaultOpen?: boolean;
}

/**
 * The weekly review. The measurable parts are read from the trade record rather
 * than typed, so a review cannot flatter the week it is reviewing.
 */
export default function WeeklyReviewSection({ id = 'training-weekly-review', prompts, defaultOpen = true }: Props) {
  const { reviews, saveReview, deleteReview, isSaving } = useWeeklyReviews();
  const { trades } = usePaperTradeManagement();
  const [weekStart, setWeekStart] = useState(weekStartOf(new Date().toISOString().slice(0, 10)));
  const [skipSymbol, setSkipSymbol] = useState('');
  const [skipReason, setSkipReason] = useState('');
  const [lesson, setLesson] = useState('');
  const [notes, setNotes] = useState('');

  const measured = useMemo(() => {
    const inWeek = trades.filter(
      (t) =>
        t.status === 'CLOSED' &&
        (t.exit_date ?? '') >= weekStart &&
        (t.exit_date ?? '') <= addDays(weekStart, 6),
    );
    const scored = inWeek.filter((t) => t.execution_score !== null);
    const avg = scored.length
      ? Math.round(scored.reduce((s, t) => s + (t.execution_score ?? 0), 0) / scored.length)
      : 0;
    const followed = inWeek.filter((t) => (t.execution_score ?? 0) >= 75).length;
    return {
      trades: inWeek.length,
      executionScore: avg,
      rulePct: inWeek.length ? Math.round((followed / inWeek.length) * 100) : 0,
    };
  }, [trades, weekStart]);

  const submit = async () => {
    try {
      await saveReview({
        week_start: weekStart,
        trades_taken: measured.trades,
        rule_following_pct: measured.rulePct,
        execution_score: measured.executionScore,
        best_skip_symbol: skipSymbol.trim().toUpperCase() || null,
        best_skip_reason: skipReason.trim() || null,
        lesson_to_revisit: lesson.trim() || null,
        notes: notes.trim() || null,
      });
      toast.success('Weekly review saved');
      setSkipSymbol('');
      setSkipReason('');
      setLesson('');
      setNotes('');
    } catch {
      toast.error('Could not save that review');
    }
  };

  const exportReviews = () => {
    if (!reviews.length) {
      toast.error('No reviews to export yet');
      return;
    }
    const csv = toCsv(
      [
        'week_start',
        'trades_taken',
        'rule_following_pct',
        'execution_score',
        'best_skip_symbol',
        'best_skip_reason',
        'lesson_to_revisit',
        'notes',
      ],
      reviews as unknown as Record<string, unknown>[],
    );
    downloadCsv('swingedge-weekly-reviews.csv', csv);
  };

  return (
    <CollapsibleSection
      id={id}
      title="Weekly review"
      description="Written once a week, including the best trade you chose not to take"
      defaultOpen={defaultOpen}
    >
      <div className="space-y-4 pt-1">
        {prompts && prompts.length ? (
          <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Answer these in your notes
            </p>
            <ul className="space-y-1 text-sm">
              {prompts.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-prism-teal">·</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Week starting</Label>
            <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Trades closed</p>
            <p className="text-lg font-semibold">{measured.trades}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Rules followed</p>
            <p className="text-lg font-semibold">{measured.rulePct}%</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Plan following</p>
            <p className="text-lg font-semibold">{measured.executionScore}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Best trade you skipped</Label>
            <Input
              value={skipSymbol}
              onChange={(e) => setSkipSymbol(e.target.value)}
              placeholder="Ticker, if there was one"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Why skipping it was right</Label>
            <Input
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder="Setup was not qualified, no room under my limit…"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Lesson to go back to</Label>
          <Input
            value={lesson}
            onChange={(e) => setLesson(e.target.value)}
            placeholder="Which Academy lesson would have helped most?"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="What went well, what you want to change, and the one habit you are working on."
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={submit} disabled={isSaving}>
            Save this week's review
          </Button>
          <Button size="sm" variant="outline" onClick={exportReviews}>
            <Download className="mr-1 h-3.5 w-3.5" /> Export reviews
          </Button>
        </div>

        {reviews.length ? (
          <div className="space-y-2">
            {reviews.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Week of {r.week_start}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {r.trades_taken} trade{r.trades_taken === 1 ? '' : 's'} · {r.rule_following_pct}% rules
                      followed
                    </span>
                  </p>
                  {r.best_skip_symbol || r.best_skip_reason ? (
                    <p className="text-xs text-muted-foreground">
                      Best skip: {r.best_skip_symbol ?? '—'} {r.best_skip_reason ? `· ${r.best_skip_reason}` : ''}
                    </p>
                  ) : null}
                  {r.notes ? <p className="text-xs text-muted-foreground">{r.notes}</p> : null}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => deleteReview(r.id)}
                  aria-label={`Delete review for week of ${r.week_start}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No reviews yet. The first one is worth writing even after a quiet week.
          </p>
        )}
      </div>
    </CollapsibleSection>
  );
}

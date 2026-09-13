import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChartQuestion, ChartRead } from '@/lib/swingedge/chartReading';

const money = (n: number | null) =>
  n === null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const dirTone = (d: string) =>
  d === 'BULLISH'
    ? 'border-prism-lime/50 bg-prism-lime/10 text-prism-lime'
    : d === 'BEARISH'
      ? 'border-destructive/50 bg-destructive/10 text-destructive'
      : 'border-border bg-muted/40 text-muted-foreground';

/** One question with the answer hidden until the trader commits to a read. */
export function ChartQuestionItem({ q }: { q: ChartQuestion }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{q.question}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Week {q.week} — {q.weekTitle}
            {q.teaches ? ` · ${q.teaches}` : ''}
          </p>
        </div>
        <Button size="sm" variant="ghost" className="shrink-0" onClick={() => setShown((s) => !s)}>
          {shown ? <EyeOff className="mr-1 h-3.5 w-3.5" /> : <Eye className="mr-1 h-3.5 w-3.5" />}
          {shown ? 'Hide' : 'Check my answer'}
        </Button>
      </div>
      {shown ? (
        <p className="mt-2 border-t pt-2 text-sm text-muted-foreground">{q.answer}</p>
      ) : (
        <p className="mt-2 text-xs italic text-muted-foreground">
          Say your answer out loud first, then check it.
        </p>
      )}
    </div>
  );
}

export default function ReadThisChartCard({
  read,
  symbol,
}: {
  read: ChartRead;
  symbol?: string | null;
}) {
  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          How to read this chart{symbol ? ` — ${symbol}` : ''}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Everything below is measured from the candles above. Nothing here is a recommendation.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Reading the picture
          </p>
          <ul className="space-y-1.5 text-sm">
            {read.howToRead.map((h) => (
              <li key={h} className="flex gap-2">
                <span className="text-prism-teal">·</span>
                <span className="text-muted-foreground">{h}</span>
              </li>
            ))}
          </ul>
        </div>

        {!read.hasData ? (
          <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            {read.direction.sentence}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Newest candle
                </p>
                {read.candle ? (
                  <>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[11px]">
                        {read.candle.classification}
                      </Badge>
                      <Badge variant="outline" className="text-[11px]">
                        {read.candle.size} range
                      </Badge>
                      <Badge variant="outline" className="text-[11px]">
                        {read.candle.wickShape}
                      </Badge>
                      {read.candle.developing ? (
                        <Badge className="border-prism-amber/50 bg-prism-amber/10 text-[11px] text-prism-amber">
                          DEVELOPING
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {read.candle.date.slice(0, 10)} was {read.candle.description}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No candle to describe yet.</p>
                )}
              </div>

              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Direction
                </p>
                <p className="mt-1.5 text-sm">
                  Daily: <span className="text-muted-foreground">{read.direction.daily}</span>
                </p>
                <p className="text-sm">
                  Weekly: <span className="text-muted-foreground">{read.direction.weekly}</span>
                </p>
                <p className="text-sm">
                  Setup: <span className="text-muted-foreground">{read.direction.setup}</span>
                </p>
              </div>
            </div>

            {read.patterns.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Candlestick patterns on this chart
                </p>
                <div className="space-y-2">
                  {read.patterns.map((p) => (
                    <div key={`${p.name}-${p.confirmationLevel}`} className="rounded-lg border bg-muted/20 p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium">{p.name}</span>
                        <Badge variant="outline" className={`text-[11px] ${dirTone(p.direction)}`}>
                          {p.direction}
                        </Badge>
                        <Badge variant="outline" className="text-[11px]">
                          {p.status}
                        </Badge>
                        <Badge variant="outline" className="text-[11px]">
                          {p.band} · {p.score}/100
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        Formed {p.location}. Confirms on a close
                        {p.direction === 'BEARISH' ? ' below ' : ' above '}
                        {money(p.confirmationLevel)}. Wrong at {p.invalidation}.
                      </p>
                      <Button asChild size="sm" variant="ghost" className="mt-1 h-7 px-2 text-xs">
                        <Link to={`/swingedge/training/week/${p.week}`}>
                          <BookOpen className="mr-1 h-3.5 w-3.5" /> Covered in week {p.week}
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                No candlestick pattern is showing above the significance threshold. That is a normal
                and valid read.
              </p>
            )}

            {read.levels.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  What the dashed lines mean
                </p>
                <div className="space-y-1.5">
                  {read.levels.map((l) => (
                    <div key={l.label} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="font-medium">{l.label}</span>
                      <span>{money(l.value)}</span>
                      {l.distancePct != null ? (
                        <span className="text-xs text-muted-foreground">
                          ({l.distancePct >= 0 ? '+' : ''}
                          {l.distancePct.toFixed(1)}% from price)
                        </span>
                      ) : null}
                      <span className="w-full text-xs text-muted-foreground">{l.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Answer these before you plan anything
                </p>
                <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                  <Link to="/swingedge/training">
                    Six-week programme <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              <div className="space-y-2">
                {read.questions.map((q) => (
                  <ChartQuestionItem key={q.question} q={q} />
                ))}
              </div>
            </div>

            {read.limits.length > 0 ? (
              <div className="rounded-lg border border-prism-amber/30 bg-prism-amber/5 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-prism-amber">
                  What this chart does not tell you
                </p>
                <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
                  {read.limits.map((l) => (
                    <li key={l}>· {l}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

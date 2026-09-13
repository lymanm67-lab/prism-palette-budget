import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
  Loader2,
  OctagonAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { disciplineBand } from '@/lib/swingedge/discipline';
import { useAskMentor, type MentorScope } from '@/hooks/use-swingedge-mentor';

interface Props {
  /** TRADE critiques the setup in front of you; REVIEW critiques your record. */
  scope: MentorScope;
  page: string;
  symbol?: string | null;
  /** Already-measured facts from the screen. Never invented data. */
  context?: Record<string, unknown> | null;
  className?: string;
}

const VERDICT_LABEL: Record<string, string> = {
  follow_plan: 'On plan',
  caution: 'Caution — tighten this first',
  stand_down: 'Stand down',
};

const VERDICT_TONE: Record<string, string> = {
  follow_plan: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  caution: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  stand_down: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
};

const VerdictIcon = ({ verdict }: { verdict: string }) =>
  verdict === 'follow_plan' ? (
    <ShieldCheck className="h-4 w-4 text-emerald-500" />
  ) : verdict === 'stand_down' ? (
    <OctagonAlert className="h-4 w-4 text-rose-500" />
  ) : (
    <AlertTriangle className="h-4 w-4 text-amber-500" />
  );

export default function AiMentorCard({ scope, page, symbol, context = null, className }: Props) {
  const { ask, result, report, verdicts, isAsking, error } = useAskMentor();
  const [manual, setManual] = useState('');
  const [question, setQuestion] = useState('');

  const active = (symbol ?? manual).trim().toUpperCase();
  const verdict = (result?.verdict ?? '').toLowerCase();
  const lastVerdicts = verdicts.slice(0, 3);

  const run = () =>
    ask({
      scope,
      page,
      symbol: scope === 'TRADE' ? active : null,
      context,
      question: question || null,
    }).catch(() => undefined);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="h-4 w-4 text-primary" />
          AI mentor
        </CardTitle>
        <CardDescription>
          {scope === 'TRADE'
            ? 'Checks this setup against the rules you set for yourself and says plainly whether emotion is driving it.'
            : 'Reviews the trades and journal entries you have recorded and critiques the habits behind them.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Discipline scorecard, measured from your own records. */}
        {report && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Rule-following score</p>
              {report.scored ? (
                <Badge variant="outline">
                  {report.score}/100 · {disciplineBand(report.score)}
                </Badge>
              ) : (
                <Badge variant="outline">Not enough recorded trades yet</Badge>
              )}
            </div>
            {report.scored && <Progress value={report.score} className="mt-2 h-2" />}
            <p className="mt-2 text-xs text-muted-foreground">
              From {report.tradesConsidered} recorded trade{report.tradesConsidered === 1 ? '' : 's'} (
              {report.closedTrades} closed).
            </p>
            {report.findings.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {report.findings.slice(0, 4).map((f) => (
                  <li key={f.key} className="flex gap-2">
                    <AlertTriangle
                      className={cn(
                        'mt-0.5 h-3 w-3 shrink-0',
                        f.severity === 'HIGH' ? 'text-rose-500' : 'text-amber-500',
                      )}
                    />
                    <span>
                      <span className="font-medium">{f.label}:</span> {f.detail}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {report.findings.length === 0 && report.scored && (
              <p className="mt-2 flex items-center gap-2 text-xs text-emerald-500">
                <CheckCircle2 className="h-3 w-3" /> Nothing recorded breaks your rules.
              </p>
            )}
            {report.notRecorded.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Not checked (never recorded): {report.notRecorded.join(', ')}.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          {scope === 'TRADE' && !symbol && (
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value.toUpperCase())}
              placeholder="Symbol (e.g. AAPL)"
              className="sm:w-40"
            />
          )}
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={
              scope === 'TRADE'
                ? 'Optional: what are you unsure about?'
                : 'Optional: what habit do you want checked?'
            }
          />
          <Button onClick={run} disabled={isAsking || (scope === 'TRADE' && !active)}>
            {isAsking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {scope === 'TRADE' ? 'Check this trade' : 'Review my habits'}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {verdict && (
                <Badge variant="outline" className={VERDICT_TONE[verdict]}>
                  <span className="mr-1 inline-flex align-middle">
                    <VerdictIcon verdict={verdict} />
                  </span>
                  {VERDICT_LABEL[verdict] ?? verdict}
                </Badge>
              )}
            </div>

            {result.headline && <p className="text-sm font-medium">{result.headline}</p>}

            {result.rule_breaks && result.rule_breaks.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Rules this breaks</p>
                <ul className="space-y-2 text-sm">
                  {result.rule_breaks.map((b, i) => (
                    <li key={i} className="rounded-md border border-destructive/30 bg-destructive/5 p-2">
                      <p className="font-medium">{b.rule}</p>
                      {b.what_happened && <p className="text-muted-foreground">{b.what_happened}</p>}
                      {b.fix && <p className="mt-1">Fix: {b.fix}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.emotional_flags && result.emotional_flags.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Emotion showing in the data
                </p>
                <ul className="space-y-2 text-sm">
                  {result.emotional_flags.map((f, i) => (
                    <li key={i} className="rounded-md border bg-muted/30 p-2">
                      <p className="font-medium">{f.pattern}</p>
                      {f.evidence && <p className="text-muted-foreground">{f.evidence}</p>}
                      {f.counter_move && <p className="mt-1">Counter-move: {f.counter_move}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.repeat_offences && result.repeat_offences.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">You have been warned about this before: </span>
                  {result.repeat_offences.filter(Boolean).join('; ')}
                </AlertDescription>
              </Alert>
            )}

            {result.rules_kept && result.rules_kept.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Rules this respects</p>
                <ul className="space-y-1 text-sm">
                  {result.rules_kept.filter(Boolean).map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.doing_well && result.doing_well.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">What you are doing well</p>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {result.doing_well.filter(Boolean).map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.discipline_note && <p className="text-sm text-muted-foreground">{result.discipline_note}</p>}

            {result.next_action && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                <span className="font-medium">Do this next: </span>
                {result.next_action}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {result.note ? `${result.note} ` : ''}Study material for paper trading, not financial advice.
            </p>
          </div>
        )}

        {lastVerdicts.length > 0 && (
          <div className="border-t pt-3">
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Recent mentor calls</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {lastVerdicts.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-2">
                  <span className="tabular-nums">{new Date(v.created_at).toLocaleDateString()}</span>
                  {v.symbol && <span className="font-medium">{v.symbol}</span>}
                  <span>{VERDICT_LABEL[(v.verdict ?? '').toLowerCase()] ?? v.verdict ?? '—'}</span>
                  {v.headline && <span className="truncate">— {v.headline}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

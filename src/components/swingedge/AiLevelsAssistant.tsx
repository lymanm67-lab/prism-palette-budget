import { useState } from 'react';
import { Bot, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

export interface AssistantLevels {
  entry?: number | null;
  stop?: number | null;
  target?: number | null;
  rewardRisk?: number | null;
}

interface AiResponse {
  rules_explanation?: string;
  ai_levels?: {
    entry?: number | null;
    stop?: number | null;
    target?: number | null;
    reward_risk?: number | null;
    basis?: string;
  } | null;
  agreement?: string;
  comparison?: string;
  confidence?: string;
  confidence_reason?: string;
  if_wrong?: string;
  risks?: string[];
  checks?: string[];
  note?: string;
}

interface Props {
  /** Symbol the assistant should read. When empty the card asks for one. */
  symbol?: string | null;
  /** Which screen this sits on — used in the prompt for context. */
  page: string;
  price?: number | null;
  /** Levels the app's own rules engine produced, if any. */
  rules?: AssistantLevels | null;
  /** Already-measured facts (setup, trend, ATR, scores). Never invented data. */
  context?: Record<string, unknown> | null;
  className?: string;
}

const money = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n)
    ? '—'
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const AGREEMENT_TONE: Record<string, string> = {
  agree: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  differ: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  no_trade: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
};

const AGREEMENT_LABEL: Record<string, string> = {
  agree: 'Agrees with the app',
  differ: 'Reads it differently',
  no_trade: 'No trade here',
};

const CONFIDENCE_TONE: Record<string, string> = {
  high: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  moderate: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  low: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
};

export default function AiLevelsAssistant({
  symbol,
  page,
  price = null,
  rules = null,
  context = null,
  className,
}: Props) {
  const [manual, setManual] = useState('');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiResponse | null>(null);

  const active = (symbol ?? manual).trim().toUpperCase();

  const ask = async () => {
    if (!active) {
      setError('Enter a symbol first.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('swingedge-levels-advisor', {
        body: { symbol: active, page, price, rules, context, question: question || null },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setResult(data as AiResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The assistant could not answer. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const ai = result?.ai_levels ?? null;
  const agreement = (result?.agreement ?? '').toLowerCase();
  const confidence = (result?.confidence ?? '').toLowerCase();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4 text-primary" />
          AI trade assistant
        </CardTitle>
        <CardDescription>
          Two reads on entry, stop and target: the app's own rules engine explained in plain English, and an
          independent read from the assistant. Both are for study — you decide.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          {!symbol && (
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
            placeholder="Optional: ask something specific about the levels"
          />
          <Button onClick={ask} disabled={loading} className="shrink-0">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {loading ? 'Thinking…' : 'Ask the assistant'}
          </Button>
        </div>

        {rules && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              App rules engine {active ? `· ${active}` : ''}
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Entry</p>
                <p className="font-semibold">{money(rules.entry)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stop</p>
                <p className="font-semibold">{money(rules.stop)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Target</p>
                <p className="font-semibold">{money(rules.target)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reward:risk</p>
                <p className="font-semibold">
                  {rules.rewardRisk && Number.isFinite(rules.rewardRisk)
                    ? `${rules.rewardRisk.toFixed(1)} : 1`
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {agreement && (
                <Badge variant="outline" className={AGREEMENT_TONE[agreement] ?? ''}>
                  {AGREEMENT_LABEL[agreement] ?? agreement}
                </Badge>
              )}
              {confidence && CONFIDENCE_TONE[confidence] && (
                <Badge variant="outline" className={CONFIDENCE_TONE[confidence]}>
                  Confidence in the data: {confidence}
                </Badge>
              )}
            </div>

            {result.rules_explanation && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  What the app's levels mean
                </p>
                <p className="text-sm text-muted-foreground">{result.rules_explanation}</p>
              </div>
            )}

            {ai && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Assistant's own read
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Entry</p>
                    <p className="font-semibold">{money(ai.entry)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Stop</p>
                    <p className="font-semibold">{money(ai.stop)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Target</p>
                    <p className="font-semibold">{money(ai.target)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Reward:risk</p>
                    <p className="font-semibold">
                      {ai.reward_risk && Number.isFinite(ai.reward_risk) ? `${Number(ai.reward_risk).toFixed(1)} : 1` : '—'}
                    </p>
                  </div>
                </div>
                {ai.basis && <p className="mt-2 text-sm text-muted-foreground">{ai.basis}</p>}
              </div>
            )}

            {result.comparison && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Which read to act on
                </p>
                <p className="text-sm text-muted-foreground">{result.comparison}</p>
              </div>
            )}

            {result.confidence_reason && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Why this confidence level
                </p>
                <p className="text-sm text-muted-foreground">{result.confidence_reason}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Confidence describes how complete the data behind the read is — never the odds of the trade
                  working.
                </p>
              </div>
            )}

            {result.if_wrong && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-amber-500">
                  If this read is wrong
                </p>
                <p className="text-sm text-muted-foreground">{result.if_wrong}</p>
              </div>
            )}

            {!!result.risks?.length && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  What could go wrong
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {result.risks.filter(Boolean).map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {!!result.checks?.length && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Check before you act
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {result.checks.filter(Boolean).map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.note && <p className="text-xs text-muted-foreground">{result.note}</p>}
            <p className="text-xs text-muted-foreground">
              Study material for paper trading. Not financial advice, and the assistant can be wrong — your own
              rules and risk limits come first.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

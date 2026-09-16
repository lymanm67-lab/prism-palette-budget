import { useState } from 'react';
import { Bot, Check, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { SetupState } from '@/lib/swingedge/indicators';

/** Plain-English meaning of each setup type, shown next to the picker. */
export const SETUP_MEANING: Record<SetupState, { label: string; blurb: string; entry: string }> = {
  PULLBACK: {
    label: 'Pullback',
    blurb:
      'An uptrend that has dipped back into support, a rising average or its last higher low, and is trying to resume.',
    entry: 'You buy the resumption. It is wrong if price closes below that higher low.',
  },
  BREAKOUT: {
    label: 'Breakout',
    blurb:
      'Price has built a base and is pressing or clearing a clear resistance level or the top of its range.',
    entry: 'You buy the break or its retest. It is wrong if price falls back inside the range.',
  },
  NONE: {
    label: 'No clear setup',
    blurb:
      'Choppy, sideways with no defined range, falling, or already run too far. There is no clean structure to trade.',
    entry: 'Nothing to do. Waiting is the trade.',
  },
};

interface SetupAdvice {
  recommended_setup?: string;
  headline?: string;
  why?: string;
  pullback_read?: string;
  breakout_read?: string;
  agrees_with_app?: boolean;
  disagreement?: string;
  what_to_wait_for?: string[];
  missing_data?: string[];
  confidence?: string;
  confidence_reason?: string;
  note?: string;
}

const CONFIDENCE_TONE: Record<string, string> = {
  high: 'bg-prism-lime/15 text-prism-lime border-prism-lime/40',
  moderate: 'bg-prism-amber/15 text-prism-amber border-prism-amber/40',
  low: 'bg-destructive/10 text-destructive border-destructive/40',
};

const normalize = (v?: string): SetupState | null => {
  const s = (v ?? '').toUpperCase();
  return s === 'PULLBACK' || s === 'BREAKOUT' || s === 'NONE' ? (s as SetupState) : null;
};

/**
 * Sits under stage one of the Planner. Shows what the chart detected, what each
 * setup type actually means, and — on request — the assistant's own read.
 * The assistant can only suggest; the owner still chooses the setup.
 */
export default function SetupAdvisorPanel({
  symbol,
  detected,
  chosen,
  onChoose,
  price = null,
  context = null,
  autoApplied,
}: {
  symbol: string;
  detected: SetupState | null;
  chosen: SetupState;
  onChoose: (s: SetupState) => void;
  price?: number | null;
  context?: Record<string, unknown> | null;
  autoApplied: boolean;
}) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advice, setAdvice] = useState<SetupAdvice | null>(null);

  const recommended = normalize(advice?.recommended_setup);
  const confidence = (advice?.confidence ?? '').toLowerCase();

  const ask = async () => {
    if (!symbol) {
      setError('Enter a symbol first.');
      return;
    }
    setLoading(true);
    setError(null);
    setAdvice(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('swingedge-setup-advisor', {
        body: {
          symbol,
          page: 'Trade Planner',
          price,
          detected,
          chosen,
          context,
          question: question || null,
        },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setAdvice(data as SetupAdvice);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The assistant could not answer. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Setup detected from the chart</p>
        {detected ? (
          <Badge variant="outline">{SETUP_MEANING[detected].label}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">not available yet — load a symbol</span>
        )}
        {detected && detected !== chosen && (
          <Button size="sm" variant="outline" className="h-7" onClick={() => onChoose(detected)}>
            Use detected setup
          </Button>
        )}
        {autoApplied && detected === chosen && detected && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="h-3 w-3" /> set automatically
          </span>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {(['PULLBACK', 'BREAKOUT', 'NONE'] as SetupState[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChoose(s)}
            className={cn(
              'rounded-md border p-2 text-left transition-colors',
              chosen === s ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40',
            )}
          >
            <p className="text-sm font-semibold">{SETUP_MEANING[s].label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{SETUP_MEANING[s].blurb}</p>
            <p className="mt-1 text-xs text-muted-foreground">{SETUP_MEANING[s].entry}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Optional: ask the assistant something about this setup"
        />
        <Button size="sm" className="shrink-0" onClick={ask} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {loading ? 'Reading the chart…' : 'Ask the assistant'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {advice && (
        <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Assistant recommends
            </span>
            {recommended && <Badge variant="outline">{SETUP_MEANING[recommended].label}</Badge>}
            {confidence && CONFIDENCE_TONE[confidence] && (
              <Badge variant="outline" className={CONFIDENCE_TONE[confidence]}>
                Confidence in the data: {confidence}
              </Badge>
            )}
            {recommended && recommended !== chosen && (
              <Button size="sm" variant="outline" className="h-7" onClick={() => onChoose(recommended)}>
                Use this setup
              </Button>
            )}
          </div>

          {advice.headline && <p className="font-semibold">{advice.headline}</p>}
          {advice.why && <p className="text-muted-foreground">{advice.why}</p>}

          {advice.agrees_with_app === false && advice.disagreement && (
            <p className="rounded-md border border-prism-amber/40 bg-prism-amber/10 p-2 text-prism-amber">
              {advice.disagreement}
            </p>
          )}

          {(advice.pullback_read || advice.breakout_read) && (
            <div className="grid gap-2 sm:grid-cols-2">
              {advice.pullback_read && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pullback read</p>
                  <p className="text-muted-foreground">{advice.pullback_read}</p>
                </div>
              )}
              {advice.breakout_read && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Breakout read</p>
                  <p className="text-muted-foreground">{advice.breakout_read}</p>
                </div>
              )}
            </div>
          )}

          {!!advice.what_to_wait_for?.filter(Boolean).length && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">What to wait for</p>
              <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                {advice.what_to_wait_for.filter(Boolean).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {!!advice.missing_data?.filter(Boolean).length && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Missing data</p>
              <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                {advice.missing_data.filter(Boolean).map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {advice.confidence_reason && (
            <p className="text-xs text-muted-foreground">{advice.confidence_reason}</p>
          )}
          {advice.note && <p className="text-xs text-muted-foreground">{advice.note}</p>}
          <p className="text-xs text-muted-foreground">
            Study material for paper trading. The assistant only suggests a setup type — it never sets your entry,
            stop, target or order prices.
          </p>
        </div>
      )}
    </div>
  );
}

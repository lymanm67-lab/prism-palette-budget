import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Brain, Loader2, Send, Sparkles, Info, Check, X, Minus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { useInvestmentHoldings } from '@/hooks/use-investment-data';
import { DisclaimerBlock } from '@/components/investment/DisclaimerBlock';
import {
  DEFAULT_ANSWERS,
  MODEL_PORTFOLIOS,
  analyzePortfolio,
  scoreRisk,
} from '@/lib/investment/portfolioModels';

const ADVISOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/virtual-advisor`;

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Am I too concentrated in any one asset class?',
  'What is fee drag actually costing me by age 75?',
  'Should my next dollar go to Roth or pre-tax?',
  'What would Buffett say about my current mix?',
];

type Verdict = 'ai' | 'human' | 'tie';

const COMPARISON: { dimension: string; ai: string; human: string; edge: Verdict }[] = [
  {
    dimension: 'Cost',
    ai: 'Included in Prism — no AUM fee',
    human: '$2,000–$4,000 flat, or ~1% AUM per year',
    edge: 'ai',
  },
  {
    dimension: 'Pattern & trend detection',
    ai: 'Scans every holding, fee, and contribution instantly',
    human: 'Deep but sampled; limited review hours',
    edge: 'ai',
  },
  {
    dimension: 'Availability',
    ai: 'Any hour, unlimited re-runs as numbers change',
    human: 'Quarterly or annual meetings',
    edge: 'ai',
  },
  {
    dimension: 'Consistency / no sales bias',
    ai: 'No products to sell, no commission',
    human: 'Depends on fee-only vs commission model',
    edge: 'ai',
  },
  {
    dimension: 'Can execute trades & rollovers',
    ai: 'No — analysis only',
    human: 'Yes, with discretion and paperwork',
    edge: 'human',
  },
  {
    dimension: 'Fiduciary duty & accountability',
    ai: 'None — educational only',
    human: 'Legally binding for a fiduciary CFP',
    edge: 'human',
  },
  {
    dimension: 'Complex tax, estate & pension filings',
    ai: 'Flags issues, cannot file or certify',
    human: 'CPA / attorney work product',
    edge: 'human',
  },
  {
    dimension: 'Behavioral coaching in a crash',
    ai: 'Always calm, but you can ignore it',
    human: 'A human phone call stops panic selling',
    edge: 'human',
  },
  {
    dimension: 'Plan depth on your real numbers',
    ai: 'Uses your live Prism data every run',
    human: 'Uses whatever you brought to the meeting',
    edge: 'tie',
  },
];

const EDGE_META: Record<Verdict, { label: string; className: string; Icon: typeof Check }> = {
  ai: { label: 'AI edge', className: 'bg-primary/15 text-primary border-primary/30', Icon: Check },
  human: { label: 'Planner edge', className: 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400', Icon: X },
  tie: { label: 'Even', className: 'bg-muted text-muted-foreground border-border', Icon: Minus },
};

export function VirtualAdvisorPanel({ plan }: { plan?: any }) {
  const { data: holdings = [] } = useInvestmentHoldings();
  const [analysis, setAnalysis] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [chatting, setChatting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const snapshot = useMemo(() => {
    const horizonYears =
      plan?.current_age && plan?.retirement_age
        ? Math.max(1, Number(plan.retirement_age) - Number(plan.current_age))
        : DEFAULT_ANSWERS.horizonYears;
    const { level } = scoreRisk({ ...DEFAULT_ANSWERS, horizonYears });
    const model = MODEL_PORTFOLIOS[level];
    const analysisResult = analyzePortfolio(holdings as any, model);

    return {
      profile: {
        current_age: plan?.current_age ?? null,
        retirement_age: plan?.retirement_age ?? null,
        horizon_years: horizonYears,
        goal_amount: plan?.target_amount ?? plan?.goal_amount ?? null,
        expected_return_pct: plan?.expected_return ?? 8,
        monthly_contribution: plan?.monthly_contribution ?? null,
      },
      portfolio: {
        total_value: analysisResult.total,
        weighted_expense_ratio_pct: analysisResult.weightedExpenseRatio * 100,
        model_used: model.name,
        allocation_vs_target: analysisResult.rows.map((r) => ({
          asset_class: r.label,
          actual_pct: Number(r.actualPct.toFixed(1)),
          target_pct: r.targetPct,
          dollars: Math.round(r.actualValue),
          status: r.status,
        })),
      },
      top_holdings: (holdings as any[]).slice(0, 20).map((h) => ({
        symbol: h.symbol ?? null,
        name: h.name ?? null,
        type: h.holding_type ?? null,
        market_value: Number(h.market_value ?? 0),
        account: h.accounts?.name ?? null,
      })),
    };
  }, [plan, holdings]);

  const stream = async (
    body: Record<string, unknown>,
    onDelta: (acc: string) => void,
  ) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const resp = await fetch(ADVISOR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || 'AI unavailable');
    }
    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let acc = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (!line.startsWith('data: ')) continue;
        const json = line.slice(6).trim();
        if (json === '[DONE]') break;
        try {
          const parsed = JSON.parse(json);
          const c = parsed.choices?.[0]?.delta?.content;
          if (c) {
            acc += c;
            onDelta(acc);
          }
        } catch {
          /* ignore partial */
        }
      }
    }
  };

  const runAnalysis = async () => {
    if (analyzing) return;
    setAnalyzing(true);
    setAnalysis('');
    try {
      await stream({ mode: 'analysis', snapshot }, setAnalysis);
    } catch (e: any) {
      if (e.name !== 'AbortError') setAnalysis(`⚠️ ${e.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const ask = async (q: string) => {
    if (!q.trim() || chatting) return;
    const next: Msg[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setChatting(true);
    try {
      setMessages([...next, { role: 'assistant', content: '' }]);
      await stream(
        { mode: 'qa', snapshot, question: q, history: messages },
        (acc) => setMessages([...next, { role: 'assistant', content: acc }]),
      );
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setMessages([...next, { role: 'assistant', content: `⚠️ ${e.message}` }]);
      }
    } finally {
      setChatting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Educational analysis only. This is not investment, tax, or legal advice, and it is not a
          substitute for a licensed fiduciary advisor. No trades are placed.
        </AlertDescription>
      </Alert>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" /> Virtual Investment &amp; Retirement Planner
          </CardTitle>
          <CardDescription>
            A 25-year Wall Street veteran persona in the Buffett/Munger tradition, reading your
            actual holdings, allocation, fees, and horizon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="analysis">
            <TabsList>
              <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
              <TabsTrigger value="compare">AI vs. Planner</TabsTrigger>
              <TabsTrigger value="chat">Ask the Planner</TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{(holdings as any[]).length} holdings</Badge>
                <Badge variant="outline">
                  Horizon {snapshot.profile.horizon_years} yrs
                </Badge>
                <Badge variant="outline">
                  Weighted fee {snapshot.portfolio.weighted_expense_ratio_pct.toFixed(2)}%
                </Badge>
              </div>

              <Button onClick={runAnalysis} disabled={analyzing} className="gap-2">
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {analysis ? 'Re-run analysis' : 'Run AI planner analysis'}
              </Button>

              {analysis && (
                <div className="rounded-lg border border-border/50 bg-muted/10 p-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_h2]:mt-4 [&_h2]:text-base [&_p]:my-1.5">
                    <ReactMarkdown>{analysis}</ReactMarkdown>
                  </div>
                </div>
              )}
              {!analysis && !analyzing && (
                <p className="text-sm text-muted-foreground">
                  Runs against your live Prism data — no forms to fill out.
                </p>
              )}
            </TabsContent>

            <TabsContent value="compare" className="mt-4 space-y-3">
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="p-3 text-left font-semibold">Dimension</th>
                      <th className="p-3 text-left font-semibold">Prism AI planner</th>
                      <th className="p-3 text-left font-semibold">Human planner (CFP)</th>
                      <th className="p-3 text-left font-semibold">Edge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.map((row) => {
                      const meta = EDGE_META[row.edge];
                      return (
                        <tr key={row.dimension} className="border-t border-border/40 align-top">
                          <td className="p-3 font-medium">{row.dimension}</td>
                          <td className="p-3 text-muted-foreground">{row.ai}</td>
                          <td className="p-3 text-muted-foreground">{row.human}</td>
                          <td className="p-3">
                            <Badge variant="outline" className={cn('gap-1 text-xs', meta.className)}>
                              <meta.Icon className="h-3 w-3" /> {meta.label}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Best use: let the AI do the continuous monitoring, math, and pattern detection, then
                hire a fee-only fiduciary for execution, filings, and the decisions that need
                accountability.
              </p>
            </TabsContent>

            <TabsContent value="chat" className="mt-4 space-y-3">
              {messages.length === 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      onClick={() => ask(s)}
                      className="h-auto justify-start whitespace-normal py-2 text-left text-xs"
                    >
                      <Sparkles className="mr-1.5 h-3 w-3 shrink-0 text-primary" /> {s}
                    </Button>
                  ))}
                </div>
              )}

              {messages.length > 0 && (
                <div className="max-h-96 space-y-3 overflow-y-auto rounded-lg border border-border/50 bg-muted/10 p-3">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                          m.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border/50 bg-card',
                        )}
                      >
                        {m.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1">
                            <ReactMarkdown>{m.content || '…'}</ReactMarkdown>
                          </div>
                        ) : (
                          m.content
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(input);
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Ask about allocation, fees, Roth vs pre-tax, sequence risk…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={chatting}
                  className="h-9"
                />
                <Button type="submit" size="sm" disabled={chatting || !input.trim()} className="gap-1">
                  {chatting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Ask
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <DisclaimerBlock />
    </div>
  );
}

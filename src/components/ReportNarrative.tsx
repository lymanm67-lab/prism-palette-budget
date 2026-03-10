import { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Insight {
  icon: 'up' | 'down' | 'warn' | 'ok';
  text: string;
  detail?: string;
}

interface ReportNarrativeProps {
  tab: string;
  spendingData?: { name: string; value: number; color: string }[];
  budgetVsActual?: { name: string; budget: number; actual: number }[];
  monthlyCashflow?: { month: string; income: number; expenses: number; savings: number }[];
  savingsRate?: { month: string; rate: number; savings: number }[];
  netWorthTrend?: { month: string; netWorth: number }[];
  topMerchants?: { name: string; total: number; count: number }[];
  dateLabel: string;
}

const ICON_MAP = {
  up: <TrendingUp className="h-4 w-4 text-accent shrink-0" />,
  down: <TrendingDown className="h-4 w-4 text-prism-rose shrink-0" />,
  warn: <AlertTriangle className="h-4 w-4 text-prism-orange shrink-0" />,
  ok: <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />,
};

export default function ReportNarrative({
  tab, spendingData, budgetVsActual, monthlyCashflow, savingsRate, netWorthTrend, topMerchants, dateLabel,
}: ReportNarrativeProps) {
  const { formatCurrency } = useCurrency();
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAi, setShowAi] = useState(false);

  // ====== RULE-BASED INSIGHTS ======
  const insights = useMemo<Insight[]>(() => {
    const result: Insight[] = [];

    if (tab === 'spending' && spendingData?.length) {
      const total = spendingData.reduce((s, d) => s + d.value, 0);
      const top = spendingData[0];
      const topPct = total > 0 ? Math.round((top.value / total) * 100) : 0;

      result.push({
        icon: 'ok',
        text: `Total spending: ${formatCurrency(total)} across ${spendingData.length} categories.`,
      });

      if (topPct > 40) {
        result.push({
          icon: 'warn',
          text: `**${top.name}** dominates at ${topPct}% of spending (${formatCurrency(top.value)}).`,
          detail: 'Consider reviewing this category for potential savings opportunities.',
        });
      } else {
        result.push({
          icon: 'ok',
          text: `Spending is well-distributed. Top category **${top.name}** is ${topPct}% (${formatCurrency(top.value)}).`,
        });
      }

      if (spendingData.length >= 3) {
        const bottom = spendingData[spendingData.length - 1];
        const ratio = top.value / Math.max(bottom.value, 1);
        if (ratio > 20) {
          result.push({
            icon: 'down',
            text: `Big gap: **${top.name}** is ${Math.round(ratio)}x more than **${bottom.name}**.`,
          });
        }
      }
    }

    if (tab === 'budget' && budgetVsActual?.length) {
      const overBudget = budgetVsActual.filter(b => b.actual > b.budget && b.budget > 0);
      const underBudget = budgetVsActual.filter(b => b.budget > 0 && b.actual <= b.budget);
      const totalBudget = budgetVsActual.reduce((s, b) => s + b.budget, 0);
      const totalActual = budgetVsActual.reduce((s, b) => s + b.actual, 0);
      const overallPct = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0;

      result.push({
        icon: overallPct <= 100 ? 'ok' : 'warn',
        text: `Overall budget usage: **${overallPct}%** — ${formatCurrency(totalActual)} of ${formatCurrency(totalBudget)} budgeted.`,
      });

      if (overBudget.length > 0) {
        const worst = overBudget.sort((a, b) => (b.actual - b.budget) - (a.actual - a.budget))[0];
        const overAmt = worst.actual - worst.budget;
        result.push({
          icon: 'warn',
          text: `${overBudget.length} categor${overBudget.length === 1 ? 'y' : 'ies'} over budget. **${worst.name}** is over by ${formatCurrency(overAmt)}.`,
          detail: `Over-budget: ${overBudget.map(b => b.name).join(', ')}`,
        });
      }

      if (underBudget.length > 0) {
        const bestSaver = underBudget.sort((a, b) => (a.actual / Math.max(a.budget, 1)) - (b.actual / Math.max(b.budget, 1)))[0];
        const savedPct = bestSaver.budget > 0 ? Math.round((bestSaver.actual / bestSaver.budget) * 100) : 0;
        result.push({
          icon: 'up',
          text: `**${bestSaver.name}** is on track at only ${savedPct}% used — great discipline!`,
        });
      }
    }

    if (tab === 'cashflow' && monthlyCashflow?.length) {
      const latest = monthlyCashflow[monthlyCashflow.length - 1];
      const isPositive = latest.savings >= 0;

      result.push({
        icon: isPositive ? 'up' : 'down',
        text: `Latest month (${latest.month}): ${formatCurrency(latest.income)} income, ${formatCurrency(latest.expenses)} expenses → ${isPositive ? 'surplus' : 'deficit'} of ${formatCurrency(Math.abs(latest.savings))}.`,
      });

      if (monthlyCashflow.length >= 2) {
        const prev = monthlyCashflow[monthlyCashflow.length - 2];
        const expChange = latest.expenses - prev.expenses;
        if (Math.abs(expChange) > 50) {
          result.push({
            icon: expChange > 0 ? 'warn' : 'up',
            text: `Expenses ${expChange > 0 ? 'increased' : 'decreased'} by ${formatCurrency(Math.abs(expChange))} compared to ${prev.month}.`,
          });
        }
      }

      if (savingsRate?.length) {
        const avgRate = Math.round(savingsRate.reduce((s, r) => s + r.rate, 0) / savingsRate.length);
        result.push({
          icon: avgRate >= 20 ? 'ok' : avgRate >= 10 ? 'up' : 'warn',
          text: `Average savings rate: **${avgRate}%**. ${avgRate >= 20 ? 'Excellent — above the recommended 20%.' : avgRate >= 10 ? 'Good, but aim for 20%+.' : 'Below 10% — consider reducing discretionary spending.'}`,
        });
      }
    }

    if (tab === 'networth' && netWorthTrend?.length) {
      const latest = netWorthTrend[netWorthTrend.length - 1];
      result.push({
        icon: latest.netWorth >= 0 ? 'ok' : 'warn',
        text: `Current net worth: **${formatCurrency(latest.netWorth)}**.`,
      });

      if (netWorthTrend.length >= 2) {
        const first = netWorthTrend[0];
        const change = latest.netWorth - first.netWorth;
        result.push({
          icon: change >= 0 ? 'up' : 'down',
          text: `Net worth has ${change >= 0 ? 'grown' : 'decreased'} by ${formatCurrency(Math.abs(change))} over the period.`,
        });
      }
    }

    if (tab === 'merchants' && topMerchants?.length) {
      const totalMerchant = topMerchants.reduce((s, m) => s + m.total, 0);
      const top3 = topMerchants.slice(0, 3);
      const top3Total = top3.reduce((s, m) => s + m.total, 0);
      const top3Pct = totalMerchant > 0 ? Math.round((top3Total / totalMerchant) * 100) : 0;

      result.push({
        icon: 'ok',
        text: `Top 3 merchants (**${top3.map(m => m.name).join(', ')}**) account for ${top3Pct}% of tracked spending.`,
      });

      const highFreq = topMerchants.filter(m => m.count >= 10);
      if (highFreq.length > 0) {
        result.push({
          icon: 'warn',
          text: `Frequent visits: **${highFreq[0].name}** has ${highFreq[0].count} transactions. Small purchases add up!`,
        });
      }
    }

    if (tab === 'trends' && monthlyCashflow?.length && monthlyCashflow.length >= 2) {
      const expArr = monthlyCashflow.map(m => m.expenses);
      const avgExp = expArr.reduce((s, e) => s + e, 0) / expArr.length;
      const trend = expArr[expArr.length - 1] - expArr[0];
      result.push({
        icon: trend > 0 ? 'warn' : 'up',
        text: `Spending trend is ${trend > 0 ? 'rising' : 'falling'}. Average monthly expenses: ${formatCurrency(avgExp)}.`,
      });
    }

    return result;
  }, [tab, spendingData, budgetVsActual, monthlyCashflow, savingsRate, netWorthTrend, topMerchants, formatCurrency]);

  // ====== AI ANALYSIS ======
  const handleAiAnalysis = useCallback(async () => {
    setAiLoading(true);
    setShowAi(true);
    setAiAnalysis('');

    try {
      const summaryData: Record<string, unknown> = { tab, dateLabel };

      if (tab === 'spending' && spendingData) {
        summaryData.categories = spendingData.slice(0, 10).map(s => ({ name: s.name, amount: s.value }));
        summaryData.total = spendingData.reduce((s, d) => s + d.value, 0);
      }
      if (tab === 'budget' && budgetVsActual) {
        summaryData.budgets = budgetVsActual.map(b => ({ name: b.name, budget: b.budget, actual: b.actual }));
      }
      if ((tab === 'cashflow' || tab === 'trends') && monthlyCashflow) {
        summaryData.cashflow = monthlyCashflow;
        if (savingsRate) summaryData.savingsRate = savingsRate;
      }
      if (tab === 'networth' && netWorthTrend) {
        summaryData.netWorth = netWorthTrend;
      }
      if (tab === 'merchants' && topMerchants) {
        summaryData.merchants = topMerchants;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/report-narrative`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: summaryData }),
      });

      if (!resp.ok) {
        if (resp.status === 429) { toast.error('Rate limit reached. Try again shortly.'); setAiLoading(false); return; }
        if (resp.status === 402) { toast.error('AI usage limit reached.'); setAiLoading(false); return; }
        throw new Error('AI error');
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ') || line.trim() === '') continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { full += content; setAiAnalysis(full); }
          } catch { /* partial */ }
        }
      }
    } catch (e) {
      console.error('AI analysis error:', e);
      toast.error('Failed to generate AI analysis.');
    } finally {
      setAiLoading(false);
    }
  }, [tab, dateLabel, spendingData, budgetVsActual, monthlyCashflow, savingsRate, netWorthTrend, topMerchants]);

  if (insights.length === 0) return null;

  return (
    <Card className="mt-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="pt-5 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Key Insights
          </h3>
          {!showAi && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={handleAiAnalysis} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Get AI Analysis
            </Button>
          )}
        </div>

        {/* Rule-based insights */}
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm">
              {ICON_MAP[insight.icon]}
              <div>
                <span className="text-foreground leading-relaxed">
                  <ReactMarkdown components={{ p: ({ children }) => <>{children}</>, strong: ({ children }) => <strong className="font-semibold">{children}</strong> }}>
                    {insight.text}
                  </ReactMarkdown>
                </span>
                {insight.detail && (
                  <p className="text-xs text-muted-foreground mt-0.5">{insight.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* AI Analysis */}
        <AnimatePresence>
          {showAi && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-border/50 pt-3 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Deep Analysis
                  </h4>
                  <button onClick={() => setShowAi(false)} className="text-muted-foreground hover:text-foreground">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                </div>
                {aiAnalysis ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                    <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                  </div>
                ) : aiLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing your financial data...
                  </div>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

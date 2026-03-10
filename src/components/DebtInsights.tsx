import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import ReactMarkdown from 'react-markdown';

interface Debt {
  id: string;
  name: string;
  balance: number;
  minimum_payment: number;
  interest_rate: number;
}

interface DebtInsightsProps {
  debts: Debt[];
  extraPayment: number;
  strategy: string;
  payoffMonths?: number;
  totalInterest?: number;
}

interface Insight {
  icon: 'up' | 'down' | 'warn' | 'ok';
  text: string;
  detail?: string;
}

const ICON_MAP = {
  up: <TrendingUp className="h-4 w-4 text-accent shrink-0" />,
  down: <TrendingDown className="h-4 w-4 text-prism-rose shrink-0" />,
  warn: <AlertTriangle className="h-4 w-4 text-prism-orange shrink-0" />,
  ok: <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />,
};

export default function DebtInsights({ debts, extraPayment, strategy, payoffMonths, totalInterest }: DebtInsightsProps) {
  const { formatCurrency } = useCurrency();

  const insights = useMemo<Insight[]>(() => {
    if (debts.length === 0) return [];
    const result: Insight[] = [];

    const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
    const totalMinPayments = debts.reduce((s, d) => s + d.minimum_payment, 0);
    const weightedRate = totalDebt > 0
      ? debts.reduce((s, d) => s + d.interest_rate * (d.balance / totalDebt), 0)
      : 0;

    // Debt summary
    result.push({
      icon: 'ok',
      text: `Total debt: **${formatCurrency(totalDebt)}** across ${debts.length} account${debts.length !== 1 ? 's' : ''}. Weighted average APR: **${weightedRate.toFixed(1)}%**.`,
    });

    // High interest warning
    const highInterest = debts.filter(d => d.interest_rate >= 20);
    if (highInterest.length > 0) {
      const worst = highInterest.sort((a, b) => b.interest_rate - a.interest_rate)[0];
      result.push({
        icon: 'warn',
        text: `**${worst.name}** has a ${worst.interest_rate}% APR — prioritize this to minimize interest costs.`,
        detail: highInterest.length > 1 ? `${highInterest.length} debts above 20% APR: ${highInterest.map(d => d.name).join(', ')}` : undefined,
      });
    }

    // Payoff timeline
    if (payoffMonths) {
      const years = Math.floor(payoffMonths / 12);
      const months = payoffMonths % 12;
      const timeStr = years > 0 ? `${years} year${years !== 1 ? 's' : ''} ${months > 0 ? `${months} month${months !== 1 ? 's' : ''}` : ''}` : `${months} month${months !== 1 ? 's' : ''}`;
      result.push({
        icon: payoffMonths <= 24 ? 'up' : payoffMonths <= 60 ? 'ok' : 'warn',
        text: `Projected debt-free in **${timeStr}** using the **${strategy}** strategy.`,
      });
    }

    // Total interest cost
    if (totalInterest !== undefined && totalInterest > 0) {
      const interestPct = totalDebt > 0 ? Math.round((totalInterest / totalDebt) * 100) : 0;
      result.push({
        icon: interestPct > 30 ? 'warn' : 'down',
        text: `You'll pay **${formatCurrency(totalInterest)}** in interest (${interestPct}% of principal). ${extraPayment > 0 ? `Your **${formatCurrency(extraPayment)}/mo** extra payment is saving you significantly.` : 'Adding extra payments would reduce this.'}`,
      });
    }

    // Extra payment impact
    if (extraPayment === 0) {
      result.push({
        icon: 'warn',
        text: `No extra payment set. Even **${formatCurrency(50)}/mo** extra can shave months off your payoff timeline.`,
      });
    } else if (extraPayment >= totalMinPayments) {
      result.push({
        icon: 'up',
        text: `Great effort! Your extra payment of **${formatCurrency(extraPayment)}/mo** exceeds your minimum payments — you're aggressively attacking debt.`,
      });
    }

    // Largest debt
    if (debts.length >= 2) {
      const sorted = [...debts].sort((a, b) => b.balance - a.balance);
      const largest = sorted[0];
      const largestPct = totalDebt > 0 ? Math.round((largest.balance / totalDebt) * 100) : 0;
      if (largestPct > 70) {
        result.push({
          icon: 'ok',
          text: `**${largest.name}** is ${largestPct}% of your total debt (${formatCurrency(largest.balance)}).`,
        });
      }
    }

    return result;
  }, [debts, extraPayment, strategy, payoffMonths, totalInterest, formatCurrency]);

  if (insights.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="pt-5 pb-4 space-y-3">
        <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Key Insights
        </h3>
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
      </CardContent>
    </Card>
  );
}

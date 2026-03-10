import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import ReactMarkdown from 'react-markdown';

interface Account {
  id: string;
  name: string;
  balance: number;
  account_type: string;
  institution?: string | null;
}

interface InvestmentInsightsProps {
  accounts: Account[];
  totalBalance: number;
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

export default function InvestmentInsights({ accounts, totalBalance }: InvestmentInsightsProps) {
  const { formatCurrency } = useCurrency();

  const insights = useMemo<Insight[]>(() => {
    if (accounts.length === 0) return [];
    const result: Insight[] = [];

    // Portfolio summary
    const investmentAccounts = accounts.filter(a => a.account_type === 'investment');
    const savingsAccounts = accounts.filter(a => a.account_type === 'savings');
    const investmentTotal = investmentAccounts.reduce((s, a) => s + Number(a.balance), 0);
    const savingsTotal = savingsAccounts.reduce((s, a) => s + Number(a.balance), 0);

    result.push({
      icon: 'ok',
      text: `Portfolio total: **${formatCurrency(totalBalance)}** across ${accounts.length} account${accounts.length !== 1 ? 's' : ''}.`,
    });

    // Asset type breakdown
    if (investmentAccounts.length > 0 && savingsAccounts.length > 0) {
      const investPct = totalBalance > 0 ? Math.round((investmentTotal / totalBalance) * 100) : 0;
      result.push({
        icon: 'ok',
        text: `**${investPct}%** in investments (${formatCurrency(investmentTotal)}) and **${100 - investPct}%** in savings (${formatCurrency(savingsTotal)}).`,
      });
    }

    // Concentration risk
    if (accounts.length >= 2) {
      const sorted = [...accounts].sort((a, b) => Number(b.balance) - Number(a.balance));
      const topAccount = sorted[0];
      const topPct = totalBalance > 0 ? Math.round((Number(topAccount.balance) / totalBalance) * 100) : 0;
      if (topPct > 80) {
        result.push({
          icon: 'warn',
          text: `**${topAccount.name}** holds ${topPct}% of your portfolio. Consider diversifying across more accounts.`,
        });
      } else if (topPct > 50) {
        result.push({
          icon: 'up',
          text: `Largest holding: **${topAccount.name}** at ${topPct}% (${formatCurrency(Number(topAccount.balance))}).`,
        });
      } else {
        result.push({
          icon: 'ok',
          text: `Well-diversified — no single account exceeds 50% of your portfolio.`,
        });
      }
    }

    // Emergency fund check (savings)
    if (savingsAccounts.length > 0) {
      if (savingsTotal < 1000) {
        result.push({
          icon: 'warn',
          text: `Savings balance is low at **${formatCurrency(savingsTotal)}**. Aim for 3-6 months of expenses as an emergency fund.`,
        });
      } else if (savingsTotal >= 10000) {
        result.push({
          icon: 'ok',
          text: `Healthy savings buffer of **${formatCurrency(savingsTotal)}**. Make sure excess cash is working for you in investments.`,
        });
      }
    }

    // Zero balance accounts
    const zeroAccounts = accounts.filter(a => Number(a.balance) <= 0);
    if (zeroAccounts.length > 0) {
      result.push({
        icon: 'down',
        text: `${zeroAccounts.length} account${zeroAccounts.length !== 1 ? 's have' : ' has'} a $0 balance — consider funding or removing ${zeroAccounts.length !== 1 ? 'them' : 'it'}.`,
      });
    }

    return result;
  }, [accounts, totalBalance, formatCurrency]);

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

import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAccounts } from '@/hooks/use-finance-data';
import { useCurrency } from '@/hooks/use-currency';
import { TrendingUp, TrendingDown, Scale, ArrowRight } from 'lucide-react';
import { useMemo } from 'react';

const LIABILITY_TYPES = new Set(['credit', 'loan']);

/**
 * Compact Net Worth summary — Assets − Liabilities from all accounts.
 * Same calc as the /net-worth page. Embed anywhere.
 */
export default function NetWorthSummaryCard({ compact = false }: { compact?: boolean }) {
  const { data: accounts, isLoading } = useAccounts();
  const { formatCurrency } = useCurrency();

  const { assets, liabilities, netWorth } = useMemo(() => {
    if (!accounts) return { assets: 0, liabilities: 0, netWorth: 0 };
    let a = 0, l = 0;
    for (const acc of accounts) {
      if (LIABILITY_TYPES.has(acc.account_type)) l += Math.abs(acc.balance);
      else a += acc.balance;
    }
    return { assets: a, liabilities: l, netWorth: a - l };
  }, [accounts]);

  if (isLoading) return null;

  return (
    <Card className="bg-gradient-to-br from-prism-teal/10 via-transparent to-prism-amber/5 border-prism-teal/30">
      <CardContent className={compact ? 'p-4' : 'p-5'}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-prism-teal/15">
              <Scale className="h-5 w-5 text-prism-teal" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Net Worth</p>
              <p className={`font-bold ${netWorth >= 0 ? 'text-foreground' : 'text-destructive'} ${compact ? 'text-2xl' : 'text-3xl'}`}>
                {formatCurrency(netWorth)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-prism-teal" /> Assets
              </div>
              <p className="text-sm font-semibold text-prism-teal">{formatCurrency(assets)}</p>
            </div>
            <div className="text-xl text-muted-foreground">−</div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingDown className="h-3 w-3 text-destructive" /> Liabilities
              </div>
              <p className="text-sm font-semibold text-destructive">{formatCurrency(liabilities)}</p>
            </div>
          </div>

          <Button asChild size="sm" variant="outline">
            <Link to="/net-worth">
              Details <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Auto-calculated from all accounts (checking, savings, investments, real estate, etc.) minus credit cards and loans.
          Edit balances in <Link to="/accounts" className="underline hover:text-foreground">Accounts</Link>.
        </p>
      </CardContent>
    </Card>
  );
}

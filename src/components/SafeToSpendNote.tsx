import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useSafeToSpend, type StsScope } from '@/hooks/use-safe-to-spend';
import { useCurrency } from '@/hooks/use-currency';

interface SafeToSpendNoteProps {
  /** Which money this page is about. */
  scope?: StsScope;
  /** What the big number(s) on this page mean, in plain words. */
  pageNumberMeans: string;
}

/**
 * One consistent reminder of the single spending number, so planning pages
 * (Freed Cash, 50% plan, Zero-Based) never read like a spending allowance.
 */
export function SafeToSpendNote({ scope = 'combined', pageNumberMeans }: SafeToSpendNoteProps) {
  const sts = useSafeToSpend(scope);
  const viewLabel = scope === 'business' ? 'Business' : scope === 'personal' ? 'Personal' : 'Combined';

  return (
    <div className="flex items-start gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3">
      <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      <div className="space-y-1 text-xs">
        <p className="font-medium text-foreground">
          Safe to Spend right now:{' '}
          <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
            {sts.isLoading ? '—' : formatCurrency(sts.monthly)}
          </span>{' '}
          <span className="font-normal text-muted-foreground">({viewLabel} view, this month)</span>
        </p>
        <p className="text-muted-foreground leading-snug">
          {pageNumberMeans} It is not spending money. Planned surplus − savings − investing − {sts.bufferPercent}% buffer
          = Safe to Spend, the one number to spend against on the{' '}
          <Link to="/dashboard" className="underline">Dashboard</Link> and{' '}
          <Link to="/budgets" className="underline">Budgets</Link>.
        </p>
      </div>
    </div>
  );
}

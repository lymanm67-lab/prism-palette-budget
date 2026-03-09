import { AlertTriangle, X, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSpendingAnomalies } from '@/hooks/use-spending-anomalies';
import { useCurrency } from '@/hooks/use-currency';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SpendingAnomalyAlert() {
  const anomalies = useSpendingAnomalies(0.5); // 50% threshold
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleAnomalies = anomalies.filter(a => !dismissedIds.has(a.transactionId));
  
  if (visibleAnomalies.length === 0) return null;

  const topAnomaly = visibleAnomalies[0];

  const dismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  return (
    <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertTitle className="flex items-center justify-between">
        <span>Unusual Spending Detected</span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 -mr-2 -mt-1 hover:bg-amber-500/20"
          onClick={() => dismiss(topAnomaly.transactionId)}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p>
          Your spending at <strong className="capitalize">{topAnomaly.merchant}</strong> is{' '}
          <strong>{Math.round(topAnomaly.percentageIncrease * 100)}% higher</strong> than your 3-month average
          ({formatCurrency(topAnomaly.currentAmount)} vs {formatCurrency(topAnomaly.averageAmount)}).
        </p>
        {visibleAnomalies.length > 1 && (
          <p className="text-sm mt-1 opacity-80">
            +{visibleAnomalies.length - 1} more spending alerts
          </p>
        )}
        <Button
          variant="link"
          size="sm"
          className="px-0 mt-1 h-auto text-amber-900 dark:text-amber-100"
          onClick={() => navigate(`/transactions?search=${encodeURIComponent(topAnomaly.merchant)}`)}
        >
          View transactions <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}

import { useTrialCountdown } from '@/hooks/use-trial-countdown';
import { Button } from '@/components/ui/button';
import { Clock, Sparkles, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TrialCountdownBanner() {
  const { daysRemaining, showTrialBanner, trialExpired } = useTrialCountdown();
  const navigate = useNavigate();

  if (!showTrialBanner) return null;

  const urgent = daysRemaining <= 3;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium ${
        trialExpired
          ? 'bg-destructive/10 text-destructive border-b border-destructive/20'
          : urgent
          ? 'bg-prism-orange/10 text-prism-orange border-b border-prism-orange/20'
          : 'bg-prism-teal/10 text-prism-teal border-b border-prism-teal/20'
      }`}
    >
      <div className="flex items-center gap-2">
        {trialExpired ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <Clock className="h-4 w-4" />
        )}
        <span>
          {trialExpired
            ? 'Your free trial has ended.'
            : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left in your free trial.`}
        </span>
      </div>
      <Button
        size="sm"
        variant={trialExpired ? 'destructive' : 'default'}
        className="gap-1.5 h-7 text-xs"
        onClick={() => navigate('/settings')}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {trialExpired ? 'Upgrade Now' : 'Choose a Plan'}
      </Button>
    </div>
  );
}

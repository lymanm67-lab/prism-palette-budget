import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Pause, ShoppingCart, ArrowRight } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';

interface Props {
  open: boolean;
  onClose: () => void;
  overageAmount: number;
  limitType: 'daily' | 'weekly';
  onContinue: () => void;
  onDelay: () => void;
}

export function GuardrailInterventionModal({ open, onClose, overageAmount, limitType, onContinue, onDelay }: Props) {
  const { formatCurrency } = useCurrency();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2 text-prism-orange">
            <AlertTriangle className="h-5 w-5" />
            Spending Limit Reached
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="rounded-xl bg-prism-orange/10 border border-prism-orange/20 p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">
              You're about to exceed your {limitType} budget by
            </p>
            <p className="font-display text-3xl font-bold text-prism-orange">
              {formatCurrency(overageAmount)}
            </p>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Take a moment to consider — is this purchase necessary right now?
          </p>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => { onDelay(); onClose(); }}
            >
              <Pause className="h-5 w-5 text-prism-teal" />
              <div className="text-left">
                <p className="text-sm font-medium">Delay Purchase</p>
                <p className="text-[10px] text-muted-foreground">Sleep on it — revisit tomorrow</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => { onContinue(); onClose(); }}
            >
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <p className="text-sm font-medium">Continue Anyway</p>
                <p className="text-[10px] text-muted-foreground">I understand this exceeds my limit</p>
              </div>
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center italic">
            "Most people don't fail financially because they lack information — they fail in the moment of decision."
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

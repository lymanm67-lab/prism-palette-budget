import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PiggyBank, CreditCard, Wallet, Banknote } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  merchant: string;
  amount: number;
  formatCurrency: (n: number) => string;
  onAllocate: (destination: string) => void;
}

const OPTIONS = [
  { key: 'savings_goal', label: 'Add to savings goal', icon: PiggyBank, color: 'text-prism-teal' },
  { key: 'debt_payoff', label: 'Apply to debt payoff', icon: CreditCard, color: 'text-prism-violet' },
  { key: 'future_expenses', label: 'Allocate to future expenses', icon: Wallet, color: 'text-prism-sky' },
  { key: 'extra_cash', label: 'Keep as extra cash flow', icon: Banknote, color: 'text-prism-orange' },
];

export function SavingsReallocationDialog({ open, onClose, merchant, amount, formatCurrency, onAllocate }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            🎉 You freed up {formatCurrency(amount)}/mo!
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            By canceling <span className="font-semibold text-foreground">{merchant}</span>, you just freed up {formatCurrency(amount)} per month.
            What would you like to do with it?
          </p>
          <div className="space-y-2">
            {OPTIONS.map(opt => (
              <Button
                key={opt.key}
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={() => { onAllocate(opt.key); onClose(); }}
              >
                <opt.icon className={`h-5 w-5 ${opt.color}`} />
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

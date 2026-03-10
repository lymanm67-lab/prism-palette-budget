import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Building2, Shield, ArrowRight, ExternalLink } from 'lucide-react';
import SnapTradeConnectButton from '@/components/SnapTradeConnectButton';

interface InvestmentConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const POPULAR_BROKERS = [
  { name: 'Fidelity', broker: 'FIDELITY', popular: true },
  { name: 'Charles Schwab', broker: 'SCHWAB', popular: true },
  { name: 'Vanguard', broker: 'VANGUARD', popular: true },
  { name: 'TD Ameritrade', broker: 'TD_AMERITRADE', popular: false },
  { name: 'E*TRADE', broker: 'ETRADE', popular: false },
  { name: 'Robinhood', broker: 'ROBINHOOD', popular: false },
];

const InvestmentConnectionModal = ({ open, onOpenChange }: InvestmentConnectionModalProps) => {
  const [step, setStep] = useState<'choose' | 'connecting'>('choose');

  const handleClose = () => {
    onOpenChange(false);
    setStep('choose');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            Connect Investment Account
          </DialogTitle>
          <DialogDescription>
            Link your brokerage to automatically sync holdings, balances, and performance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Popular Brokers */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Popular Brokerages</p>
            <div className="grid grid-cols-2 gap-2">
              {POPULAR_BROKERS.filter(b => b.popular).map(broker => (
                <div key={broker.broker} className="relative">
                  <SnapTradeConnectButton
                    broker={broker.broker}
                    label={broker.name}
                    variant="outline"
                    className="w-full justify-start h-11 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* All Brokerages */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">More Options</p>
            <div className="grid grid-cols-2 gap-2">
              {POPULAR_BROKERS.filter(b => !b.popular).map(broker => (
                <div key={broker.broker}>
                  <SnapTradeConnectButton
                    broker={broker.broker}
                    label={broker.name}
                    variant="outline"
                    className="w-full justify-start h-10 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Browse All */}
          <div className="border-t pt-3">
            <SnapTradeConnectButton
              label="Browse All Supported Brokerages"
              variant="default"
              className="w-full"
            />
          </div>

          {/* Security Info */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Shield className="h-3.5 w-3.5 text-primary" />
              Security & Privacy
            </div>
            <ul className="text-[11px] text-muted-foreground space-y-1">
              <li className="flex items-start gap-1.5">
                <span className="text-primary mt-0.5">•</span>
                Your credentials are <strong>never stored</strong> in this app
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary mt-0.5">•</span>
                Investment connections are <strong>read-only</strong> — we cannot place trades
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary mt-0.5">•</span>
                You can revoke access at any time from the Accounts page
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvestmentConnectionModal;

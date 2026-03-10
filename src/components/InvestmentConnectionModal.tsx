import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Landmark, Shield } from 'lucide-react';
import SnapTradeConnectButton from '@/components/SnapTradeConnectButton';
import PlaidLinkButton from '@/components/PlaidLinkButton';

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
  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            Connect Financial Account
          </DialogTitle>
          <DialogDescription>
            Link your bank or brokerage to automatically sync accounts, transactions, and holdings.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="bank" className="pt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bank" className="gap-1.5 text-xs sm:text-sm">
              <Landmark className="h-3.5 w-3.5" /> Bank / Credit Card
            </TabsTrigger>
            <TabsTrigger value="investment" className="gap-1.5 text-xs sm:text-sm">
              <TrendingUp className="h-3.5 w-3.5" /> Investments
            </TabsTrigger>
          </TabsList>

          {/* ── Plaid Tab ── */}
          <TabsContent value="bank" className="space-y-4 pt-2">
            <div className="rounded-lg border border-border/60 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Connect via Plaid</p>
                  <p className="text-xs text-muted-foreground">Checking, savings, and credit card accounts</p>
                </div>
              </div>
              <PlaidLinkButton />
            </div>

            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-[11px] text-muted-foreground">
                Plaid securely connects to <strong>11,000+</strong> financial institutions. Your login credentials are never stored in this app.
              </p>
            </div>
          </TabsContent>

          {/* ── SnapTrade Tab ── */}
          <TabsContent value="investment" className="space-y-4 pt-2">
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

            <div className="border-t pt-3">
              <SnapTradeConnectButton
                label="Browse All Supported Brokerages"
                variant="default"
                className="w-full"
              />
            </div>
          </TabsContent>
        </Tabs>

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
              All connections are <strong>read-only</strong> — we cannot move money or place trades
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-primary mt-0.5">•</span>
              You can revoke access at any time from the Accounts page
            </li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvestmentConnectionModal;

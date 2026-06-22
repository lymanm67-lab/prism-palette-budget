import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrency } from '@/hooks/use-currency';
import { useAccounts } from '@/hooks/use-finance-data';
import { format, parseISO } from 'date-fns';
import {
  DollarSign, Calendar, AlertTriangle, X, Shield, ChevronRight, Landmark,
} from 'lucide-react';
import { CancellationWorkflow } from './CancellationWorkflow';

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string }> = {
  easy: { label: 'Easy', color: 'bg-prism-teal/10 text-prism-teal border-prism-teal/30' },
  moderate: { label: 'Moderate', color: 'bg-prism-orange/10 text-prism-orange border-prism-orange/30' },
  hard: { label: 'Hard', color: 'bg-prism-rose/10 text-prism-rose border-prism-rose/30' },
};

interface Props {
  subscription: any;
  onClose: () => void;
  onUpdate: (id: string, updates: any) => Promise<void>;
  formatCurrency: (n: number) => string;
}

function getMonthlyAmount(sub: any): number {
  const amt = sub.average_amount || 0;
  if (sub.frequency === 'weekly') return amt * 4.33;
  if (sub.frequency === 'biweekly') return amt * 2.17;
  if (sub.frequency === 'quarterly') return amt / 3;
  if (sub.frequency === 'yearly') return amt / 12;
  return amt;
}

export function SubscriptionActionPanel({ subscription: sub, onClose, onUpdate, formatCurrency }: Props) {
  const [showWorkflow, setShowWorkflow] = useState(false);
  const monthly = getMonthlyAmount(sub);
  const yearly = monthly * 12;
  const diff = DIFFICULTY_CONFIG[sub.cancellation_difficulty] || DIFFICULTY_CONFIG.easy;

  if (showWorkflow) {
    return (
      <CancellationWorkflow
        subscription={sub}
        onClose={() => setShowWorkflow(false)}
        onUpdate={onUpdate}
        formatCurrency={formatCurrency}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="w-full"
    >
      <Card className="border-prism-violet/30 bg-gradient-to-br from-prism-violet/5 to-transparent">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">Take Action</CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Subscription Info */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center text-sm font-bold bg-prism-violet/10 text-prism-violet">
              {(sub.merchant || '?').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{sub.merchant}</p>
              <p className="text-xs text-muted-foreground capitalize">{sub.frequency} billing</p>
            </div>
          </div>

          <Separator />

          {/* Cost Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Monthly Cost</p>
              <p className="font-display text-lg font-bold">{formatCurrency(monthly)}</p>
            </div>
            <div className="rounded-lg border border-border/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Annual Cost</p>
              <p className="font-display text-lg font-bold text-prism-rose">{formatCurrency(yearly)}</p>
            </div>
          </div>

          {/* Meta */}
          <div className="space-y-2 text-sm">
            {sub.next_expected_date && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Next Charge
                </span>
                <span className="font-medium">{format(parseISO(sub.next_expected_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Cancellation Difficulty
              </span>
              <Badge variant="outline" className={`text-xs ${diff.color}`}>{diff.label}</Badge>
            </div>
            {sub.cancellation_notes && (
              <p className="text-xs text-muted-foreground italic pl-5">{sub.cancellation_notes}</p>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <Button
            className="w-full"
            onClick={() => setShowWorkflow(true)}
          >
            <Shield className="h-4 w-4 mr-2" />
            Help Me Cancel
            <ChevronRight className="h-4 w-4 ml-auto" />
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 text-xs"
              onClick={() => onUpdate(sub.id, { cancel_reminder_date: null, user_usage_override: 'still_using' })}
            >
              Keep It
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-xs"
              onClick={() => onUpdate(sub.id, { user_usage_override: 'no_longer_using' })}
            >
              Not Using
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Cancellation depends on the service provider's policies
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

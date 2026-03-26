import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/hooks/use-currency';
import { useSubscriptions } from '@/hooks/use-subscriptions';
import { useSpendGuardrails } from '@/hooks/use-spend-guardrails';
import { useSafeToSpend } from '@/hooks/use-safe-to-spend';
import { Sparkles, TrendingUp, Ban, ShieldCheck, PiggyBank } from 'lucide-react';


export function SavingsImpactCounter() {
  const { formatCurrency } = useCurrency();
  const { data: subscriptions } = useSubscriptions();
  const guardrails = useSpendGuardrails();
  const sts = useSafeToSpend();

  const { totalSaved, breakdown } = useMemo(() => {
    // Cancelled subscriptions savings (monthly extrapolated)
    const cancelledSubs = (subscriptions || [])
      .filter((s: any) => s.is_cancelled)
      .reduce((sum: number, s: any) => sum + Math.abs(s.average_amount || 0), 0);

    // Guardrail savings (budget staying power)
    const guardrailSavings = guardrails.isEnabled && guardrails.dailyLimit
      ? Math.max(0, (guardrails.daysWithinBudget || 0) * (guardrails.dailyLimit * 0.1))
      : 0;

    // Buffer savings from STS
    const bufferSavings = sts.monthly > 0 ? sts.monthly * (sts.bufferPercent / 100) : 0;

    const items = [
      { label: 'Cancelled subscriptions', value: cancelledSubs, icon: Ban, color: 'text-prism-rose' },
      { label: 'Safety buffer reserved', value: bufferSavings, icon: ShieldCheck, color: 'text-prism-sky' },
      { label: 'Guardrail discipline', value: guardrailSavings, icon: PiggyBank, color: 'text-prism-teal' },
    ].filter(i => i.value > 0);

    return {
      totalSaved: cancelledSubs + guardrailSavings + bufferSavings,
      breakdown: items,
    };
  }, [subscriptions, guardrails, sts]);

  if (totalSaved <= 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-prism-teal/20 bg-gradient-to-r from-prism-teal/5 to-prism-lime/5 overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-prism-teal to-prism-lime flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold">Money Saved with Prism</p>
                <Badge variant="outline" className="text-[9px] border-prism-teal/30 text-prism-teal bg-prism-teal/10 gap-1">
                  <TrendingUp className="h-2.5 w-2.5" /> This Month
                </Badge>
              </div>
              <p className="font-display text-2xl font-extrabold prism-gradient-text">
                {formatCurrency(totalSaved)}
              </p>
            </div>
          </div>

          {breakdown.length > 0 && (
            <div className="grid gap-1.5">
              {breakdown.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-3 w-3 ${item.color}`} />
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="font-semibold tabular-nums">{formatCurrency(item.value)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

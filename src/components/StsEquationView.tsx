import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSafeToSpend, type StsScope } from '@/hooks/use-safe-to-spend';
import { useCurrency } from '@/hooks/use-currency';
import { MODE_CONFIG } from '@/hooks/use-financial-mode';
import { Calculator, ChevronDown, ChevronUp, Minus, X, Equal, Shield } from 'lucide-react';

export function StsEquationView({ scope = 'combined' }: { scope?: StsScope }) {
  const sts = useSafeToSpend(scope);
  const { formatCurrency } = useCurrency();
  const [expanded, setExpanded] = useState(false);

  if (sts.isLoading) return null;

  const config = MODE_CONFIG[sts.mode];
  const baseMonthlySafe = sts.monthlyIncome - sts.effectiveExpenses - sts.deploymentReserve;
  const bufferAmount = Math.max(0, baseMonthlySafe * (sts.bufferPercent / 100));

  const steps = [
    { label: 'Monthly Income', value: sts.monthlyIncome, color: 'text-prism-teal', prefix: '' },
    { label: 'Budget Expenses', value: sts.effectiveExpenses, color: 'text-prism-rose', prefix: '−' },
    { label: `Investing + Savings reserve (${sts.investingPct + sts.savingsPct}%)`, value: sts.deploymentReserve, color: 'text-prism-lime', prefix: '−' },
    { label: `Safety Buffer (${sts.bufferPercent}%)`, value: bufferAmount, color: 'text-prism-sky', prefix: '−' },
  ];


  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-prism-violet to-prism-sky flex items-center justify-center">
              <Calculator className="h-4 w-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">How your Safe-to-Spend is calculated</p>
              <p className="text-[10px] text-muted-foreground">Income − Expenses × (1 − Buffer%)</p>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-1 space-y-2.5 border-t border-border/30">
                {steps.map((step, i) => (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {i > 0 && (
                        <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                          <Minus className="h-3 w-3 text-muted-foreground" />
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">{step.label}</span>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${step.color}`}>
                      {step.prefix}{formatCurrency(step.value)}
                    </span>
                  </motion.div>
                ))}

                <div className="border-t border-dashed border-border/50 pt-2.5 mt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <Equal className="h-3 w-3 text-primary" />
                      </span>
                      <span className="text-sm font-bold">Safe to Spend</span>
                      <Badge variant="outline" className="text-[9px] gap-1">
                        <Shield className="h-2.5 w-2.5" />
                        {config.label}
                      </Badge>
                    </div>
                    <span className="text-base font-bold prism-gradient-text tabular-nums">
                      {formatCurrency(sts.monthly)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

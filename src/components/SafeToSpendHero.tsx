import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSafeToSpend } from '@/hooks/use-safe-to-spend';
import { useCurrency } from '@/hooks/use-currency';
import { MODE_CONFIG } from '@/hooks/use-financial-mode';
import { Shield, Zap, Leaf, DollarSign, Calendar, CalendarDays } from 'lucide-react';
import AnimatedNumber from '@/components/AnimatedNumber';

const modeIcons = {
  guardrail: Shield,
  balanced: Zap,
  greenlight: Leaf,
};

export function SafeToSpendHero() {
  const sts = useSafeToSpend();
  const { formatCurrency } = useCurrency();

  if (sts.isLoading) {
    return (
      <Card className="prism-card-shine border-border/50">
        <CardContent className="p-6">
          <div className="h-32 bg-muted animate-pulse rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const config = MODE_CONFIG[sts.mode];
  const ModeIcon = modeIcons[sts.mode];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="relative overflow-hidden border-border/50">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-prism-teal/8 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        
        <CardContent className="relative p-6 sm:p-8">
          {/* Mode badge */}
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline" className={`gap-1.5 text-xs border-${config.color}/30 bg-${config.color}/10 text-${config.color}`}>
              <ModeIcon className="h-3 w-3" />
              {config.label} Mode
            </Badge>
            <span className="text-xs text-muted-foreground">{config.description}</span>
          </div>

          {/* Main safe-to-spend number */}
          <div className="text-center mb-6">
            <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">
              Combined Safe to Spend
            </p>
            <div className="font-display text-5xl sm:text-6xl font-extrabold tracking-tight">
              <span className="prism-gradient-text">
                {formatCurrency(sts.monthly)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
              This is what you can spend without disrupting your financial stability
            </p>
          </div>

          {/* Daily / Weekly / Monthly breakdown */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            <TimeframePill
              icon={<DollarSign className="h-4 w-4" />}
              label="Daily"
              amount={formatCurrency(sts.daily)}
              gradient="from-prism-teal to-prism-lime"
            />
            <TimeframePill
              icon={<Calendar className="h-4 w-4" />}
              label="Weekly"
              amount={formatCurrency(sts.weekly)}
              gradient="from-prism-sky to-prism-teal"
            />
            <TimeframePill
              icon={<CalendarDays className="h-4 w-4" />}
              label="Monthly"
              amount={formatCurrency(sts.monthly)}
              gradient="from-prism-violet to-prism-sky"
            />
          </div>

          {/* Supporting stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-border/30">
            <MiniStat label="Available Cash" value={formatCurrency(sts.totalAvailableCash)} />
            <MiniStat label="Monthly Income" value={formatCurrency(sts.monthlyIncome)} />
            <MiniStat label="Obligations" value={formatCurrency(sts.monthlyObligations)} />
            <MiniStat label="Subscriptions" value={formatCurrency(sts.monthlySubscriptions)} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TimeframePill({ icon, label, amount, gradient }: { icon: React.ReactNode; label: string; amount: string; gradient: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card/80 border border-border/30">
      <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
        {icon}
      </div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      <span className="font-display text-lg sm:text-xl font-bold">{amount}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-sm font-semibold mt-0.5">{value}</p>
    </div>
  );
}

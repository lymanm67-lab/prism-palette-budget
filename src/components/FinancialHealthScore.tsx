import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { useGoals } from '@/hooks/use-goals';
import { useDebtPlans, useDebtItems } from '@/hooks/use-debt-plans';
import { cn } from '@/lib/utils';
import { Shield, TrendingUp, PiggyBank, CreditCard, Landmark, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FinancialHealthScoreProps {
  monthlyIncome: number;
  monthlyExpenses: number;
  totalAssets: number;
  totalLiabilities: number;
}

const SCORE_TIERS = [
  { min: 80, label: 'Excellent', color: 'text-accent', bg: 'bg-accent/15', ring: 'ring-accent/40', gradient: 'from-accent to-prism-lime' },
  { min: 60, label: 'Good', color: 'text-prism-teal', bg: 'bg-prism-teal/15', ring: 'ring-prism-teal/40', gradient: 'from-prism-teal to-prism-sky' },
  { min: 40, label: 'Fair', color: 'text-prism-amber', bg: 'bg-prism-amber/15', ring: 'ring-prism-amber/40', gradient: 'from-prism-amber to-prism-orange' },
  { min: 0, label: 'Needs Work', color: 'text-prism-rose', bg: 'bg-prism-rose/15', ring: 'ring-prism-rose/40', gradient: 'from-prism-rose to-prism-orange' },
];

function getTier(score: number) {
  return SCORE_TIERS.find(t => score >= t.min) || SCORE_TIERS[SCORE_TIERS.length - 1];
}

const FinancialHealthScore = ({ monthlyIncome, monthlyExpenses, totalAssets, totalLiabilities }: FinancialHealthScoreProps) => {
  const { data: goals } = useGoals();
  const { data: debtPlans } = useDebtPlans();
  const activePlanId = debtPlans?.find(p => p.is_active)?.id || debtPlans?.[0]?.id || null;
  const { data: debtItems } = useDebtItems(activePlanId);
  const navigate = useNavigate();

  const { score, components } = useMemo(() => {
    // 1. Savings Rate (0-30 points) — target: 20%+ = full score
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) : 0;
    const savingsScore = Math.min(30, Math.max(0, Math.round((savingsRate / 0.20) * 30)));

    // 2. Debt-to-Income Ratio (0-25 points) — target: <36% = full score
    const totalDebt = debtItems?.reduce((s, d) => s + d.balance, 0) || totalLiabilities;
    const monthlyDebtPayments = debtItems?.reduce((s, d) => s + d.minimum_payment, 0) || 0;
    const dti = monthlyIncome > 0 ? monthlyDebtPayments / monthlyIncome : 0;
    const dtiScore = dti <= 0 ? 25 : dti <= 0.36 ? Math.round((1 - dti / 0.36) * 25) : 0;

    // 3. Emergency Fund (0-25 points) — target: 3 months expenses
    const emergencyGoal = (goals || []).find((g: any) =>
      g.goal_type === 'emergency' || g.name?.toLowerCase().includes('emergency')
    );
    let emergencyScore = 0;
    if (emergencyGoal) {
      const progress = emergencyGoal.target_amount > 0 ? emergencyGoal.current_amount / emergencyGoal.target_amount : 0;
      emergencyScore = Math.min(25, Math.round(progress * 25));
    } else {
      // No explicit emergency fund goal — estimate from savings accounts
      const targetEmergency = monthlyExpenses * 3;
      if (targetEmergency > 0) {
        const savingsRatio = Math.min(1, totalAssets / targetEmergency);
        emergencyScore = Math.round(savingsRatio * 15); // lower max without explicit goal
      }
    }

    // 4. Net Worth Trend (0-20 points) — positive net worth = good
    const netWorth = totalAssets - totalLiabilities;
    let netWorthScore = 0;
    if (netWorth > 0) {
      netWorthScore = Math.min(20, Math.round(Math.min(1, netWorth / (monthlyIncome * 6 || 1)) * 20));
    }

    const total = savingsScore + dtiScore + emergencyScore + netWorthScore;

    return {
      score: total,
      components: [
        { label: 'Savings Rate', points: savingsScore, max: 30, value: `${Math.round(savingsRate * 100)}%`, icon: PiggyBank },
        { label: 'Debt Ratio', points: dtiScore, max: 25, value: `${Math.round(dti * 100)}% DTI`, icon: CreditCard },
        { label: 'Emergency Fund', points: emergencyScore, max: 25, value: emergencyGoal ? `${Math.round((emergencyGoal.current_amount / Math.max(1, emergencyGoal.target_amount)) * 100)}%` : 'No goal set', icon: Shield },
        { label: 'Net Worth', points: netWorthScore, max: 20, value: netWorth >= 0 ? 'Positive' : 'Negative', icon: Landmark },
      ],
    };
  }, [monthlyIncome, monthlyExpenses, totalAssets, totalLiabilities, goals, debtItems]);

  const tier = getTier(score);

  // SVG donut chart
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Card className="prism-card-shine border-border/50 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Score Ring */}
          <div className="relative shrink-0">
            <svg width="140" height="140" viewBox="0 0 120 120" className="-rotate-90">
              <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <motion.circle
                cx="60" cy="60" r="54" fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className={tier.color}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className={cn('font-display text-3xl font-black', tier.color)}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
              >
                {score}
              </motion.span>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">/ 100</span>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-1 w-full">
            <div className="flex items-center gap-2 mb-3">
              <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center bg-gradient-to-br', tier.gradient)}>
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold">Financial Health</h3>
                <p className={cn('text-sm font-semibold', tier.color)}>{tier.label}</p>
              </div>
            </div>

            <div className="space-y-2">
              {components.map(comp => (
                <div key={comp.label} className="flex items-center gap-3">
                  <comp.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="font-medium truncate">{comp.label}</span>
                      <span className="text-muted-foreground">{comp.points}/{comp.max}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className={cn('h-full rounded-full', tier.color === 'text-accent' ? 'bg-accent' : tier.color === 'text-prism-teal' ? 'bg-prism-teal' : tier.color === 'text-prism-amber' ? 'bg-prism-amber' : 'bg-prism-rose')}
                        initial={{ width: 0 }}
                        animate={{ width: `${(comp.points / comp.max) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                      />
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground w-[70px] text-right shrink-0">{comp.value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/goals')}
              className="flex items-center gap-1 text-xs text-primary font-medium mt-3 hover:gap-2 transition-all"
            >
              Improve your score <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialHealthScore;

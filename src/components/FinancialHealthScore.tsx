import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { useGoals } from '@/hooks/use-goals';
import { useDebtPlans, useDebtItems } from '@/hooks/use-debt-plans';
import { cn } from '@/lib/utils';
import { Shield, TrendingUp, PiggyBank, CreditCard, Landmark, ChevronRight, ChevronDown, Lightbulb } from 'lucide-react';
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

/** Returns a green / yellow / red color class based on component score ratio */
function getComponentHealth(points: number, max: number) {
  const ratio = max > 0 ? points / max : 0;
  if (ratio >= 0.65) return { bar: 'bg-emerald-500', text: 'text-emerald-500', dot: 'bg-emerald-500', label: 'Healthy' };
  if (ratio >= 0.35) return { bar: 'bg-amber-500', text: 'text-amber-500', dot: 'bg-amber-500', label: 'Caution' };
  return { bar: 'bg-red-500', text: 'text-red-500', dot: 'bg-red-500', label: 'Urgent' };
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

    // Generate tips for each component
    const savingsTips: string[] = [];
    if (savingsRate < 0.05) savingsTips.push('Start by saving even 5% of your income — automate a transfer on payday.');
    else if (savingsRate < 0.10) savingsTips.push('You\'re saving, but try to reach 10% — cut one subscription or dining-out expense.');
    else if (savingsRate < 0.20) savingsTips.push('Great start! Boost to 20% by redirecting bonuses or raises to savings.');
    if (savingsRate < 0.20) savingsTips.push('Review your spending trends to find categories where you can cut back.');

    const debtTips: string[] = [];
    if (dti > 0.50) debtTips.push('Your DTI is very high — consider debt consolidation or negotiating lower rates.');
    else if (dti > 0.36) debtTips.push('Aim to get DTI below 36% — focus extra payments on your highest-interest debt.');
    if (dti > 0.20) debtTips.push('Use the Debt Payoff tool to create an avalanche or snowball plan.');
    if (dti > 0 && dti <= 0.20) debtTips.push('Your debt is manageable — keep making consistent payments to eliminate it.');

    const emergencyTips: string[] = [];
    if (!emergencyGoal) emergencyTips.push('Create an Emergency Fund goal targeting 3–6 months of expenses.');
    else if (emergencyGoal.current_amount < emergencyGoal.target_amount * 0.25) emergencyTips.push('Start small — aim for $1,000 first, then build toward your full target.');
    else if (emergencyGoal.current_amount < emergencyGoal.target_amount) emergencyTips.push('Keep going! Set up automatic deposits to reach your emergency fund target.');

    const netWorthTips: string[] = [];
    if (netWorth < 0) netWorthTips.push('Focus on paying down debt to move your net worth positive.');
    else if (netWorthScore < 10) netWorthTips.push('Grow net worth by maximizing retirement contributions and reducing liabilities.');
    else if (netWorthScore < 20) netWorthTips.push('Consider diversifying into investments for long-term growth.');

    return {
      score: total,
      components: [
        { label: 'Savings Rate', points: savingsScore, max: 30, value: `${Math.round(savingsRate * 100)}%`, icon: PiggyBank, tips: savingsTips, link: '/spending-trends' },
        { label: 'Debt Ratio', points: dtiScore, max: 25, value: `${Math.round(dti * 100)}% DTI`, icon: CreditCard, tips: debtTips, link: '/debt-payoff' },
        { label: 'Emergency Fund', points: emergencyScore, max: 25, value: emergencyGoal ? `${Math.round((emergencyGoal.current_amount / Math.max(1, emergencyGoal.target_amount)) * 100)}%` : 'No goal set', icon: Shield, tips: emergencyTips, link: '/goals' },
        { label: 'Net Worth', points: netWorthScore, max: 20, value: netWorth >= 0 ? 'Positive' : 'Negative', icon: Landmark, tips: netWorthTips, link: '/net-worth' },
      ],
    };
  }, [monthlyIncome, monthlyExpenses, totalAssets, totalLiabilities, goals, debtItems]);

  const tier = getTier(score);
  const [showTips, setShowTips] = useState(false);

  // Get the top tips sorted by weakest component first
  const topTips = useMemo(() => {
    return [...components]
      .sort((a, b) => (a.points / a.max) - (b.points / b.max))
      .filter(c => c.tips.length > 0)
      .slice(0, 3);
  }, [components]);
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
              onClick={() => setShowTips(!showTips)}
              className="flex items-center gap-1 text-xs text-primary font-medium mt-3 hover:gap-2 transition-all"
            >
              <Lightbulb className="h-3 w-3" />
              {showTips ? 'Hide tips' : 'Tips to improve'}
              <ChevronDown className={cn('h-3 w-3 transition-transform', showTips && 'rotate-180')} />
            </button>
          </div>
        </div>

        {/* Tips Section */}
        <AnimatePresence>
          {showTips && topTips.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                {topTips.map(comp => (
                  <div key={comp.label} className="space-y-1.5">
                    <button
                      onClick={() => navigate(comp.link)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      <comp.icon className="h-3.5 w-3.5" />
                      {comp.label}
                      <span className="text-muted-foreground font-normal">({comp.points}/{comp.max})</span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </button>
                    {comp.tips.map((tip, i) => (
                      <p key={i} className="text-[11px] text-muted-foreground pl-5 leading-relaxed">
                        💡 {tip}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default FinancialHealthScore;

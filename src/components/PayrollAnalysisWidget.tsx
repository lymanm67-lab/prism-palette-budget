import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useBudgets, useCategories, useCategoryGroups } from '@/hooks/use-finance-data';
import { useCurrency } from '@/hooks/use-currency';
import { TrendingUp, PiggyBank, Briefcase, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PayrollAnalysisWidgetProps {
  month: string;
}

interface DeductionLine {
  name: string;
  monthlyAmount: number;
  pctOfGross: number;
  type: 'tax' | 'retirement' | 'health' | 'insurance' | 'other';
}

const DEDUCTION_TYPE_MAP: Record<string, DeductionLine['type']> = {
  '401k': 'retirement', '403b': 'retirement', '457b': 'retirement',
  'roth': 'retirement', 'deferred': 'retirement', 'pension': 'retirement',
  'hsa': 'health', 'fsa': 'health', 'dental': 'health', 'vision': 'health',
  'medical': 'health', 'health': 'health',
  'federal': 'tax', 'state': 'tax', 'fica': 'tax', 'social security': 'tax',
  'medicare': 'tax', 'tax': 'tax',
  'life': 'insurance', 'disability': 'insurance', 'ltd': 'insurance', 'std': 'insurance',
};

function classifyDeduction(name: string): DeductionLine['type'] {
  const lower = name.toLowerCase();
  for (const [key, type] of Object.entries(DEDUCTION_TYPE_MAP)) {
    if (lower.includes(key)) return type;
  }
  return 'other';
}

export default function PayrollAnalysisWidget({ month }: PayrollAnalysisWidgetProps) {
  const { formatCurrency } = useCurrency();
  const { data: budgets } = useBudgets(month);
  const { data: categories } = useCategories();
  const { data: categoryGroups } = useCategoryGroups();

  const analysis = useMemo(() => {
    if (!budgets || !categories || !categoryGroups) return null;

    // Find payroll deduction groups & income groups
    const payrollGroupIds = new Set(
      (categoryGroups as any[])
        .filter((g: any) => g.expense_type === 'payroll_deduction')
        .map((g: any) => g.id)
    );
    const incomeGroupIds = new Set(
      (categoryGroups as any[])
        .filter((g: any) => g.expense_type === 'income' && (g.budget_type || 'personal') === 'personal')
        .map((g: any) => g.id)
    );
    const expenseGroupIds = new Set(
      (categoryGroups as any[])
        .filter((g: any) => ['fixed', 'flexible', 'non_monthly'].includes(g.expense_type) && (g.budget_type || 'personal') === 'personal')
        .map((g: any) => g.id)
    );

    const payrollCatIds = new Set(categories.filter(c => payrollGroupIds.has(c.group_id)).map(c => c.id));
    const incomeCatIds = new Set(categories.filter(c => incomeGroupIds.has(c.group_id)).map(c => c.id));
    const expenseCatIds = new Set(categories.filter(c => expenseGroupIds.has(c.group_id)).map(c => c.id));

    // Sum budgets
    let netIncome = 0;
    let totalDeductions = 0;
    let totalExpenses = 0;

    const deductions: DeductionLine[] = [];

    for (const b of budgets as any[]) {
      if (incomeCatIds.has(b.category_id)) {
        netIncome += b.planned_amount;
      } else if (payrollCatIds.has(b.category_id)) {
        totalDeductions += b.planned_amount;
        const cat = categories.find(c => c.id === b.category_id);
        if (cat) {
          deductions.push({
            name: cat.name,
            monthlyAmount: b.planned_amount,
            pctOfGross: 0, // calculated after
            type: classifyDeduction(cat.name),
          });
        }
      } else if (expenseCatIds.has(b.category_id)) {
        totalExpenses += b.planned_amount;
      }
    }

    const grossIncome = netIncome + totalDeductions;

    // Calculate percentages
    for (const d of deductions) {
      d.pctOfGross = grossIncome > 0 ? (d.monthlyAmount / grossIncome) * 100 : 0;
    }

    // Split employer match from employee retirement deductions
    const employerMatchDeductions = deductions.filter(d => d.name.toLowerCase().includes('employer'));
    const retirementDeductions = deductions.filter(d => d.type === 'retirement' && !d.name.toLowerCase().includes('employer'));
    const healthDeductions = deductions.filter(d => d.type === 'health');

    const employeeContribution = retirementDeductions.reduce((s, d) => s + d.monthlyAmount, 0);
    const employeeContribPct = grossIncome > 0 ? (employeeContribution / grossIncome) * 100 : 0;

    const employerMatch = employerMatchDeductions.reduce((s, d) => s + d.monthlyAmount, 0);
    const employerMatchPct = grossIncome > 0 ? (employerMatch / grossIncome) * 100 : 0;

    const hsaAmount = healthDeductions.filter(d => d.name.toLowerCase().includes('hsa')).reduce((s, d) => s + d.monthlyAmount, 0);
    const hsaPct = grossIncome > 0 ? (hsaAmount / grossIncome) * 100 : 0;

    // Expense % of income
    const expensePctOfNet = netIncome > 0 ? (totalExpenses / netIncome) * 100 : 0;

    // Total savings rate includes employee + employer + HSA
    const savingsContributions = employeeContribution + employerMatch + hsaAmount;
    const totalSavingsRate = grossIncome > 0 ? (savingsContributions / grossIncome) * 100 : 0;
    const meetsStandard = totalSavingsRate >= 20;

    return {
      grossIncome,
      netIncome,
      totalDeductions,
      totalExpenses,
      deductions,
      expensePctOfNet,
      employeeContribution,
      employeeContribPct,
      employerMatch,
      employerMatchPct,
      hsaAmount,
      hsaPct,
      totalSavingsRate,
      meetsStandard,
      retirementDeductions,
      employerMatchDeductions,
    };
  }, [budgets, categories, categoryGroups]);

  if (!analysis || analysis.totalDeductions === 0) return null;

  return (
    <Card className="border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-sky-500" />
            Payroll & Investment Analysis
          </h3>
          <Badge variant="outline" className={cn('text-[10px]', analysis.meetsStandard ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'border-amber-500/30 text-amber-600 dark:text-amber-400')}>
            {analysis.meetsStandard ? '✓ Meets 20% Standard' : 'Below 20% Standard'}
          </Badge>
        </div>

        {/* Key metrics row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Gross Income</p>
            <p className="text-sm font-bold tabular-nums">{formatCurrency(analysis.grossIncome)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Deductions</p>
            <p className="text-sm font-bold tabular-nums text-sky-600 dark:text-sky-400">{formatCurrency(analysis.totalDeductions)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Expense % of Net</p>
            <p className="text-sm font-bold tabular-nums">{analysis.expensePctOfNet.toFixed(0)}%</p>
          </div>
        </div>

        {/* Savings Rate Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-medium flex items-center gap-1">
              <PiggyBank className="h-3.5 w-3.5 text-emerald-500" />
              Total Savings & Investment Rate
            </span>
            <span className={cn('font-bold', analysis.meetsStandard ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
              {analysis.totalSavingsRate.toFixed(2)}%
            </span>
          </div>
          <Progress value={Math.min(analysis.totalSavingsRate, 100)} className="h-2" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0%</span>
            <span className="font-medium">Target: 20%</span>
            <span>30%+</span>
          </div>
        </div>

        {/* Retirement breakdown */}
        {analysis.retirementDeductions.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Retirement Contributions
            </p>
            {analysis.retirementDeductions.map((d, i) => (
              <div key={i} className="flex justify-between text-xs px-2 py-1 rounded bg-muted/30">
                <span>{d.name}</span>
                <span className="tabular-nums font-medium">{formatCurrency(d.monthlyAmount)} <span className="text-muted-foreground">({d.pctOfGross.toFixed(2)}%)</span></span>
              </div>
            ))}
          </div>
        )}

        {/* Employer match */}
        {analysis.employerMatch > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Employer Contributions
            </p>
            {analysis.employerMatchDeductions.map((d, i) => (
              <div key={i} className="flex justify-between text-xs px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/10">
                <span className="font-medium">{d.name}</span>
                <span className="tabular-nums font-medium">{formatCurrency(d.monthlyAmount)} <span className="text-muted-foreground">({d.pctOfGross.toFixed(2)}%)</span></span>
              </div>
            ))}
          </div>
        )}

        {/* HSA if present */}
        {analysis.hsaPct > 0 && (
          <div className="flex justify-between text-xs px-2 py-1 rounded bg-emerald-500/5 border border-emerald-500/10">
            <span className="font-medium">HSA Contribution</span>
            <span className="tabular-nums font-medium">{formatCurrency(analysis.hsaAmount)} <span className="text-muted-foreground">({analysis.hsaPct.toFixed(2)}%)</span></span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

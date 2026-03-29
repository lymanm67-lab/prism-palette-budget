import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useBudgets, useCategories, useCategoryGroups } from '@/hooks/use-finance-data';
import { useCurrency } from '@/hooks/use-currency';
import { TrendingUp, PiggyBank, Briefcase, CheckCircle2, AlertTriangle, Shield, Heart, DollarSign, Award, ArrowUp, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' };

interface PayrollReportTabProps {
  budgetMonth: string;
}

type DeductionType = 'tax' | 'retirement' | 'health' | 'insurance' | 'other';

interface DeductionLine {
  name: string;
  monthlyAmount: number;
  annualAmount: number;
  pctOfGross: number;
  type: DeductionType;
}

const DEDUCTION_TYPE_MAP: Record<string, DeductionType> = {
  '401k': 'retirement', '403b': 'retirement', '457b': 'retirement',
  'roth 403b': 'retirement', 'roth 401k': 'retirement', 'roth ira': 'retirement',
  'deferred comp': 'retirement', 'pension': 'retirement',
  'hsa': 'health', 'fsa': 'health', 'dental': 'health', 'vision': 'health',
  'medical': 'health', 'health': 'health',
  'federal': 'tax', 'state': 'tax', 'fica': 'tax', 'social security': 'tax',
  'medicare': 'tax', 'tax': 'tax', 'local tax': 'tax',
  'life': 'insurance', 'disability': 'insurance', 'ltd': 'insurance', 'std': 'insurance', 'ad&d': 'insurance',
};

const TYPE_LABELS: Record<DeductionType, string> = {
  tax: 'Taxes',
  retirement: 'Retirement',
  health: 'Health & Benefits',
  insurance: 'Insurance',
  other: 'Other',
};

const TYPE_COLORS: Record<DeductionType, string> = {
  tax: 'hsl(340, 82%, 52%)',
  retirement: 'hsl(160, 84%, 39%)',
  health: 'hsl(199, 89%, 48%)',
  insurance: 'hsl(262, 83%, 58%)',
  other: 'hsl(36, 100%, 57%)',
};

const TYPE_ICONS: Record<DeductionType, typeof DollarSign> = {
  tax: DollarSign,
  retirement: TrendingUp,
  health: Heart,
  insurance: Shield,
  other: Briefcase,
};

// Ordered patterns: more specific first to avoid "tax" matching "Tax Deferred Account"
const CLASSIFICATION_RULES: [RegExp, DeductionType][] = [
  // Retirement — must come before generic "tax"
  [/tax\s*deferred|tda/i, 'retirement'],
  [/deferred\s*comp/i, 'retirement'],
  [/roth/i, 'retirement'],
  [/401\s*\(?k\)?/i, 'retirement'],
  [/403\s*\(?b\)?/i, 'retirement'],
  [/457\s*\(?b\)?/i, 'retirement'],
  [/pension/i, 'retirement'],
  [/employer\s*(match|contrib)/i, 'retirement'],
  // Health
  [/\bhsa\b/i, 'health'],
  [/\bfsa\b/i, 'health'],
  [/dental/i, 'health'],
  [/vision/i, 'health'],
  [/medical/i, 'health'],
  [/health/i, 'health'],
  // Insurance
  [/\blife\b/i, 'insurance'],
  [/disability/i, 'insurance'],
  [/\bltd\b/i, 'insurance'],
  [/\bstd\b/i, 'insurance'],
  [/ad&d/i, 'insurance'],
  // Tax — generic, last
  [/federal/i, 'tax'],
  [/\bstate\b/i, 'tax'],
  [/fica/i, 'tax'],
  [/social\s*security/i, 'tax'],
  [/medicare/i, 'tax'],
  [/\btax\b/i, 'tax'],
  [/local\s*tax/i, 'tax'],
];

function classifyDeduction(name: string): DeductionType {
  for (const [pattern, type] of CLASSIFICATION_RULES) {
    if (pattern.test(name)) return type;
  }
  return 'other';
}

export default function PayrollReportTab({ budgetMonth }: PayrollReportTabProps) {
  const { formatCurrency } = useCurrency();
  const { data: budgets } = useBudgets(budgetMonth);
  const { data: categories } = useCategories();
  const { data: categoryGroups } = useCategoryGroups();
  const [employerMatchPct, setEmployerMatchPct] = useState<string>('9');

  const analysis = useMemo(() => {
    if (!budgets || !categories || !categoryGroups) return null;

    const payrollGroupIds = new Set(
      (categoryGroups as any[]).filter((g: any) => g.expense_type === 'payroll_deduction').map((g: any) => g.id)
    );
    const incomeGroupIds = new Set(
      (categoryGroups as any[]).filter((g: any) => g.expense_type === 'income' && (g.budget_type || 'personal') === 'personal').map((g: any) => g.id)
    );
    const expenseGroupIds = new Set(
      (categoryGroups as any[]).filter((g: any) => ['fixed', 'flexible', 'non_monthly'].includes(g.expense_type) && (g.budget_type || 'personal') === 'personal').map((g: any) => g.id)
    );

    const payrollCatIds = new Set(categories.filter(c => payrollGroupIds.has(c.group_id)).map(c => c.id));
    const incomeCatIds = new Set(categories.filter(c => incomeGroupIds.has(c.group_id)).map(c => c.id));
    const expenseCatIds = new Set(categories.filter(c => expenseGroupIds.has(c.group_id)).map(c => c.id));

    let netIncome = 0;
    let totalDeductions = 0;
    let totalFixedExp = 0;
    let totalFlexibleExp = 0;
    let totalNonMonthlyExp = 0;
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
            annualAmount: b.planned_amount * 12,
            pctOfGross: 0,
            type: classifyDeduction(cat.name),
          });
        }
      } else if (expenseCatIds.has(b.category_id)) {
        const cat = categories.find(c => c.id === b.category_id);
        const group = cat ? (categoryGroups as any[]).find((g: any) => g.id === cat.group_id) : null;
        const expType = group?.expense_type || 'flexible';
        if (expType === 'fixed') totalFixedExp += b.planned_amount;
        else if (expType === 'flexible') totalFlexibleExp += b.planned_amount;
        else if (expType === 'non_monthly') totalNonMonthlyExp += b.planned_amount;
      }
    }

    const grossIncome = netIncome + totalDeductions;
    const totalExpenses = totalFixedExp + totalFlexibleExp + totalNonMonthlyExp;

    for (const d of deductions) {
      d.pctOfGross = grossIncome > 0 ? (d.monthlyAmount / grossIncome) * 100 : 0;
    }

    // Group deductions by type
    const byType = new Map<DeductionType, { items: DeductionLine[]; total: number; pct: number }>();
    for (const d of deductions) {
      if (!byType.has(d.type)) byType.set(d.type, { items: [], total: 0, pct: 0 });
      const group = byType.get(d.type)!;
      group.items.push(d);
      group.total += d.monthlyAmount;
    }
    for (const [, group] of byType) {
      group.pct = grossIncome > 0 ? (group.total / grossIncome) * 100 : 0;
    }

    // Investment & Savings Analysis
    const retirementItems = deductions.filter(d => d.type === 'retirement');
    let hsaItems = deductions.filter(d => d.name.toLowerCase().includes('hsa'));
    const rothItems = retirementItems.filter(d => d.name.toLowerCase().includes('roth'));
    const deferredItems = retirementItems.filter(d => !d.name.toLowerCase().includes('roth'));

    // Default HSA to $110/month if no HSA budget entry exists
    if (hsaItems.length === 0 && grossIncome > 0) {
      const defaultHsa: DeductionLine = {
        name: 'HSA Savings',
        monthlyAmount: 110,
        annualAmount: 1320,
        pctOfGross: grossIncome > 0 ? (110 / grossIncome) * 100 : 0,
        type: 'health',
      };
      hsaItems = [defaultHsa];
    }

    const employeeContrib = retirementItems.reduce((s, d) => s + d.monthlyAmount, 0);
    const employeeContribPct = grossIncome > 0 ? (employeeContrib / grossIncome) * 100 : 0;
    const hsaTotal = hsaItems.reduce((s, d) => s + d.monthlyAmount, 0);
    const hsaPct = grossIncome > 0 ? (hsaTotal / grossIncome) * 100 : 0;
    const rothTotal = rothItems.reduce((s, d) => s + d.monthlyAmount, 0);
    const rothPct = grossIncome > 0 ? (rothTotal / grossIncome) * 100 : 0;
    const deferredTotal = deferredItems.reduce((s, d) => s + d.monthlyAmount, 0);
    const deferredPct = grossIncome > 0 ? (deferredTotal / grossIncome) * 100 : 0;

    // Employer-paid benefits toward retirement
    const detectedEmployerItems = deductions.filter(d => {
      const lower = d.name.toLowerCase();
      return lower.includes('employer') || lower.includes('match') || lower.includes('company contrib');
    });
    const detectedEmployerContrib = detectedEmployerItems.reduce((s, d) => s + d.monthlyAmount, 0);
    const matchPct = parseFloat(employerMatchPct) || 0;
    const calculatedEmployerContrib = grossIncome > 0 ? (grossIncome * matchPct) / 100 : 0;
    const employerContrib = detectedEmployerContrib > 0 ? detectedEmployerContrib : calculatedEmployerContrib;
    const employerContribPct = grossIncome > 0 ? (employerContrib / grossIncome) * 100 : 0;
    const employerBenefitItems = detectedEmployerItems;

    const totalSavingsInvestment = employeeContrib + hsaTotal + employerContrib;
    const totalSavingsRate = grossIncome > 0 ? (totalSavingsInvestment / grossIncome) * 100 : 0;

    // Expense breakdown as % of net
    const expensePctOfNet = netIncome > 0 ? (totalExpenses / netIncome) * 100 : 0;
    const fixedPctOfNet = netIncome > 0 ? (totalFixedExp / netIncome) * 100 : 0;
    const flexiblePctOfNet = netIncome > 0 ? (totalFlexibleExp / netIncome) * 100 : 0;
    const nonMonthlyPctOfNet = netIncome > 0 ? (totalNonMonthlyExp / netIncome) * 100 : 0;

    // Pie chart data for deductions
    const deductionPieData = Array.from(byType.entries()).map(([type, group]) => ({
      name: TYPE_LABELS[type],
      value: group.total,
      color: TYPE_COLORS[type],
    })).filter(d => d.value > 0);

    // Expense % bar data
    const expenseBarData = [
      { name: 'Fixed', amount: totalFixedExp, pct: fixedPctOfNet, target: '50-60%', color: 'hsl(262, 83%, 58%)' },
      { name: 'Flexible', amount: totalFlexibleExp, pct: flexiblePctOfNet, target: '20-35%', color: 'hsl(36, 100%, 57%)' },
      { name: 'Non-Monthly', amount: totalNonMonthlyExp, pct: nonMonthlyPctOfNet, target: '5-10%', color: 'hsl(160, 84%, 39%)' },
    ];

    return {
      grossIncome, netIncome, totalDeductions, totalExpenses,
      deductions, byType, deductionPieData,
      expensePctOfNet, fixedPctOfNet, flexiblePctOfNet, nonMonthlyPctOfNet,
      totalFixedExp, totalFlexibleExp, totalNonMonthlyExp,
      expenseBarData,
      employeeContrib, employeeContribPct,
      employerContrib, employerContribPct, employerBenefitItems,
      hsaTotal, hsaPct,
      rothTotal, rothPct,
      deferredTotal, deferredPct,
      totalSavingsInvestment, totalSavingsRate,
      meetsStandard: totalSavingsRate >= 20,
      retirementItems, hsaItems, rothItems, deferredItems,
    };
  }, [budgets, categories, categoryGroups, employerMatchPct]);

  if (!analysis || analysis.totalDeductions === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No Payroll Data</p>
          <p className="text-sm text-muted-foreground mt-1">Upload a paycheck stub on the Budgets page to populate payroll deductions and enable this analysis.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Gross Income</p>
            <p className="text-lg font-bold tabular-nums mt-1">{formatCurrency(analysis.grossIncome)}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(analysis.grossIncome * 12)}/yr</p>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: 'hsl(199, 89%, 48%)' }}>
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Deductions</p>
            <p className="text-lg font-bold tabular-nums mt-1">{formatCurrency(analysis.totalDeductions)}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(analysis.totalDeductions * 12)}/yr</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Net Income</p>
            <p className="text-lg font-bold tabular-nums mt-1">{formatCurrency(analysis.netIncome)}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(analysis.netIncome * 12)}/yr</p>
          </CardContent>
        </Card>
        <Card className={cn('border-l-4', analysis.meetsStandard ? 'border-l-emerald-500' : 'border-l-amber-500')}>
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Savings Rate</p>
            <p className={cn('text-lg font-bold tabular-nums mt-1', analysis.meetsStandard ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
              {analysis.totalSavingsRate.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground">Target: ≥ 20%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Expense % of Income */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Monthly Expense % of Income
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {analysis.expenseBarData.map(item => {
                const isOver = item.name === 'Fixed' ? item.pct > 60 : item.name === 'Flexible' ? item.pct > 35 : item.pct > 10;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item.name}</span>
                      <span className="tabular-nums">
                        {formatCurrency(item.amount)} <span className={cn('font-bold', isOver ? 'text-rose-600 dark:text-rose-400' : 'text-foreground')}>({item.pct.toFixed(1)}%)</span>
                        <span className="text-muted-foreground text-xs ml-1">target: {item.target}</span>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(item.pct, 100)}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t pt-3 flex justify-between text-sm font-semibold">
              <span>Total Expenses</span>
              <span>{formatCurrency(analysis.totalExpenses)} ({analysis.expensePctOfNet.toFixed(1)}% of net)</span>
            </div>
          </CardContent>
        </Card>

        {/* Deductions Pie Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-sky-500" />
              Deduction Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={analysis.deductionPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value">
                  {analysis.deductionPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                <Legend iconType="circle" iconSize={10} formatter={(value: string) => <span className="text-sm text-foreground">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Annual Deductions Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Annual Deductions Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deduction Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Monthly Amount</TableHead>
                <TableHead className="text-right">Annual Amount</TableHead>
                <TableHead className="text-right">% of Gross</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(analysis.byType.entries()).map(([type, group]) => (
                <>
                  {group.items.map((item, i) => {
                    const Icon = TYPE_ICONS[type];
                    return (
                      <TableRow key={`${type}-${i}`}>
                        {i === 0 && (
                          <TableCell rowSpan={group.items.length} className="font-medium align-top">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 shrink-0" style={{ color: TYPE_COLORS[type] }} />
                              {TYPE_LABELS[type]}
                            </div>
                          </TableCell>
                        )}
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(item.monthlyAmount)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(item.annualAmount)}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.pctOfGross.toFixed(2)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </>
              ))}
              <TableRow className="font-semibold bg-muted/30">
                <TableCell colSpan={2}>Total Deductions</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(analysis.totalDeductions)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(analysis.totalDeductions * 12)}</TableCell>
                <TableCell className="text-right tabular-nums">{analysis.grossIncome > 0 ? ((analysis.totalDeductions / analysis.grossIncome) * 100).toFixed(2) : 0}%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Investment & Savings Analysis */}
      <Card className={cn('border-2', analysis.meetsStandard ? 'border-emerald-500/20' : 'border-amber-500/20')}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-emerald-500" />
              Investment & Savings Analysis
            </CardTitle>
            <Badge className={cn('text-xs', analysis.meetsStandard ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30')} variant="outline">
              {analysis.meetsStandard ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Meets 20% Standard</> : <><AlertTriangle className="h-3 w-3 mr-1" /> Below 20% Standard</>}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Contribution breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Before Tax Deductions</h4>
              <div className="space-y-2">
                {analysis.deferredItems.map((item, i) => (
                  <div key={`pre-${i}`} className="flex justify-between text-sm p-2 rounded-lg bg-muted/30">
                    <span>{item.name}</span>
                    <span className="tabular-nums font-medium">{formatCurrency(item.monthlyAmount)} <span className="text-muted-foreground">({item.pctOfGross.toFixed(2)}%)</span></span>
                  </div>
                ))}
                {analysis.hsaTotal > 0 && analysis.hsaItems.map((item, i) => (
                  <div key={`hsa-${i}`} className="flex justify-between text-sm p-2 rounded-lg bg-muted/30">
                    <span>{item.name}</span>
                    <span className="tabular-nums font-medium">{formatCurrency(item.monthlyAmount)} <span className="text-muted-foreground">({item.pctOfGross.toFixed(2)}%)</span></span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-sm font-semibold border-t pt-2">
                <span>Before Tax Total</span>
                <span className="tabular-nums">{formatCurrency(analysis.deferredTotal + analysis.hsaTotal)} ({(analysis.deferredPct + analysis.hsaPct).toFixed(2)}%)</span>
              </div>

              {/* After Tax Deductions */}
              {analysis.rothItems.length > 0 && (
                <div className="space-y-2 pt-3 border-t">
                  <h4 className="text-sm font-semibold">After Tax Deductions</h4>
                  {analysis.rothItems.map((item, i) => (
                    <div key={`roth-${i}`} className="flex justify-between text-sm p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <span>{item.name}</span>
                      <span className="tabular-nums font-medium">{formatCurrency(item.monthlyAmount)} <span className="text-muted-foreground">({item.pctOfGross.toFixed(2)}%)</span></span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold border-t pt-2">
                    <span>After Tax Total</span>
                    <span className="tabular-nums">{formatCurrency(analysis.rothTotal)} ({analysis.rothPct.toFixed(2)}%)</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold pt-2 border-t border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <span>Employee Total</span>
                <span className="tabular-nums">{formatCurrency(analysis.employeeContrib + analysis.hsaTotal)} ({(analysis.employeeContribPct + analysis.hsaPct).toFixed(2)}% of gross)</span>
              </div>

              {/* Employer Paid Benefits — always shown */}
              <div className="space-y-2 pt-3 border-t">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-sky-500" />
                  Employer Paid Benefits (Retirement)
                </h4>
                {analysis.employerBenefitItems.length > 0 ? (
                  analysis.employerBenefitItems.map((item: DeductionLine, i: number) => (
                    <div key={i} className="flex justify-between text-sm p-2 rounded-lg bg-sky-500/5 border border-sky-500/10">
                      <span>{item.name}</span>
                      <span className="tabular-nums font-medium">{formatCurrency(item.monthlyAmount)} <span className="text-muted-foreground">({item.pctOfGross.toFixed(2)}%)</span></span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-sky-500/5 border border-sky-500/10">
                    <span className="text-sm whitespace-nowrap">Employer Match</span>
                    <Input
                      type="number"
                      value={employerMatchPct}
                      onChange={(e) => setEmployerMatchPct(e.target.value)}
                      className="h-7 w-16 text-sm tabular-nums"
                      step="0.5"
                      min="0"
                      max="100"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">% of gross = {formatCurrency(analysis.employerContrib)}/mo</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold">
                  <span>Employer Total</span>
                  <span className="tabular-nums">{formatCurrency(analysis.employerContrib)} ({analysis.employerContribPct.toFixed(2)}% of gross)</span>
                </div>
              </div>

              {/* Combined Employee + Employer */}
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <span>Combined (Employee + Employer)</span>
                <span className="tabular-nums">{formatCurrency(analysis.employeeContrib + analysis.hsaTotal + analysis.employerContrib)} ({(analysis.employeeContribPct + analysis.hsaPct + analysis.employerContribPct).toFixed(2)}%)</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Rate Summary</h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Employee Retirement</span>
                    <span className="font-bold tabular-nums">{analysis.employeeContribPct.toFixed(2)}%</span>
                  </div>
                  <Progress value={Math.min(analysis.employeeContribPct * 5, 100)} className="h-1.5" />
                </div>
                {analysis.employerContrib > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Employer Retirement</span>
                      <span className="font-bold tabular-nums">{analysis.employerContribPct.toFixed(2)}%</span>
                    </div>
                    <Progress value={Math.min(analysis.employerContribPct * 5, 100)} className="h-1.5" />
                  </div>
                )}
                {analysis.hsaPct > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>HSA</span>
                      <span className="font-bold tabular-nums">{analysis.hsaPct.toFixed(2)}%</span>
                    </div>
                    <Progress value={Math.min(analysis.hsaPct * 10, 100)} className="h-1.5" />
                  </div>
                )}
                <div className="space-y-1 pt-2 border-t">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="flex items-center gap-1.5">
                      {analysis.meetsStandard ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      Total Savings & Investment Rate
                    </span>
                    <span className={cn('text-base tabular-nums', analysis.meetsStandard ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                      {analysis.totalSavingsRate.toFixed(2)}%
                    </span>
                  </div>
                  <Progress value={Math.min(analysis.totalSavingsRate * 5, 100)} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Includes: Employee ({analysis.employeeContribPct.toFixed(2)}%) + HSA ({analysis.hsaPct.toFixed(2)}%){analysis.employerContrib > 0 ? ` + Employer (${analysis.employerContribPct.toFixed(2)}%)` : ''}.{' '}
                    {analysis.meetsStandard
                      ? 'Meets the 20% wealth-building standard.'
                      : `${(20 - analysis.totalSavingsRate).toFixed(2)}% below the 20% standard.`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Visual summary bar */}
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Gross Income Allocation</p>
            <div className="flex h-6 rounded-full overflow-hidden">
              <div className="bg-rose-500 transition-all" style={{ width: `${analysis.grossIncome > 0 ? ((analysis.byType.get('tax')?.total || 0) / analysis.grossIncome * 100) : 0}%` }} title="Taxes" />
              <div className="bg-emerald-500 transition-all" style={{ width: `${analysis.employeeContribPct}%` }} title="Employee Retirement" />
              {analysis.employerContribPct > 0 && <div className="bg-teal-400 transition-all" style={{ width: `${analysis.employerContribPct}%` }} title="Employer Retirement" />}
              <div className="transition-all" style={{ width: `${analysis.hsaPct}%`, backgroundColor: 'hsl(199, 89%, 48%)' }} title="HSA" />
              <div className="bg-purple-500 transition-all" style={{ width: `${analysis.grossIncome > 0 ? ((analysis.byType.get('insurance')?.total || 0) / analysis.grossIncome * 100) : 0}%` }} title="Insurance" />
              <div className="bg-muted-foreground/20 flex-1" title="Net Pay" />
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-[10px]">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Taxes</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Employee Retirement</span>
              {analysis.employerContrib > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-teal-400" /> Employer Retirement</span>}
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(199, 89%, 48%)' }} /> HSA</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500" /> Insurance</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/20" /> Net Pay</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* National Average Comparison & Ranking */}
      {(() => {
        const rate = analysis.totalSavingsRate;
        const benchmarks = [
          { label: 'National Average Savings Rate', value: 4.6, source: 'BEA 2024' },
          { label: 'Average 401(k) Contribution Rate', value: 7.4, source: 'Vanguard 2024' },
          { label: 'Average Total Retirement Rate (w/ Employer)', value: 11.7, source: 'Fidelity 2024' },
          { label: 'Recommended Wealth-Building Standard', value: 20, source: 'Financial Experts' },
          { label: 'Top 10% Savers', value: 25, source: 'Federal Reserve SCF' },
        ];

        // Determine percentile rank
        let rank: string;
        let rankColor: string;
        let rankIcon: typeof Award;
        if (rate >= 25) { rank = 'Top 5%'; rankColor = 'text-emerald-600 dark:text-emerald-400'; rankIcon = Award; }
        else if (rate >= 20) { rank = 'Top 15%'; rankColor = 'text-emerald-600 dark:text-emerald-400'; rankIcon = Award; }
        else if (rate >= 15) { rank = 'Top 25%'; rankColor = 'text-sky-600 dark:text-sky-400'; rankIcon = TrendingUp; }
        else if (rate >= 11.7) { rank = 'Above Average'; rankColor = 'text-sky-600 dark:text-sky-400'; rankIcon = TrendingUp; }
        else if (rate >= 7.4) { rank = 'Average'; rankColor = 'text-amber-600 dark:text-amber-400'; rankIcon = Target; }
        else if (rate >= 4.6) { rank = 'Below Average'; rankColor = 'text-orange-600 dark:text-orange-400'; rankIcon = AlertTriangle; }
        else { rank = 'Bottom 25%'; rankColor = 'text-rose-600 dark:text-rose-400'; rankIcon = AlertTriangle; }

        const RankIcon = rankIcon;

        // Generate recommendations
        const recommendations: string[] = [];
        if (rate < 7.4) recommendations.push('Increase your 401(k)/403(b) contribution by at least 1-2% per paycheck to match the national average employee deferral rate.');
        if (rate < 11.7) recommendations.push('With employer match, aim for a combined rate of at least 12% — the average total contribution rate reported by major plan providers.');
        if (rate < 15) recommendations.push('Consider maxing out your HSA ($4,300 individual / $8,550 family for 2025) — it offers triple tax advantages.');
        if (rate < 20) recommendations.push('Target the 20% wealth-building standard by adding a Roth IRA ($7,000/yr limit) or increasing payroll deferrals.');
        if (rate >= 20 && rate < 25) recommendations.push('You\'re exceeding the 20% standard — consider taxable brokerage investing or 529 education savings to further build wealth.');
        if (rate >= 25) recommendations.push('Exceptional savings rate. Consider diversifying across asset classes and reviewing estate planning strategies.');

        return (
          <Card className="border-2 border-sky-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <Award className="h-5 w-5 text-sky-500" />
                  National Comparison & Ranking
                </CardTitle>
                <Badge className={cn('text-xs font-semibold', rankColor)} variant="outline">
                  <RankIcon className="h-3 w-3 mr-1" />
                  {rank}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Benchmark comparison bars */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Your Rate vs. National Benchmarks</h4>
                {benchmarks.map((b, i) => {
                  const isAbove = rate >= b.value;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{b.label}</span>
                        <span className="tabular-nums font-medium">{b.value}%</span>
                      </div>
                      <div className="relative h-3 bg-muted/50 rounded-full overflow-hidden">
                        {/* Benchmark line */}
                        <div className="absolute h-full bg-muted-foreground/20 rounded-full" style={{ width: `${Math.min(b.value * 4, 100)}%` }} />
                        {/* User rate */}
                        <div
                          className={cn('absolute h-full rounded-full transition-all', isAbove ? 'bg-emerald-500' : 'bg-amber-500')}
                          style={{ width: `${Math.min(rate * 4, 100)}%` }}
                        />
                        {/* Benchmark marker */}
                        <div className="absolute h-full w-0.5 bg-foreground/40" style={{ left: `${Math.min(b.value * 4, 100)}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{isAbove ? `+${(rate - b.value).toFixed(1)}% above` : `${(b.value - rate).toFixed(1)}% below`}</span>
                        <span>{b.source}</span>
                      </div>
                    </div>
                  );
                })}
                {/* Your rate label */}
                <div className="flex items-center gap-2 text-xs pt-1">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>Your Total Savings Rate: <span className="font-bold tabular-nums">{rate.toFixed(2)}%</span></span>
                  <div className="h-2.5 w-0.5 bg-foreground/40 mx-1" />
                  <span className="text-muted-foreground">Benchmark markers</span>
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-2 pt-2 border-t">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <ArrowUp className="h-4 w-4 text-sky-500" />
                  Recommendations
                </h4>
                {recommendations.map((rec, i) => (
                  <div key={i} className="flex gap-2 text-sm p-2.5 rounded-lg bg-sky-500/5 border border-sky-500/10">
                    <CheckCircle2 className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>

              {/* Quick stats row */}
              <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{rate >= 4.6 ? `+${(rate - 4.6).toFixed(1)}%` : `${(rate - 4.6).toFixed(1)}%`}</p>
                  <p className="text-[10px] text-muted-foreground">vs National Average</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-lg font-bold tabular-nums">{rate >= 11.7 ? `+${(rate - 11.7).toFixed(1)}%` : `${(rate - 11.7).toFixed(1)}%`}</p>
                  <p className="text-[10px] text-muted-foreground">vs Avg Total Rate</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className={cn('text-lg font-bold tabular-nums', rate >= 20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>{rate >= 20 ? `+${(rate - 20).toFixed(1)}%` : `${(rate - 20).toFixed(1)}%`}</p>
                  <p className="text-[10px] text-muted-foreground">vs 20% Standard</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

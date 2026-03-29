import { useState, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrency } from '@/hooks/use-currency';
import { useBudgets, useCategories, useCategoryGroups } from '@/hooks/use-finance-data';
import { cn } from '@/lib/utils';
import {
  TrendingUp, DollarSign, Target, Printer, Save, Edit3, RotateCcw,
  Milestone, Award, ArrowUpRight, Calculator, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line, BarChart, Bar, Cell,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';

const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' };

interface ContributionSchedule {
  yearStart: number;
  yearEnd: number;
  increaseType: 'fixed' | 'percent';
  value: number;
}

interface SavedPlan {
  id?: string;
  name: string;
  startingBalance: number;
  monthlyContribution: number;
  employerMonthly: number;
  hsaMonthly: number;
  horizonYears: number;
  roiPercent: number;
  schedules: ContributionSchedule[];
  oneTimeBoostYear: number;
  oneTimeBoostAmount: number;
}

const DEFAULT_SCHEDULES: ContributionSchedule[] = [
  { yearStart: 2, yearEnd: 35, increaseType: 'percent', value: 3 },
];

const MIXED_ROI_MAP: Record<number, number> = {
  1: 10, 2: 10, 3: 10, 4: 10, 5: 10,
  6: 8, 7: 8, 8: 8, 9: 8,
  10: -5, 11: -2, 12: 1,
  13: 10, 14: 10, 15: 10,
  16: 9, 17: 9, 18: 9, 19: 9, 20: 9,
  21: 7, 22: 7, 23: 7, 24: 7, 25: 7,
  26: 10, 27: 10, 28: 10, 29: 10, 30: 10,
  31: 6, 32: 6, 33: 6, 34: 6, 35: 6,
};

const MILESTONE_YEARS = [5, 10, 15, 20, 25, 30, 35];

function computeProjection(
  startingBalance: number,
  baseAnnualContrib: number,
  horizonYears: number,
  annualRoi: number,
  schedules: ContributionSchedule[],
  oneTimeBoostYear: number,
  oneTimeBoostMonthly: number,
  useMixedRoi: boolean,
  inflationRate: number,
) {
  const rows: { year: number; annualContrib: number; endBalance: number; roi: number; growth: number; realBalance: number }[] = [];
  let balance = startingBalance;
  let currentAnnual = baseAnnualContrib;
  const cumulativeInflation = (y: number) => Math.pow(1 + inflationRate / 100, y);

  for (let y = 1; y <= horizonYears; y++) {
    const sched = schedules.find(s => y >= s.yearStart && y <= s.yearEnd);
    if (y > 1) {
      const prevSched = schedules.find(s => y >= s.yearStart && y <= s.yearEnd);
      if (prevSched && prevSched.increaseType === 'percent') {
        currentAnnual = currentAnnual * (1 + prevSched.value / 100);
      } else if (prevSched && prevSched.increaseType === 'fixed') {
        currentAnnual = currentAnnual + prevSched.value;
      }
    }

    let yearContrib = currentAnnual;
    if (y === oneTimeBoostYear) {
      yearContrib += oneTimeBoostMonthly * 12;
    }

    const roi = useMixedRoi ? (MIXED_ROI_MAP[y] ?? 8) : annualRoi;
    const growth = balance * (roi / 100);
    balance = balance + yearContrib + growth;
    const realBalance = balance / cumulativeInflation(y);

    rows.push({ year: y, annualContrib: yearContrib, endBalance: balance, roi, growth, realBalance });
  }

  return rows;
}

interface InvestmentGrowthProjectorProps {
  budgetMonth: string;
}

export default function InvestmentGrowthProjector({ budgetMonth }: InvestmentGrowthProjectorProps) {
  const { formatCurrency, formatCompact } = useCurrency();
  const { data: budgets } = useBudgets(budgetMonth);
  const { data: categories } = useCategories();
  const { data: categoryGroups } = useCategoryGroups();
  const { household } = useHousehold();
  const householdId = household?.id;

  // Derive current contributions from payroll data
  const currentContribs = useMemo(() => {
    if (!budgets || !categories || !categoryGroups) return { employee: 0, employer: 0, hsa: 0, gross: 0 };

    const payrollGroupIds = new Set(
      (categoryGroups as any[]).filter((g: any) => g.expense_type === 'payroll_deduction').map((g: any) => g.id)
    );
    const incomeGroupIds = new Set(
      (categoryGroups as any[]).filter((g: any) => g.expense_type === 'income' && (g.budget_type || 'personal') === 'personal').map((g: any) => g.id)
    );

    const payrollCatIds = new Set(categories.filter(c => payrollGroupIds.has(c.group_id)).map(c => c.id));
    const incomeCatIds = new Set(categories.filter(c => incomeGroupIds.has(c.group_id)).map(c => c.id));

    // Also find HSA categories in ANY group (not just payroll_deduction)
    const HSA_PATTERN = /\bhsa\b/i;
    const allHsaCatIds = new Set(categories.filter(c => HSA_PATTERN.test(c.name)).map(c => c.id));

    let netIncome = 0;
    let totalDeductions = 0;
    let retirementTotal = 0;
    let hsaTotal = 0;

    const RETIREMENT_PATTERNS = [/tax\s*deferred|tda/i, /deferred\s*comp/i, /roth/i, /401\s*\(?k\)?/i, /403\s*\(?b\)?/i, /457\s*\(?b\)?/i, /pension/i];

    for (const b of budgets as any[]) {
      if (incomeCatIds.has(b.category_id)) {
        netIncome += b.planned_amount;
      } else if (payrollCatIds.has(b.category_id)) {
        totalDeductions += b.planned_amount;
        const cat = categories.find(c => c.id === b.category_id);
        if (cat) {
          if (HSA_PATTERN.test(cat.name)) hsaTotal += b.planned_amount;
          else if (RETIREMENT_PATTERNS.some(p => p.test(cat.name))) retirementTotal += b.planned_amount;
        }
      } else if (allHsaCatIds.has(b.category_id)) {
        // HSA found outside payroll_deduction group — still count it
        hsaTotal += b.planned_amount;
      }
    }

    const gross = netIncome + totalDeductions;
    // Employer contributes 9% of gross to retirement
    const employer = gross * 0.09;

    return { employee: retirementTotal, employer, hsa: hsaTotal, gross };
  }, [budgets, categories, categoryGroups]);

  // Plan state
  const [planName, setPlanName] = useState('My 35-Year Investment Plan');
  // National-average fallback defaults (overwritten once user's payroll data loads)
  const [startingBalance, setStartingBalance] = useState('165000');
  const [monthlyContrib, setMonthlyContrib] = useState(() =>
    currentContribs.employee > 0 ? currentContribs.employee.toFixed(0) : '575'
  );
  const [employerMonthly, setEmployerMonthly] = useState(() =>
    currentContribs.employer > 0 ? currentContribs.employer.toFixed(0) : '287'
  );
  const [hsaMonthly, setHsaMonthly] = useState(() =>
    currentContribs.hsa > 0 ? currentContribs.hsa.toFixed(0) : '150'
  );
  const [horizonYears, setHorizonYears] = useState('35');
  const [oneTimeBoostYear, setOneTimeBoostYear] = useState('0');
  const [oneTimeBoostAmount, setOneTimeBoostAmount] = useState('0');
  const [inflationRate, setInflationRate] = useState('3');
  const [taxRate, setTaxRate] = useState('22');
  const [ssMonthlyBenefit, setSsMonthlyBenefit] = useState('2200');
  const [schedules, setSchedules] = useState<ContributionSchedule[]>(DEFAULT_SCHEDULES);
  const [isEditing, setIsEditing] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState('all');
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Update from payroll when data loads
  useMemo(() => {
    if (currentContribs.employee > 0) {
      setMonthlyContrib(currentContribs.employee.toFixed(0));
      setEmployerMonthly(currentContribs.employer.toFixed(0));
      setHsaMonthly(currentContribs.hsa.toFixed(0));
    }
  }, [currentContribs]);

  const baseAnnual = useMemo(() => {
    const emp = parseFloat(monthlyContrib) || 0;
    const er = parseFloat(employerMonthly) || 0;
    const hsa = parseFloat(hsaMonthly) || 0;
    return (emp + er + hsa) * 12;
  }, [monthlyContrib, employerMonthly, hsaMonthly]);

  const horizon = parseInt(horizonYears) || 35;
  const start = parseFloat(startingBalance) || 0;
  const boostYear = parseInt(oneTimeBoostYear) || 0;
  const boostAmt = parseFloat(oneTimeBoostAmount) || 0;
  const inflation = parseFloat(inflationRate) || 3;
  const tax = parseFloat(taxRate) || 22;
  const ssMonthly = parseFloat(ssMonthlyBenefit) || 0;

  // Compute all scenarios
  const scenarios = useMemo(() => ({
    '8%': computeProjection(start, baseAnnual, horizon, 8, schedules, boostYear, boostAmt, false, inflation),
    '10%': computeProjection(start, baseAnnual, horizon, 10, schedules, boostYear, boostAmt, false, inflation),
    '12%': computeProjection(start, baseAnnual, horizon, 12, schedules, boostYear, boostAmt, false, inflation),
    'Mixed': computeProjection(start, baseAnnual, horizon, 0, schedules, boostYear, boostAmt, true, inflation),
  }), [start, baseAnnual, horizon, schedules, boostYear, boostAmt, inflation]);

  // Chart data
  const chartData = useMemo(() => {
    return Array.from({ length: horizon }, (_, i) => ({
      year: i + 1,
      '8% ROI': scenarios['8%'][i]?.endBalance || 0,
      '10% ROI': scenarios['10%'][i]?.endBalance || 0,
      '12% ROI': scenarios['12%'][i]?.endBalance || 0,
      'Mixed ROI': scenarios['Mixed'][i]?.endBalance || 0,
    }));
  }, [scenarios, horizon]);

  // Milestones
  const milestones = useMemo(() => {
    return MILESTONE_YEARS.filter(y => y <= horizon).map(y => ({
      year: y,
      '8%': scenarios['8%'][y - 1]?.endBalance || 0,
      '10%': scenarios['10%'][y - 1]?.endBalance || 0,
      '12%': scenarios['12%'][y - 1]?.endBalance || 0,
      'Mixed': scenarios['Mixed'][y - 1]?.endBalance || 0,
    }));
  }, [scenarios, horizon]);

  const updateSchedule = (index: number, field: keyof ContributionSchedule, value: string | number) => {
    setSchedules(prev => prev.map((s, i) => i === index ? { ...s, [field]: typeof value === 'string' ? parseFloat(value) || 0 : value } : s));
  };

  const addSchedule = () => {
    const last = schedules[schedules.length - 1];
    setSchedules(prev => [...prev, {
      yearStart: (last?.yearEnd || 0) + 1,
      yearEnd: (last?.yearEnd || 0) + 5,
      increaseType: 'percent',
      value: 5,
    }]);
  };

  const removeSchedule = (index: number) => {
    setSchedules(prev => prev.filter((_, i) => i !== index));
  };

  // Save plan
  const handleSave = useCallback(async () => {
    if (!householdId) { toast.error('No household found'); return; }
    setIsSaving(true);
    try {
      const planData = {
        calculator_type: 'investment_growth',
        household_id: householdId,
        label: planName,
        inputs: {
          startingBalance: start,
          monthlyContribution: parseFloat(monthlyContrib) || 0,
          employerMonthly: parseFloat(employerMonthly) || 0,
          hsaMonthly: parseFloat(hsaMonthly) || 0,
          horizonYears: horizon,
          oneTimeBoostYear: boostYear,
          oneTimeBoostAmount: boostAmt,
          schedules,
        } as any,
        results: {
          finalValues: {
            '8%': scenarios['8%'][horizon - 1]?.endBalance || 0,
            '10%': scenarios['10%'][horizon - 1]?.endBalance || 0,
            '12%': scenarios['12%'][horizon - 1]?.endBalance || 0,
            'Mixed': scenarios['Mixed'][horizon - 1]?.endBalance || 0,
          },
        } as any,
      };

      if (savedPlanId) {
        const { error } = await supabase.from('calculator_snapshots').update(planData).eq('id', savedPlanId);
        if (error) throw error;
        toast.success('Plan updated!');
      } else {
        const { data, error } = await supabase.from('calculator_snapshots').insert(planData).select('id').single();
        if (error) throw error;
        setSavedPlanId(data.id);
        toast.success('Plan saved!');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [householdId, planName, start, monthlyContrib, employerMonthly, hsaMonthly, horizon, boostYear, boostAmt, schedules, scenarios, savedPlanId]);

  // Print
  const handlePrint = () => {
    window.print();
  };

  const finalValues = {
    '8%': scenarios['8%'][horizon - 1]?.endBalance || 0,
    '10%': scenarios['10%'][horizon - 1]?.endBalance || 0,
    '12%': scenarios['12%'][horizon - 1]?.endBalance || 0,
    'Mixed': scenarios['Mixed'][horizon - 1]?.endBalance || 0,
  };

  const scenarioColors = {
    '8%': 'hsl(199, 89%, 48%)',
    '10%': 'hsl(160, 84%, 39%)',
    '12%': 'hsl(262, 83%, 58%)',
    'Mixed': 'hsl(36, 100%, 57%)',
  };

  return (
    <div ref={printRef} className="space-y-6 print:space-y-4">
      {/* Header */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                {isEditing ? (
                  <Input value={planName} onChange={e => setPlanName(e.target.value)} className="h-8 text-lg font-bold w-64" />
                ) : (
                  <CardTitle className="font-display text-lg">{planName}</CardTitle>
                )}
                <p className="text-xs text-muted-foreground">Compound growth projections across multiple ROI scenarios</p>
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                <Edit3 className="h-3.5 w-3.5 mr-1" />
                {isEditing ? 'Done' : 'Edit'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="h-3.5 w-3.5 mr-1" />
                {isSaving ? 'Saving...' : savedPlanId ? 'Update' : 'Save'}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-3.5 w-3.5 mr-1" />
                Print
              </Button>
            </div>
          </div>
        </CardHeader>
        {isEditing && (
          <CardContent className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Starting Balance</label>
                <Input value={startingBalance} onChange={e => setStartingBalance(e.target.value)} type="number" className="h-8 mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Employee Monthly</label>
                <Input value={monthlyContrib} onChange={e => setMonthlyContrib(e.target.value)} type="number" className="h-8 mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Employer Monthly</label>
                <Input value={employerMonthly} onChange={e => setEmployerMonthly(e.target.value)} type="number" className="h-8 mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">HSA Monthly</label>
                <Input value={hsaMonthly} onChange={e => setHsaMonthly(e.target.value)} type="number" className="h-8 mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Years</label>
                <Input value={horizonYears} onChange={e => setHorizonYears(e.target.value)} type="number" className="h-8 mt-1" min="5" max="50" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Total Annual</label>
                <p className="text-sm font-bold mt-2 tabular-nums">{formatCurrency(baseAnnual)}/yr</p>
              </div>
            </div>

            {/* Inflation, Tax, Social Security */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Inflation Rate %</label>
                <Input value={inflationRate} onChange={e => setInflationRate(e.target.value)} type="number" className="h-8 mt-1" step="0.5" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tax Rate in Retirement %</label>
                <Input value={taxRate} onChange={e => setTaxRate(e.target.value)} type="number" className="h-8 mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Est. SS Monthly Benefit</label>
                <Input value={ssMonthlyBenefit} onChange={e => setSsMonthlyBenefit(e.target.value)} type="number" className="h-8 mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">SS Annual (Today's $)</label>
                <p className="text-sm font-bold mt-2 tabular-nums">{formatCurrency(ssMonthly * 12)}/yr</p>
              </div>
            </div>

            {/* One-time boost */}
            <div className="flex items-end gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <div>
                <label className="text-xs font-medium text-muted-foreground">One-Time Monthly Boost</label>
                <Input value={oneTimeBoostAmount} onChange={e => setOneTimeBoostAmount(e.target.value)} type="number" className="h-8 mt-1 w-28" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">In Year</label>
                <Input value={oneTimeBoostYear} onChange={e => setOneTimeBoostYear(e.target.value)} type="number" className="h-8 mt-1 w-20" min="1" max={horizonYears} />
              </div>
              <p className="text-xs text-muted-foreground pb-1">+{formatCurrency(boostAmt * 12)}/yr added in Year {boostYear} (e.g., debt payoff freed up)</p>
            </div>

            {/* Contribution increase schedule */}
            <div>
              <button onClick={() => setShowSchedule(!showSchedule)} className="flex items-center gap-1 text-sm font-semibold text-primary">
                {showSchedule ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Contribution Increase Schedule ({schedules.length} brackets)
              </button>
              {showSchedule && (
                <div className="mt-2 space-y-2">
                  {schedules.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-12">Years</span>
                      <Input value={s.yearStart} onChange={e => updateSchedule(i, 'yearStart', e.target.value)} type="number" className="h-7 w-16" />
                      <span className="text-muted-foreground">to</span>
                      <Input value={s.yearEnd} onChange={e => updateSchedule(i, 'yearEnd', e.target.value)} type="number" className="h-7 w-16" />
                      <Select value={s.increaseType} onValueChange={v => updateSchedule(i, 'increaseType', v as any)}>
                        <SelectTrigger className="h-7 w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">% / year</SelectItem>
                          <SelectItem value="fixed">$ / year</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input value={s.value} onChange={e => updateSchedule(i, 'value', e.target.value)} type="number" className="h-7 w-20" />
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeSchedule(i)}>×</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addSchedule}>+ Add Bracket</Button>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(finalValues).map(([label, value]) => (
          <Card key={label} className="border-l-4" style={{ borderLeftColor: scenarioColors[label as keyof typeof scenarioColors] }}>
            <CardContent className="p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label} ROI — Year {horizon}</p>
              <p className="text-lg font-bold tabular-nums mt-1">{formatCompact(value)}</p>
              <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Current Contributions Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Current Monthly Contributions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">Employee</p>
              <p className="text-base font-bold tabular-nums">{formatCurrency(parseFloat(monthlyContrib) || 0)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">Employer Match</p>
              <p className="text-base font-bold tabular-nums">{formatCurrency(parseFloat(employerMonthly) || 0)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">HSA</p>
              <p className="text-base font-bold tabular-nums">{formatCurrency(parseFloat(hsaMonthly) || 0)}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
              <p className="text-xs text-muted-foreground">Total Monthly</p>
              <p className="text-base font-bold tabular-nums">{formatCurrency((parseFloat(monthlyContrib) || 0) + (parseFloat(employerMonthly) || 0) + (parseFloat(hsaMonthly) || 0))}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-center">
              <p className="text-xs text-muted-foreground">Total Annual</p>
              <p className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(baseAnnual)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Growth Chart */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Portfolio Growth Over {horizon} Years
            </CardTitle>
            <Select value={selectedScenario} onValueChange={setSelectedScenario}>
              <SelectTrigger className="w-36 h-8 print:hidden"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scenarios</SelectItem>
                <SelectItem value="8%">8% ROI</SelectItem>
                <SelectItem value="10%">10% ROI</SelectItem>
                <SelectItem value="12%">12% ROI</SelectItem>
                <SelectItem value="Mixed">Mixed ROI</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Year', position: 'insideBottom', offset: -5, fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v: number) => `$${(v / 1e6).toFixed(1)}M`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} labelFormatter={(l: number) => `Year ${l}`} />
              <Legend iconType="circle" iconSize={8} />
              {(selectedScenario === 'all' || selectedScenario === '8%') && (
                <Area type="monotone" dataKey="8% ROI" stroke={scenarioColors['8%']} fill={scenarioColors['8%']} fillOpacity={0.1} strokeWidth={2} />
              )}
              {(selectedScenario === 'all' || selectedScenario === '10%') && (
                <Area type="monotone" dataKey="10% ROI" stroke={scenarioColors['10%']} fill={scenarioColors['10%']} fillOpacity={0.1} strokeWidth={2} />
              )}
              {(selectedScenario === 'all' || selectedScenario === '12%') && (
                <Area type="monotone" dataKey="12% ROI" stroke={scenarioColors['12%']} fill={scenarioColors['12%']} fillOpacity={0.1} strokeWidth={2} />
              )}
              {(selectedScenario === 'all' || selectedScenario === 'Mixed') && (
                <Area type="monotone" dataKey="Mixed ROI" stroke={scenarioColors['Mixed']} fill={scenarioColors['Mixed']} fillOpacity={0.1} strokeWidth={2} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Key Milestones */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Milestone className="h-4 w-4 text-amber-500" />
            Key Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead className="text-right">8% ROI</TableHead>
                <TableHead className="text-right">10% ROI</TableHead>
                <TableHead className="text-right">12% ROI</TableHead>
                <TableHead className="text-right">Mixed ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {milestones.map(m => (
                <TableRow key={m.year}>
                  <TableCell className="font-semibold">Year {m.year}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(m['8%'])}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(m['10%'])}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(m['12%'])}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(m['Mixed'])}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Year-by-Year Tables */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Year-by-Year Projection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="8%">
            <TabsList className="print:hidden">
              <TabsTrigger value="8%">8% ROI</TabsTrigger>
              <TabsTrigger value="10%">10% ROI</TabsTrigger>
              <TabsTrigger value="12%">12% ROI</TabsTrigger>
              <TabsTrigger value="Mixed">Mixed ROI</TabsTrigger>
            </TabsList>
            {Object.entries(scenarios).map(([label, rows]) => (
              <TabsContent key={label} value={label}>
                <div className="max-h-[500px] overflow-y-auto print:max-h-none">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead>
                        <TableHead className="text-right">Annual Contribution</TableHead>
                        <TableHead className="text-right">ROI</TableHead>
                        <TableHead className="text-right">Growth</TableHead>
                        <TableHead className="text-right">End of Year Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map(r => {
                        const isMilestone = MILESTONE_YEARS.includes(r.year);
                        return (
                          <TableRow key={r.year} className={cn(isMilestone && 'bg-primary/5 font-semibold')}>
                            <TableCell>{r.year}{isMilestone && <Milestone className="h-3 w-3 inline ml-1 text-amber-500" />}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatCurrency(r.annualContrib)}</TableCell>
                            <TableCell className="text-right tabular-nums">{r.roi}%</TableCell>
                            <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(r.growth)}</TableCell>
                            <TableCell className="text-right tabular-nums font-medium">{formatCurrency(r.endBalance)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Contribution Increase Schedule Visual */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            Contribution Increase Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {boostYear > 0 && boostAmt > 0 && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" variant="outline">Year {boostYear}</Badge>
                <span className="text-sm">One-time monthly increase: <span className="font-bold tabular-nums">+{formatCurrency(boostAmt)}/mo</span> ({formatCurrency(boostAmt * 12)}/yr)</span>
              </div>
            )}
            {schedules.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                <Badge variant="outline" className="text-xs">Years {s.yearStart}–{s.yearEnd}</Badge>
                <span className="text-sm">
                  {s.increaseType === 'percent' ? `${s.value}% annual increase` : `+${formatCurrency(s.value)}/yr increase`}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strategic Insights */}
      <Card className="border-2 border-emerald-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald-500" />
            Strategic Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground">ROI Impact (8% → 12%)</p>
              <p className="text-lg font-bold tabular-nums text-primary mt-1">+{formatCompact(finalValues['12%'] - finalValues['8%'])}</p>
              <p className="text-xs text-muted-foreground">A 4% ROI difference creates {formatCurrency(finalValues['12%'] - finalValues['8%'])} in additional wealth</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground">Total Contributions Over {horizon} Years</p>
              <p className="text-lg font-bold tabular-nums mt-1">{formatCompact(scenarios['8%'].reduce((s, r) => s + r.annualContrib, 0))}</p>
              <p className="text-xs text-muted-foreground">Including scheduled increases and one-time boost</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground">Compound Growth Multiplier (10%)</p>
              <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                {(finalValues['10%'] / (scenarios['10%'].reduce((s, r) => s + r.annualContrib, 0) + start)).toFixed(1)}x
              </p>
              <p className="text-xs text-muted-foreground">Your money works harder over time</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-xs font-medium text-muted-foreground">Financial Freedom Target</p>
              <p className="text-lg font-bold tabular-nums mt-1">
                {(() => {
                  const annualExpense = (parseFloat(monthlyContrib) || 1164) * 12 * 3; // rough annual living expense ~3x contributions
                  const target = annualExpense * 25; // 4% rule
                  const yearReached = scenarios['10%'].findIndex(r => r.endBalance >= target);
                  return yearReached >= 0 ? `Year ${yearReached + 1}` : `>${horizon} years`;
                })()}
              </p>
              <p className="text-xs text-muted-foreground">When portfolio supports 4% withdrawal rate (25x annual expenses at 10% ROI)</p>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 text-sm">
            <p className="font-semibold mb-1">📌 Key Takeaways</p>
            <ul className="space-y-1 text-muted-foreground list-disc list-inside">
              <li>Consistent contributions + compound growth = exponential wealth over {horizon} years</li>
              <li>The {formatCurrency(boostAmt)}/mo boost in Year {boostYear} (from debt payoff) accelerates growth significantly</li>
              <li>Scheduled contribution increases mirror career salary growth and maintain discipline</li>
              <li>Even conservative 8% ROI projects to <span className="font-semibold text-foreground">{formatCompact(finalValues['8%'])}</span> — stay the course through market cycles</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

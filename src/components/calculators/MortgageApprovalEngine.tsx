import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Home, Shield, TrendingUp, AlertTriangle, CheckCircle2, Sparkles, User, CreditCard,
  Briefcase, Wallet, Building2, Info, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';

// ============================================================================
// Utilities
// ============================================================================
const num = (v: string | number, fallback = 0): number => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

function monthlyPI(principal: number, annualRatePct: number, years: number): number {
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / Math.max(n, 1);
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function pmiRate(ltv: number): number {
  // Rough conventional PMI table (annual %)
  if (ltv <= 80) return 0;
  if (ltv <= 85) return 0.55;
  if (ltv <= 90) return 0.75;
  if (ltv <= 95) return 0.95;
  return 1.15;
}

function creditGrade(score: number): { grade: string; tier: string; risk: string; color: string } {
  if (score >= 780) return { grade: 'A+', tier: 'Exceptional', risk: 'Very Low', color: 'text-emerald-500' };
  if (score >= 740) return { grade: 'A',  tier: 'Excellent',    risk: 'Low',       color: 'text-emerald-500' };
  if (score >= 700) return { grade: 'B+', tier: 'Very Good',    risk: 'Low',       color: 'text-prism-teal' };
  if (score >= 660) return { grade: 'B',  tier: 'Good',         risk: 'Moderate',  color: 'text-prism-teal' };
  if (score >= 620) return { grade: 'C',  tier: 'Fair',         risk: 'Elevated',  color: 'text-prism-amber' };
  if (score >= 580) return { grade: 'D',  tier: 'Subprime',     risk: 'High',      color: 'text-prism-amber' };
  return { grade: 'F', tier: 'Deep Subprime', risk: 'Very High', color: 'text-prism-rose' };
}

function dtiBand(pct: number): { label: string; color: string } {
  if (pct <= 28) return { label: 'Excellent', color: 'text-emerald-500' };
  if (pct <= 36) return { label: 'Good', color: 'text-prism-teal' };
  if (pct <= 43) return { label: 'Acceptable', color: 'text-prism-amber' };
  if (pct <= 50) return { label: 'High Risk', color: 'text-orange-500' };
  return { label: 'Decline Zone', color: 'text-prism-rose' };
}

// ============================================================================
// Component
// ============================================================================
export default function MortgageApprovalEngine() {
  const { formatCurrency } = useCurrency();

  // ---- Borrower ----
  const [borrowerName, setBorrowerName] = useState('');
  const [coBorrower, setCoBorrower] = useState('');
  const [state, setState] = useState('');
  const [employmentType, setEmploymentType] = useState('W-2');
  const [yearsWithEmployer, setYearsWithEmployer] = useState('3');
  const [monthlyGross, setMonthlyGross] = useState('8500');
  const [otherIncome, setOtherIncome] = useState('0');

  // ---- Credit ----
  const [experian, setExperian] = useState('720');
  const [equifax, setEquifax] = useState('715');
  const [transunion, setTransunion] = useState('725');
  const [utilization, setUtilization] = useState('25');
  const [lateInLast12, setLateInLast12] = useState('0');
  const [bankruptcy, setBankruptcy] = useState('no');

  // ---- Debts ----
  const [autoLoan, setAutoLoan] = useState('450');
  const [studentLoan, setStudentLoan] = useState('250');
  const [creditCardMin, setCreditCardMin] = useState('180');
  const [personalLoan, setPersonalLoan] = useState('0');
  const [otherDebt, setOtherDebt] = useState('0');

  // ---- Housing / Property ----
  const [purchasePrice, setPurchasePrice] = useState('425000');
  const [downPaymentPct, setDownPaymentPct] = useState([10]);
  const [interestRate, setInterestRate] = useState('6.75');
  const [loanYears, setLoanYears] = useState('30');
  const [propertyTaxAnnual, setPropertyTaxAnnual] = useState('5100');
  const [insuranceAnnual, setInsuranceAnnual] = useState('1600');
  const [hoaMonthly, setHoaMonthly] = useState('0');
  const [propertyType, setPropertyType] = useState('single_family');
  const [occupancy, setOccupancy] = useState('primary');

  // ---- Reserves ----
  const [liquidAssets, setLiquidAssets] = useState('35000');
  const [retirementAssets, setRetirementAssets] = useState('80000');
  const [closingCostsPct, setClosingCostsPct] = useState('3');

  // ---- AI ----
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    decision?: string; confidence?: number; summary?: string;
    strengths?: string[]; concerns?: string[]; improvements?: string[];
    best_loan_product?: string; should_wait?: boolean; wait_reason?: string;
  } | null>(null);

  // ==========================================================================
  // Derived calculations (fully reactive What-If)
  // ==========================================================================
  const calc = useMemo(() => {
    const price = num(purchasePrice);
    const dpPct = downPaymentPct[0] ?? 10;
    const dp = price * (dpPct / 100);
    const loan = Math.max(price - dp, 0);
    const rate = num(interestRate);
    const years = num(loanYears, 30);
    const ltv = price > 0 ? (loan / price) * 100 : 0;

    const pi = monthlyPI(loan, rate, years);
    const tax = num(propertyTaxAnnual) / 12;
    const ins = num(insuranceAnnual) / 12;
    const pmi = ltv > 80 ? (loan * pmiRate(ltv) / 100) / 12 : 0;
    const hoa = num(hoaMonthly);
    const piti = pi + tax + ins + pmi + hoa;

    // Income
    const grossIncome = num(monthlyGross) + num(otherIncome);
    const totalDebts = num(autoLoan) + num(studentLoan) + num(creditCardMin) + num(personalLoan) + num(otherDebt);

    // DTI
    const frontDti = grossIncome > 0 ? (piti / grossIncome) * 100 : 0;
    const backDti  = grossIncome > 0 ? ((piti + totalDebts) / grossIncome) * 100 : 0;

    // Credit
    const scores = [num(experian), num(equifax), num(transunion)].filter(s => s > 0).sort((a, b) => a - b);
    const middleScore = scores.length === 3 ? scores[1] : scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const grade = creditGrade(middleScore);

    // Reserves
    const closingCosts = price * (num(closingCostsPct) / 100);
    const cashAfterClose = num(liquidAssets) - dp - closingCosts;
    const reserveMonths = piti > 0 ? Math.max(cashAfterClose, 0) / piti : 0;

    // Affordability engine — target back-end DTI thresholds
    const affordAt = (targetDti: number): number => {
      const roomForHousing = Math.max(grossIncome * (targetDti / 100) - totalDebts, 0);
      const nonPI = tax + ins + pmi + hoa;
      const piBudget = Math.max(roomForHousing - nonPI, 0);
      // Invert amortization to solve for principal
      const r = rate / 100 / 12;
      const n = years * 12;
      const principalBudget = r === 0 ? piBudget * n : piBudget * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
      return principalBudget / (1 - dpPct / 100); // back to price
    };

    const conservativePrice = affordAt(28);
    const recommendedPrice = affordAt(36);
    const maxPrice = affordAt(43);
    const stretchPrice = affordAt(45);

    // ---- Prism Mortgage Score (0-100 weighted) ----
    const scoreCredit = middleScore >= 780 ? 100 : middleScore >= 740 ? 90 : middleScore >= 700 ? 78 : middleScore >= 660 ? 62 : middleScore >= 620 ? 45 : middleScore >= 580 ? 28 : 12;
    const scoreCashFlow = grossIncome > 0 ? Math.max(0, Math.min(100, ((grossIncome - piti - totalDebts) / grossIncome) * 200)) : 0;
    const scoreDti = backDti <= 28 ? 100 : backDti <= 36 ? 88 : backDti <= 43 ? 70 : backDti <= 50 ? 42 : 15;
    const scoreReserves = reserveMonths >= 12 ? 100 : reserveMonths >= 6 ? 82 : reserveMonths >= 3 ? 60 : reserveMonths >= 1 ? 35 : 10;
    const scoreEmployment = employmentType === 'W-2' && num(yearsWithEmployer) >= 2 ? 100
      : employmentType === 'W-2' ? 70
      : employmentType === 'Self-employed' && num(yearsWithEmployer) >= 2 ? 75
      : employmentType === 'Retired' || employmentType === 'Pension' || employmentType === 'Social Security' ? 80
      : 55;
    const scoreAffordability = grossIncome > 0 ? Math.max(0, Math.min(100, 100 - (frontDti - 28) * 3)) : 0;
    const scoreDownPayment = dpPct >= 20 ? 100 : dpPct >= 10 ? 75 : dpPct >= 5 ? 55 : dpPct >= 3 ? 35 : 15;
    const scoreLtv = ltv <= 80 ? 100 : ltv <= 90 ? 75 : ltv <= 95 ? 55 : 35;
    const scoreRetirement = num(retirementAssets) >= grossIncome * 12 ? 100 : num(retirementAssets) >= grossIncome * 6 ? 70 : num(retirementAssets) > 0 ? 45 : 20;
    const scoreAcceleration = dpPct >= 20 && backDti <= 36 ? 90 : dpPct >= 10 ? 65 : 45;

    const prismScore = Math.round(
      scoreCredit * 0.20 +
      scoreCashFlow * 0.15 +
      scoreDti * 0.15 +
      scoreReserves * 0.10 +
      scoreEmployment * 0.10 +
      scoreAffordability * 0.10 +
      scoreDownPayment * 0.10 +
      scoreLtv * 0.05 +
      scoreRetirement * 0.05 +
      scoreAcceleration * 0.05
    );

    // ---- Risk Score (0-100, higher = riskier) ----
    const riskScore = Math.round(Math.max(0, Math.min(100, 100 - prismScore + (num(lateInLast12) * 4) + (bankruptcy === 'yes' ? 15 : 0))));

    // ---- Approval Simulator ----
    const reasons: string[] = [];
    let decision: 'Approved' | 'Approved with Conditions' | 'Manual Underwriting' | 'High Risk' | 'Likely Declined' = 'Approved';

    if (middleScore < 580) { decision = 'Likely Declined'; reasons.push(`Credit score ${middleScore} below typical program floor`); }
    else if (middleScore < 620) { decision = 'High Risk'; reasons.push(`Credit score ${middleScore} limits program options`); }
    else if (middleScore < 660) { decision = 'Manual Underwriting'; reasons.push(`Credit score ${middleScore} requires manual review`); }

    if (backDti > 50) { decision = 'Likely Declined'; reasons.push(`Back-end DTI ${backDti.toFixed(1)}% exceeds typical maximum`); }
    else if (backDti > 43) { if (decision === 'Approved') decision = 'Approved with Conditions'; reasons.push(`Back-end DTI ${backDti.toFixed(1)}% above conforming target`); }

    if (frontDti > 31) { if (decision === 'Approved') decision = 'Approved with Conditions'; reasons.push(`Front-end DTI ${frontDti.toFixed(1)}% elevated`); }
    if (reserveMonths < 2) { if (decision === 'Approved') decision = 'Approved with Conditions'; reasons.push(`Only ${reserveMonths.toFixed(1)} months reserves after closing`); }
    if (ltv > 97) { decision = decision === 'Approved' ? 'Approved with Conditions' : decision; reasons.push(`LTV ${ltv.toFixed(1)}% above conventional cap`); }
    if (bankruptcy === 'yes') { if (decision === 'Approved') decision = 'Manual Underwriting'; reasons.push('Prior bankruptcy on record'); }
    if (num(lateInLast12) >= 2) { if (decision === 'Approved') decision = 'Manual Underwriting'; reasons.push(`${lateInLast12} late payments in last 12 months`); }
    if (employmentType === 'Self-employed' && num(yearsWithEmployer) < 2) { if (decision === 'Approved') decision = 'Manual Underwriting'; reasons.push('Self-employment history under 2 years'); }

    // ---- Loan Comparison ----
    const loanScenarios = [
      { name: '30-Year Fixed',    rate: rate,        years: 30 },
      { name: '20-Year Fixed',    rate: rate - 0.25, years: 20 },
      { name: '15-Year Fixed',    rate: rate - 0.5,  years: 15 },
      { name: '10-Year Fixed',    rate: rate - 0.75, years: 10 },
      { name: 'FHA 30-Year',      rate: rate - 0.375, years: 30 },
      { name: 'VA 30-Year',       rate: rate - 0.5,   years: 30 },
    ].map(s => {
      const p = monthlyPI(loan, Math.max(s.rate, 0.5), s.years);
      const totalInt = p * s.years * 12 - loan;
      return { ...s, payment: p, totalInterest: totalInt, totalCost: p * s.years * 12 };
    });

    // ---- HELOC quick engine ----
    const helocLine = Math.max((price * 0.85) - loan, 0); // 85% CLTV cap
    const helocRate = rate + 1.5;
    const helocInterestOnly = (helocLine * helocRate / 100) / 12;

    // ---- Improvement recommendations (top 5) ----
    const improvements: { title: string; impact: string; weight: number }[] = [];
    if (backDti > 36) improvements.push({ title: 'Reduce monthly debts', impact: `Cut ${formatCurrency(Math.max(0, (backDti - 36) / 100 * grossIncome))} to reach 36% back-end DTI`, weight: 10 });
    if (middleScore < 740) improvements.push({ title: 'Raise credit score to 740+', impact: `Could lower rate ~0.25–0.5%`, weight: 9 });
    if (dpPct < 20) improvements.push({ title: 'Increase down payment to 20%', impact: `Removes PMI (~${formatCurrency(pmi)}/mo)`, weight: 8 });
    if (reserveMonths < 6) improvements.push({ title: 'Build reserves to 6+ months', impact: `Strengthens underwriting`, weight: 7 });
    if (num(utilization) > 30) improvements.push({ title: 'Lower credit utilization below 30%', impact: `Fast credit-score lift`, weight: 6 });
    if (num(creditCardMin) > 100) improvements.push({ title: 'Pay off revolving cards', impact: `Frees ${formatCurrency(num(creditCardMin))}/mo of DTI capacity`, weight: 5 });
    if (num(yearsWithEmployer) < 2) improvements.push({ title: 'Establish 2-year employment history', impact: `Improves stability score`, weight: 4 });
    improvements.sort((a, b) => b.weight - a.weight);

    return {
      price, dp, loan, ltv, pi, tax, ins, pmi, hoa, piti,
      grossIncome, totalDebts, frontDti, backDti,
      middleScore, grade,
      cashAfterClose, reserveMonths, closingCosts,
      conservativePrice, recommendedPrice, maxPrice, stretchPrice,
      prismScore, riskScore, decision, reasons,
      loanScenarios, helocLine, helocRate, helocInterestOnly,
      improvements: improvements.slice(0, 5),
    };
  }, [
    purchasePrice, downPaymentPct, interestRate, loanYears, propertyTaxAnnual, insuranceAnnual, hoaMonthly,
    monthlyGross, otherIncome, autoLoan, studentLoan, creditCardMin, personalLoan, otherDebt,
    experian, equifax, transunion, utilization, lateInLast12, bankruptcy,
    liquidAssets, retirementAssets, closingCostsPct, employmentType, yearsWithEmployer,
    formatCurrency,
  ]);

  // ==========================================================================
  // AI Underwriter
  // ==========================================================================
  const runAiUnderwriter = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('mortgage-underwriter', {
        body: {
          profile: {
            borrower: { name: borrowerName, coBorrower, state, employmentType, yearsWithEmployer: num(yearsWithEmployer) },
            income: { monthlyGross: num(monthlyGross), otherIncome: num(otherIncome) },
            credit: { middleScore: calc.middleScore, grade: calc.grade.grade, utilization: num(utilization), lateInLast12: num(lateInLast12), bankruptcy },
            debts: { autoLoan: num(autoLoan), studentLoan: num(studentLoan), creditCardMin: num(creditCardMin), personalLoan: num(personalLoan), otherDebt: num(otherDebt), totalMonthly: calc.totalDebts },
            property: { purchasePrice: calc.price, propertyType, occupancy, propertyTaxAnnual: num(propertyTaxAnnual), insuranceAnnual: num(insuranceAnnual), hoaMonthly: num(hoaMonthly) },
            loan: { downPaymentPct: downPaymentPct[0], loanAmount: calc.loan, interestRate: num(interestRate), termYears: num(loanYears), ltv: calc.ltv, pmi: calc.pmi, piti: calc.piti },
            ratios: { frontDti: calc.frontDti, backDti: calc.backDti },
            reserves: { liquidAssets: num(liquidAssets), retirementAssets: num(retirementAssets), cashAfterClose: calc.cashAfterClose, reserveMonths: calc.reserveMonths },
            prismScore: calc.prismScore, riskScore: calc.riskScore,
            ruleBasedDecision: calc.decision, ruleBasedReasons: calc.reasons,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiResult(data?.result ?? null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'AI underwriter unavailable';
      toast.error(msg);
    } finally {
      setAiLoading(false);
    }
  };

  const decisionColor = (d: string) => {
    if (d === 'Approved') return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
    if (d === 'Approved with Conditions') return 'bg-prism-teal/15 text-prism-teal border-prism-teal/30';
    if (d === 'Manual Underwriting') return 'bg-prism-amber/15 text-prism-amber border-prism-amber/30';
    if (d === 'High Risk') return 'bg-orange-500/15 text-orange-500 border-orange-500/30';
    return 'bg-prism-rose/15 text-prism-rose border-prism-rose/30';
  };

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-br from-prism-teal/10 via-prism-violet/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="p-3 rounded-lg bg-prism-teal/15">
              <Home className="w-6 h-6 text-prism-teal" />
            </div>
            <div className="flex-1 min-w-[240px]">
              <h2 className="text-xl font-semibold">Mortgage Approval Intelligence Engine</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Simulates real bank and credit-union underwriting. Understand <strong>why</strong> you'd be approved,
                denied, or approved with conditions — and how to strengthen your profile.
              </p>
            </div>
            <Button size="sm" onClick={runAiUnderwriter} disabled={aiLoading} className="gap-2">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              AI Underwriter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Decision Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={cn('border-2', decisionColor(calc.decision))}>
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-wide opacity-75">Approval Decision</div>
            <div className="text-lg font-semibold mt-1">{calc.decision}</div>
            <div className="text-xs mt-2 opacity-75">Prism Score {calc.prismScore}/100</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Front-End DTI</div>
            <div className={cn('text-2xl font-semibold mt-1', dtiBand(calc.frontDti).color)}>{calc.frontDti.toFixed(1)}%</div>
            <div className="text-xs mt-2 text-muted-foreground">{dtiBand(calc.frontDti).label} · target ≤28%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Back-End DTI</div>
            <div className={cn('text-2xl font-semibold mt-1', dtiBand(calc.backDti).color)}>{calc.backDti.toFixed(1)}%</div>
            <div className="text-xs mt-2 text-muted-foreground">{dtiBand(calc.backDti).label} · target ≤36%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Monthly PITI</div>
            <div className="text-2xl font-semibold mt-1">{formatCurrency(calc.piti)}</div>
            <div className="text-xs mt-2 text-muted-foreground">LTV {calc.ltv.toFixed(1)}% · Reserves {calc.reserveMonths.toFixed(1)}mo</div>
          </CardContent>
        </Card>
      </div>

      {/* Inputs */}
      <Tabs defaultValue="borrower" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="borrower" className="gap-1.5"><User className="w-3.5 h-3.5" />Borrower</TabsTrigger>
          <TabsTrigger value="credit" className="gap-1.5"><CreditCard className="w-3.5 h-3.5" />Credit</TabsTrigger>
          <TabsTrigger value="income" className="gap-1.5"><Briefcase className="w-3.5 h-3.5" />Income & Debt</TabsTrigger>
          <TabsTrigger value="property" className="gap-1.5"><Building2 className="w-3.5 h-3.5" />Property & Loan</TabsTrigger>
          <TabsTrigger value="reserves" className="gap-1.5"><Wallet className="w-3.5 h-3.5" />Reserves</TabsTrigger>
        </TabsList>

        <TabsContent value="borrower">
          <Card>
            <CardHeader><CardTitle className="text-base">Borrower Profile</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Borrower name"><Input value={borrowerName} onChange={e => setBorrowerName(e.target.value)} maxLength={100} /></Field>
              <Field label="Co-borrower"><Input value={coBorrower} onChange={e => setCoBorrower(e.target.value)} maxLength={100} /></Field>
              <Field label="State"><Input value={state} onChange={e => setState(e.target.value)} maxLength={2} placeholder="TX" /></Field>
              <Field label="Employment type">
                <Select value={employmentType} onValueChange={setEmploymentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="W-2">W-2 Employee</SelectItem>
                    <SelectItem value="Self-employed">Self-employed</SelectItem>
                    <SelectItem value="1099">1099 Contractor</SelectItem>
                    <SelectItem value="Retired">Retired</SelectItem>
                    <SelectItem value="Pension">Pension</SelectItem>
                    <SelectItem value="Social Security">Social Security</SelectItem>
                    <SelectItem value="Military">Military / Veteran</SelectItem>
                    <SelectItem value="Business Owner">Business Owner</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Years with employer"><Input type="number" value={yearsWithEmployer} onChange={e => setYearsWithEmployer(e.target.value)} /></Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit">
          <Card>
            <CardHeader><CardTitle className="text-base">Credit Profile</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Experian"><Input type="number" value={experian} onChange={e => setExperian(e.target.value)} /></Field>
                <Field label="Equifax"><Input type="number" value={equifax} onChange={e => setEquifax(e.target.value)} /></Field>
                <Field label="TransUnion"><Input type="number" value={transunion} onChange={e => setTransunion(e.target.value)} /></Field>
                <Field label="Revolving utilization %"><Input type="number" value={utilization} onChange={e => setUtilization(e.target.value)} /></Field>
                <Field label="Late payments (last 12 mo)"><Input type="number" value={lateInLast12} onChange={e => setLateInLast12(e.target.value)} /></Field>
                <Field label="Prior bankruptcy">
                  <Select value={bankruptcy} onValueChange={setBankruptcy}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 flex items-center gap-4 flex-wrap">
                <div>
                  <div className="text-xs text-muted-foreground">Middle score</div>
                  <div className={cn('text-3xl font-semibold', calc.grade.color)}>{calc.middleScore || '—'}</div>
                </div>
                <Badge variant="outline" className={calc.grade.color}>Grade {calc.grade.grade} · {calc.grade.tier}</Badge>
                <Badge variant="outline">Risk: {calc.grade.risk}</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Income</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Field label="Monthly gross income"><Input type="number" value={monthlyGross} onChange={e => setMonthlyGross(e.target.value)} /></Field>
                <Field label="Other qualifying income (rental, commission, etc.)"><Input type="number" value={otherIncome} onChange={e => setOtherIncome(e.target.value)} /></Field>
                <div className="text-sm text-muted-foreground">
                  Qualifying income: <strong className="text-foreground">{formatCurrency(calc.grossIncome)}</strong>/mo
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Monthly Debts</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Field label="Auto loans"><Input type="number" value={autoLoan} onChange={e => setAutoLoan(e.target.value)} /></Field>
                <Field label="Student loans"><Input type="number" value={studentLoan} onChange={e => setStudentLoan(e.target.value)} /></Field>
                <Field label="Credit-card minimums"><Input type="number" value={creditCardMin} onChange={e => setCreditCardMin(e.target.value)} /></Field>
                <Field label="Personal loans"><Input type="number" value={personalLoan} onChange={e => setPersonalLoan(e.target.value)} /></Field>
                <Field label="Other required payments"><Input type="number" value={otherDebt} onChange={e => setOtherDebt(e.target.value)} /></Field>
                <div className="text-sm text-muted-foreground pt-1">
                  Total monthly debt: <strong className="text-foreground">{formatCurrency(calc.totalDebts)}</strong>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="property">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Property</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Field label="Purchase price"><Input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} /></Field>
                <Field label="Property type">
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_family">Single Family</SelectItem>
                      <SelectItem value="condo">Condo</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                      <SelectItem value="duplex">Duplex / Multi-family</SelectItem>
                      <SelectItem value="manufactured">Manufactured</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Occupancy">
                  <Select value={occupancy} onValueChange={setOccupancy}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary Residence</SelectItem>
                      <SelectItem value="secondary">Second Home</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Annual property taxes"><Input type="number" value={propertyTaxAnnual} onChange={e => setPropertyTaxAnnual(e.target.value)} /></Field>
                <Field label="Annual insurance"><Input type="number" value={insuranceAnnual} onChange={e => setInsuranceAnnual(e.target.value)} /></Field>
                <Field label="HOA / month"><Input type="number" value={hoaMonthly} onChange={e => setHoaMonthly(e.target.value)} /></Field>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Loan Terms</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Down payment</Label>
                    <span className="text-sm font-medium">{downPaymentPct[0]}% · {formatCurrency(calc.dp)}</span>
                  </div>
                  <Slider min={0} max={40} step={0.5} value={downPaymentPct} onValueChange={setDownPaymentPct} className="mt-2" />
                </div>
                <Field label="Interest rate (%)"><Input type="number" step="0.125" value={interestRate} onChange={e => setInterestRate(e.target.value)} /></Field>
                <Field label="Loan term (years)">
                  <Select value={loanYears} onValueChange={setLoanYears}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30-Year</SelectItem>
                      <SelectItem value="20">20-Year</SelectItem>
                      <SelectItem value="15">15-Year</SelectItem>
                      <SelectItem value="10">10-Year</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="pt-2 border-t space-y-1 text-sm">
                  <Row label="Loan amount" value={formatCurrency(calc.loan)} />
                  <Row label="P&I" value={formatCurrency(calc.pi)} />
                  <Row label="Taxes" value={formatCurrency(calc.tax)} />
                  <Row label="Insurance" value={formatCurrency(calc.ins)} />
                  <Row label="PMI" value={calc.pmi > 0 ? formatCurrency(calc.pmi) : '—'} />
                  <Row label="HOA" value={calc.hoa > 0 ? formatCurrency(calc.hoa) : '—'} />
                  <Row label="Total PITI" value={formatCurrency(calc.piti)} bold />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reserves">
          <Card>
            <CardHeader><CardTitle className="text-base">Reserves & Assets</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Liquid assets (checking/savings)"><Input type="number" value={liquidAssets} onChange={e => setLiquidAssets(e.target.value)} /></Field>
              <Field label="Retirement assets"><Input type="number" value={retirementAssets} onChange={e => setRetirementAssets(e.target.value)} /></Field>
              <Field label="Closing costs %"><Input type="number" step="0.25" value={closingCostsPct} onChange={e => setClosingCostsPct(e.target.value)} /></Field>
              <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
                <Stat label="Down payment" value={formatCurrency(calc.dp)} />
                <Stat label="Closing costs" value={formatCurrency(calc.closingCosts)} />
                <Stat label="Cash after close" value={formatCurrency(calc.cashAfterClose)} tone={calc.cashAfterClose < 0 ? 'danger' : 'ok'} />
                <Stat label="Months of reserves" value={calc.reserveMonths.toFixed(1)} tone={calc.reserveMonths < 2 ? 'warn' : 'ok'} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Affordability Engine */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Affordability Engine</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AffordCard label="Conservative" price={calc.conservativePrice} note="28% DTI" tone="ok" fmt={formatCurrency} />
          <AffordCard label="Recommended" price={calc.recommendedPrice} note="36% DTI" tone="ok" fmt={formatCurrency} />
          <AffordCard label="Maximum" price={calc.maxPrice} note="43% DTI" tone="warn" fmt={formatCurrency} />
          <AffordCard label="Stretch" price={calc.stretchPrice} note="45% DTI" tone="danger" fmt={formatCurrency} />
        </CardContent>
      </Card>

      {/* Prism Score + Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Prism Mortgage Score</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-semibold">{calc.prismScore}</span>
              <span className="text-muted-foreground">/ 100</span>
            </div>
            <Progress value={calc.prismScore} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-3">
              Weighted: Credit 20% · Cash Flow 15% · DTI 15% · Reserves 10% · Employment 10% · Affordability 10% ·
              Down Payment 10% · LTV 5% · Retirement 5% · Acceleration 5%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Mortgage Risk Score</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={cn('text-5xl font-semibold', calc.riskScore < 30 ? 'text-emerald-500' : calc.riskScore < 60 ? 'text-prism-amber' : 'text-prism-rose')}>
                {calc.riskScore}
              </span>
              <span className="text-muted-foreground">/ 100</span>
            </div>
            <Progress value={calc.riskScore} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-3">Lower is better. Reflects credit history, DTI, reserves, and derogatory events.</p>
          </CardContent>
        </Card>
      </div>

      {/* Approval reasons */}
      <Card>
        <CardHeader><CardTitle className="text-base">Approval Simulator — Why?</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {calc.reasons.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-500 text-sm">
              <CheckCircle2 className="w-4 h-4" /> No underwriting flags detected at current inputs.
            </div>
          ) : (
            calc.reasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-prism-amber mt-0.5 flex-shrink-0" />
                <span>{r}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Loan Comparison */}
      <Card>
        <CardHeader><CardTitle className="text-base">Loan Product Comparison</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground text-left">
              <tr><th className="py-2">Program</th><th>Rate</th><th>Monthly P&I</th><th>Total Interest</th><th>Total Cost</th></tr>
            </thead>
            <tbody>
              {calc.loanScenarios.map(s => (
                <tr key={s.name} className="border-t">
                  <td className="py-2 font-medium">{s.name}</td>
                  <td>{s.rate.toFixed(3)}%</td>
                  <td>{formatCurrency(s.payment)}</td>
                  <td>{formatCurrency(s.totalInterest)}</td>
                  <td>{formatCurrency(s.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* HELOC quick view */}
      <Card>
        <CardHeader><CardTitle className="text-base">HELOC Strategy Snapshot</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Available line (85% CLTV)" value={formatCurrency(calc.helocLine)} />
          <Stat label="Est. HELOC rate" value={`${calc.helocRate.toFixed(2)}%`} />
          <Stat label="Interest-only payment" value={formatCurrency(calc.helocInterestOnly)} />
          <Stat label="Best fit"
            value={calc.backDti > 36 || calc.reserveMonths < 3 ? 'Not recommended' : calc.prismScore >= 75 ? 'Strong candidate' : 'Consider carefully'}
          />
        </CardContent>
      </Card>

      {/* Top improvements */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top 5 Ways to Improve Approval</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {calc.improvements.length === 0 ? (
            <div className="text-sm text-emerald-500 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Your profile is already strong.</div>
          ) : (
            calc.improvements.map((imp, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className="w-7 h-7 rounded-full bg-prism-teal/20 text-prism-teal flex items-center justify-center text-sm font-semibold flex-shrink-0">{i + 1}</div>
                <div>
                  <div className="font-medium text-sm">{imp.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{imp.impact}</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* AI Underwriter output */}
      {aiResult && (
        <Card className="border-prism-violet/30 bg-prism-violet/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-prism-violet" />
              AI Underwriter Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {aiResult.decision && (
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={decisionColor(aiResult.decision)}>{aiResult.decision}</Badge>
                {typeof aiResult.confidence === 'number' && <span className="text-muted-foreground">Confidence: {aiResult.confidence}%</span>}
                {aiResult.best_loan_product && <span className="text-muted-foreground">· Best product: <strong className="text-foreground">{aiResult.best_loan_product}</strong></span>}
              </div>
            )}
            {aiResult.summary && <p>{aiResult.summary}</p>}
            {aiResult.strengths && aiResult.strengths.length > 0 && (
              <div>
                <div className="font-medium mb-1">Strengths</div>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">{aiResult.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {aiResult.concerns && aiResult.concerns.length > 0 && (
              <div>
                <div className="font-medium mb-1">Concerns</div>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">{aiResult.concerns.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {aiResult.improvements && aiResult.improvements.length > 0 && (
              <div>
                <div className="font-medium mb-1">Recommended Improvements</div>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">{aiResult.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {aiResult.should_wait && aiResult.wait_reason && (
              <div className="p-3 rounded-lg bg-prism-amber/10 border border-prism-amber/30">
                <div className="font-medium text-prism-amber flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Consider waiting</div>
                <div className="text-muted-foreground mt-1">{aiResult.wait_reason}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <Card className="border-dashed">
        <CardContent className="pt-4 text-xs text-muted-foreground flex gap-2">
          <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Educational planning tool — not a loan approval.</strong> Underwriting standards vary by lender,
            loan program, property type, and regulatory requirements. Rates, PMI factors, and DTI thresholds shown
            are typical industry ranges, not offers. Verify all results with a licensed mortgage professional
            before making a purchase decision.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// Small helpers
// ============================================================================
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between', bold && 'font-semibold pt-1 border-t')}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' | 'danger' }) {
  const color = tone === 'danger' ? 'text-prism-rose' : tone === 'warn' ? 'text-prism-amber' : '';
  return (
    <div className="p-3 rounded-lg bg-muted/30">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('text-lg font-semibold mt-1', color)}>{value}</div>
    </div>
  );
}

function AffordCard({ label, price, note, tone, fmt }: { label: string; price: number; note: string; tone: 'ok' | 'warn' | 'danger'; fmt: (n: number) => string }) {
  const color = tone === 'danger' ? 'border-prism-rose/30 bg-prism-rose/5' : tone === 'warn' ? 'border-prism-amber/30 bg-prism-amber/5' : 'border-prism-teal/30 bg-prism-teal/5';
  return (
    <div className={cn('p-4 rounded-lg border', color)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-1">{fmt(Math.max(price, 0))}</div>
      <div className="text-xs text-muted-foreground mt-1">{note}</div>
    </div>
  );
}

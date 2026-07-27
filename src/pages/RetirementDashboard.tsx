import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Sparkles, Target, Building2, HeartPulse, Scale, FileText, Upload, Loader2, Save, CheckCircle2, TrendingUp } from "lucide-react";

const CompoundingCrossover = lazy(() => import("@/pages/CompoundingCrossover"));
import { optimizeNextDollar, scoreRetirementReadiness, type OptimizerInputs } from "@/lib/retirement/optimizerEngine";
import { analyzeEmployerBenefits, type EmployerBenefits } from "@/lib/retirement/employerBenefits";
import { projectHsa, type HsaInputs } from "@/lib/retirement/hsaIntelligence";
import { analyzeRothVsTraditional, type RothInputs } from "@/lib/retirement/rothVsTraditional";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/contexts/HouseholdContext";
import { PageExplainer } from "@/components/PageExplainer";
import { LegacyStepNav } from '@/components/legacy/LegacyStepNav';

function normalizePct(v: number): number {
  return v >= 1 ? v / 100 : v;
}

function normalizeOptimizerInputs(o: OptimizerInputs): OptimizerInputs {
  return {
    ...o,
    employer401k: {
      ...o.employer401k,
      matchPct: normalizePct(o.employer401k.matchPct ?? 0),
      matchLimitPct: normalizePct(o.employer401k.matchLimitPct ?? 0),
      currentContribPct: normalizePct(o.employer401k.currentContribPct ?? 0),
    },
  };
}

function normalizeEmployer(e: EmployerBenefits): EmployerBenefits {
  return {
    ...e,
    match401kPct: normalizePct(e.match401kPct),
    matchLimitPct: normalizePct(e.matchLimitPct),
    currentUserContribPct: normalizePct(e.currentUserContribPct),
    nonElectiveEmployerPct: normalizePct(e.nonElectiveEmployerPct ?? 0),
    espp: e.espp
      ? { discountPct: normalizePct(e.espp.discountPct), maxPct: normalizePct(e.espp.maxPct) }
      : null,
  };
}

function normalizeHsa(h: HsaInputs): HsaInputs {
  return {
    ...h,
    marginalTaxRate: normalizePct(h.marginalTaxRate),
    investedPct: normalizePct(h.investedPct),
  };
}

function normalizeRoth(r: RothInputs): RothInputs {
  return {
    ...r,
    currentMarginalRate: normalizePct(r.currentMarginalRate),
    expectedRetirementRate: normalizePct(r.expectedRetirementRate),
    stateRateNow: normalizePct(r.stateRateNow),
    stateRateRetirement: normalizePct(r.stateRateRetirement),
  };
}

function formatPct(v: number): string {
  const n = v >= 1 ? v : v * 100;
  return `${n.toFixed(1).replace(/\.0$/, "")}%`;
}

const DEFAULT_OPT: OptimizerInputs = {
  age: 59,
  filingStatus: "married",
  grossIncome: 68874,
  hasEmergencyFund: true,
  monthlyExpenses: 5500,
  emergencyBalance: 15000,
  // No employer match — employer contributes 9% non-elective (auto, not chased).
  // Employee deferral ramps to 30% starting Dec 2026.
  employer401k: { available: true, matchPct: 0, matchLimitPct: 0, currentContribPct: 0.30, hasRoth: true },
  hsaEligible: true,
  hsaBalance: 8000,
  hsaContribYTD: 2000,
  familyCoverage: true,
  iraContribYTD: 0,
  hasHighInterestDebt: false,
  totalRetirementBalance: 180000,
};

const LS_KEY = "retirement-optimizer-inputs-v5";
const ROTH_KEY = LS_KEY + "-roth-v6";


export default function RetirementDashboard() {
  const { household } = useHousehold();
  const [opt, setOpt] = useState<OptimizerInputs>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return normalizeOptimizerInputs({ ...DEFAULT_OPT, ...JSON.parse(raw) });
    } catch {}
    return DEFAULT_OPT;
  });
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(opt)); } catch {}
  }, [opt]);
  const recs = optimizeNextDollar(opt);
  const readiness = scoreRetirementReadiness(opt.totalRetirementBalance, opt.age, opt.grossIncome);

  const DEFAULT_EMP: EmployerBenefits = {
    salary: 68874, match401kPct: 0, matchLimitPct: 0,
    nonElectiveEmployerPct: 0.09,
    hsaEmployerContrib: 2000, espp: null,
    rsu: null, pension: false,
    tuitionReimbursement: 5000, usesTuitionReimbursement: false, currentUserContribPct: 0.30,
  };
  const [emp, setEmp] = useState<EmployerBenefits>(() => {
    try { const r = localStorage.getItem(LS_KEY + "-emp"); if (r) return normalizeEmployer({ ...DEFAULT_EMP, ...JSON.parse(r) }); } catch {}
    return DEFAULT_EMP;
  });
  useEffect(() => { try { localStorage.setItem(LS_KEY + "-emp", JSON.stringify(emp)); } catch {} }, [emp]);
  const empAnalysis = analyzeEmployerBenefits(emp);

  const DEFAULT_HSA: HsaInputs = {
    age: 59, currentBalance: 8000, annualContribution: 6000, employerContribution: 2000,
    marginalTaxRate: 0.22, investedPct: 0.6, expectedReturn: 0.07,
    annualQualifiedMedical: 2000, yearsUntil65: 6,
  };

  const [hsa, setHsa] = useState<HsaInputs>(() => {
    try { const r = localStorage.getItem(LS_KEY + "-hsa"); if (r) return normalizeHsa({ ...DEFAULT_HSA, ...JSON.parse(r) }); } catch {}
    return DEFAULT_HSA;
  });
  useEffect(() => { try { localStorage.setItem(LS_KEY + "-hsa", JSON.stringify(hsa)); } catch {} }, [hsa]);
  const hsaProj = projectHsa(hsa);

  const DEFAULT_ROTH: RothInputs = {
    currentAge: 59, retirementAge: 75, currentMarginalRate: 0.22, expectedRetirementRate: 0.24,
    annualContribution: 7500, expectedReturn: 0.07, currentTaxableBalance: 25000,
    currentRothBalance: 30000, currentTraditionalBalance: 150000,
    hasStateIncomeTax: true, stateRateNow: 0.0275, stateRateRetirement: 0.015,
  };
  const [roth, setRoth] = useState<RothInputs>(() => {
    try {
      const r = localStorage.getItem(ROTH_KEY) ?? localStorage.getItem(LS_KEY + "-roth");
      if (r) return normalizeRoth({ ...DEFAULT_ROTH, ...JSON.parse(r) });
    } catch {}
    return DEFAULT_ROTH;
  });
  useEffect(() => { try { localStorage.setItem(ROTH_KEY, JSON.stringify(roth)); } catch {} }, [roth]);

  const rothVerdict = analyzeRothVsTraditional(roth);

  const [reviewMd, setReviewMd] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  type PaycheckSnapshot = {
    filename?: string;
    parsedAt: string;
    monthlyGross: number;
    monthlyNet: number;
    annualGross: number;
    federalTax: number;
    stateTax: number;
    socialSecurity: number;
    medicare: number;
    retirement401k: number;
    hsa: number;
    healthInsurance: number;
    otherDeductions: number;
    effectiveTaxRate: number;
  };
  const [snapshot, setSnapshot] = useState<PaycheckSnapshot | null>(() => {
    try { const r = localStorage.getItem(LS_KEY + "-paycheck"); return r ? JSON.parse(r) : null; } catch { return null; }
  });
  useEffect(() => {
    try {
      if (snapshot) localStorage.setItem(LS_KEY + "-paycheck", JSON.stringify(snapshot));
    } catch {}
  }, [snapshot]);

  const [savedAt, setSavedAt] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY + "-savedAt") || "{}"); } catch { return {}; }
  });
  const saveTab = (key: "opt" | "emp" | "hsa" | "roth", data: unknown, label: string) => {
    try {
      const storageKey = key === "opt" ? LS_KEY : key === "roth" ? ROTH_KEY : `${LS_KEY}-${key}`;
      localStorage.setItem(storageKey, JSON.stringify(data));

      const ts = new Date().toLocaleString();
      const next = { ...savedAt, [key]: ts };
      setSavedAt(next);
      localStorage.setItem(LS_KEY + "-savedAt", JSON.stringify(next));
      toast.success(`${label} saved`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    }
  };

  const handlePaystubUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { toast.error("File too large (max 15 MB)"); return; }
    setParsing(true);
    const tId = toast.loading(`Parsing ${file.name}…`);
    try {
      const reader = new FileReader();
      const b64: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("parse-paystub", {
        body: { image: b64, filename: file.name },
      });
      if (error) throw new Error(error.message || "Edge function failed");
      if ((data as any)?.error) throw new Error((data as any).error);

      const monthlyGross = Number(data?.monthly_gross_pay || 0);
      const monthlyNet = Number(data?.monthly_net_pay || 0);
      const annualGross = Math.round(monthlyGross * 12);
      const deds = (data?.deductions || []) as Array<{ category: string; monthly_amount: number }>;
      const get = (c: string) => Number(deds.find((d) => d.category === c)?.monthly_amount || 0);
      const federalTax = get("federal_tax");
      const stateTax = get("state_tax");
      const socialSecurity = get("social_security");
      const medicare = get("medicare");
      const retirement401k = get("retirement_401k");
      const hsaDed = get("hsa");
      const healthInsurance = get("health_insurance") + get("dental_insurance") + get("vision_insurance");
      const otherDeductions = deds
        .filter((d) => !["federal_tax","state_tax","social_security","medicare","retirement_401k","hsa","health_insurance","dental_insurance","vision_insurance"].includes(d.category))
        .reduce((s, d) => s + Number(d.monthly_amount || 0), 0);
      const totalTax = federalTax + stateTax + socialSecurity + medicare;
      const effectiveTaxRate = monthlyGross > 0 ? totalTax / monthlyGross : 0;

      if (!annualGross && !retirement401k && !hsaDed) {
        toast.dismiss(tId);
        toast.warning("Parsed, but no usable fields found. Try a clearer image.");
        return;
      }

      const contribPct = annualGross && retirement401k ? (retirement401k * 12) / annualGross : opt.employer401k.currentContribPct;

      // Rough federal marginal bracket (single/MFJ 2024 approximation)
      const marginal = annualGross < 47150 ? 0.12
        : annualGross < 100525 ? 0.22
        : annualGross < 191950 ? 0.24
        : annualGross < 243725 ? 0.32 : 0.35;

      // Cascade into all tabs
      setOpt((prev) => ({
        ...prev,
        grossIncome: annualGross || prev.grossIncome,
        employer401k: { ...prev.employer401k, currentContribPct: contribPct ?? prev.employer401k.currentContribPct },
        hsaContribYTD: hsaDed ? Math.round(hsaDed * 12) : prev.hsaContribYTD,
        hsaEligible: hsaDed > 0 ? true : prev.hsaEligible,
      }));
      setEmp((prev) => ({
        ...prev,
        salary: annualGross || prev.salary,
        currentUserContribPct: contribPct ?? prev.currentUserContribPct,
      }));
      setHsa((prev) => ({
        ...prev,
        annualContribution: hsaDed ? Math.round(hsaDed * 12) : prev.annualContribution,
        employerContribution: prev.employerContribution || 2000,
        marginalTaxRate: marginal,
      }));

      setRoth((prev) => ({
        ...prev,
        currentMarginalRate: marginal,
      }));

      const snap: PaycheckSnapshot = {
        filename: file.name,
        parsedAt: new Date().toISOString(),
        monthlyGross, monthlyNet, annualGross,
        federalTax, stateTax, socialSecurity, medicare,
        retirement401k, hsa: hsaDed, healthInsurance, otherDeductions,
        effectiveTaxRate,
      };
      setSnapshot(snap);

      toast.dismiss(tId);
      toast.success(`Paystub applied to all tabs · $${annualGross.toLocaleString()}/yr gross`);
    } catch (e: any) {
      toast.dismiss(tId);
      toast.error(e?.message || "Failed to parse paystub");
    } finally {
      setParsing(false);
    }
  };

  const generateReview = async () => {
    if (!household?.id) { toast.error("No household"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("monthly-financial-review", {
        body: {
          household_id: household.id,
          period_month: new Date().toISOString().slice(0, 7) + "-01",
          metrics: {
            retirement_readiness: readiness,
            paycheck_snapshot: snapshot,
            next_dollar_inputs: opt,
            next_dollar_recommendations: recs,
            employer_inputs: emp,
            employer_analysis: {
              total_hidden_comp: empAnalysis.totalHiddenComp,
              match_missed: empAnalysis.match.missed,
              action: empAnalysis.action,
            },
            hsa_inputs: hsa,
            hsa_projection: {
              balance_at_65: hsaProj.balanceAt65,
              triple_tax_savings: hsaProj.tripleTaxSavings,
              strategy: hsaProj.strategy,
            },
            roth_inputs: roth,
            roth_analysis: {
              recommendation: rothVerdict.recommendation,
              roth_pct: rothVerdict.rothPct,
              fv_roth: rothVerdict.fvRoth,
              fv_trad_after_tax: rothVerdict.fvTradAfterTax,
              reasoning: rothVerdict.reasoning,
            },
          },
        },
      });
      if (error) throw error;
      setReviewMd((data as any)?.summary_md || "");
      toast.success("Monthly review generated");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
      <PageExplainer
        title="How to read this page (with examples)"
        sections={[
          {
            heading: 'What this tool does',
            body: (
              <p>
                Ranks your <i>next dollar</i> across 401(k) match → HSA → Roth IRA → Traditional 401(k) →
                taxable — so every paycheck flows to the highest-return account first.
              </p>
            ),
          },
          {
            heading: 'The four tabs',
            body: (
              <ul className="list-disc pl-5 space-y-1">
                <li><b className="text-foreground">Next Dollar</b> — the ranked waterfall using your age, income, and current balances.</li>
                <li><b className="text-foreground">Employer</b> — 401(k) match, HSA contribution, ESPP discount, RSU value, pension.</li>
                <li><b className="text-foreground">HSA</b> — triple-tax-advantaged projection to age 65 (Medicare + retirement asset).</li>
                <li><b className="text-foreground">Roth vs Traditional</b> — which bucket wins given your bracket now vs later.</li>
              </ul>
            ),
          },
          {
            heading: 'Key field meanings',
            body: (
              <ul className="list-disc pl-5 space-y-1">
                <li><b className="text-foreground">Gross Income</b> — <i>annual</i> (e.g. $68,874/yr = $5,739.50/mo × 12).</li>
                <li><b className="text-foreground">Current 401(k) %</b> — per-paycheck deferral rate, not a dollar amount.</li>
                <li><b className="text-foreground">Emergency Balance</b> — total liquid cash; target ≈ 3 months of expenses.</li>
                <li><b className="text-foreground">Retirement Balance</b> — 401(k) + IRA + Roth combined.</li>
              </ul>
            ),
          },
          {
            heading: 'Save & re-upload',
            body: (
              <p>
                Every tab auto-persists as you type; the <b className="text-foreground">Save</b> button
                confirms with a timestamp. Use <b className="text-foreground">Upload Paycheck</b> to re-parse
                any time your pay stub changes.
              </p>
            ),
          },
        ]}
      />
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-7 w-7 text-prism-amber" /> Retirement & Wealth Optimizer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-guided "next dollar" decisions across retirement, employer benefits, HSA, and Roth strategy.
          </p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handlePaystubUpload(f);
              e.currentTarget.value = "";
            }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={parsing}>
            {parsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload paycheck
          </Button>
          <p className="text-[11px] text-muted-foreground mt-1 text-right">Cascades to all 4 tabs</p>
        </div>
      </div>

      {snapshot && (
        <Card className="border-prism-amber/40 bg-prism-amber/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-prism-amber" />
              Paycheck Snapshot
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                {snapshot.filename} · parsed {new Date(snapshot.parsedAt).toLocaleDateString()}
              </span>
            </CardTitle>
            <CardDescription className="text-xs">
              These numbers are auto-applied to Next Dollar, Employer, HSA, and Roth vs Trad tabs.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Monthly gross" value={`$${snapshot.monthlyGross.toLocaleString()}`} />
            <Stat label="Monthly net" value={`$${snapshot.monthlyNet.toLocaleString()}`} />
            <Stat label="Annual gross" value={`$${snapshot.annualGross.toLocaleString()}`} />
            <Stat label="Effective tax rate" value={`${(snapshot.effectiveTaxRate * 100).toFixed(1)}%`} />
            <Stat label="Federal tax /mo" value={`$${snapshot.federalTax.toLocaleString()}`} />
            <Stat label="State tax /mo" value={`$${snapshot.stateTax.toLocaleString()}`} />
            <Stat label="401(k) /mo" value={`$${snapshot.retirement401k.toLocaleString()}`} />
            <Stat label="HSA /mo" value={`$${snapshot.hsa.toLocaleString()}`} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span>Retirement Readiness</span>
            <Badge variant={readiness >= 80 ? "default" : readiness >= 50 ? "secondary" : "destructive"}>
              {readiness}/100
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={readiness} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Based on Fidelity-style age-to-salary multiplier targets.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="optimizer">
        <TabsList className="grid grid-cols-2 md:grid-cols-6">
          <TabsTrigger value="optimizer"><Target className="h-3.5 w-3.5 mr-1.5" /> Next Dollar</TabsTrigger>
          <TabsTrigger value="employer"><Building2 className="h-3.5 w-3.5 mr-1.5" /> Employer</TabsTrigger>
          <TabsTrigger value="hsa"><HeartPulse className="h-3.5 w-3.5 mr-1.5" /> HSA</TabsTrigger>
          <TabsTrigger value="roth"><Scale className="h-3.5 w-3.5 mr-1.5" /> Roth vs Trad</TabsTrigger>
          <TabsTrigger value="crossover"><TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Crossover</TabsTrigger>
          <TabsTrigger value="cfo"><FileText className="h-3.5 w-3.5 mr-1.5" /> CFO Review</TabsTrigger>
        </TabsList>

        <TabsContent value="crossover" className="mt-4">
          <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading household crossover model…</div>}>
            <CompoundingCrossover />
          </Suspense>
        </TabsContent>


        <TabsContent value="optimizer" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-3 flex-wrap">
                <span>Your Inputs</span>
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={parsing}>
                  {parsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Upload paycheck
                </Button>
              </CardTitle>
              <CardDescription className="text-xs">
                Upload a paystub image or PDF to auto-fill gross income, 401(k) %, and HSA.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-3">
              <Field label="Age" value={opt.age} onChange={(v) => setOpt({ ...opt, age: v })} />
              <Field label="Gross Income" value={opt.grossIncome} onChange={(v) => setOpt({ ...opt, grossIncome: v })} />
              <Field label="Monthly Expenses" value={opt.monthlyExpenses} onChange={(v) => setOpt({ ...opt, monthlyExpenses: v })} />
              <Field label="Emergency Balance" value={opt.emergencyBalance} onChange={(v) => setOpt({ ...opt, emergencyBalance: v })} />
              <Field label="Total Retirement Balance" value={opt.totalRetirementBalance} onChange={(v) => setOpt({ ...opt, totalRetirementBalance: v })} />
              <Field label="Current 401(k) %" step={0.01} value={opt.employer401k.currentContribPct ?? 0} onChange={(v) => setOpt({ ...opt, employer401k: { ...opt.employer401k, currentContribPct: v } })} />
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={opt.hasHighInterestDebt} onCheckedChange={(c) => setOpt({ ...opt, hasHighInterestDebt: c })} />
                <Label>High-interest debt (&gt;7%)</Label>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={opt.hsaEligible} onCheckedChange={(c) => setOpt({ ...opt, hsaEligible: c })} />
                <Label>HSA-eligible (HDHP)</Label>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Where your next dollar should go</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {recs.map((r) => (
                <div key={r.step} className="flex gap-3 p-3 rounded-lg border border-border/60 bg-muted/20">
                  <Badge variant={r.priority === "critical" ? "destructive" : r.priority === "high" ? "default" : "secondary"} className="h-6 shrink-0">Step {r.step}</Badge>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-semibold">{r.target}</div>
                      <div className="text-sm font-mono text-prism-amber">${r.amount.toLocaleString()}/mo</div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{r.reasoning}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="flex items-center justify-end gap-3">
            {savedAt.opt && <span className="text-xs text-muted-foreground">Last saved {savedAt.opt}</span>}
            <Button size="sm" onClick={() => saveTab("opt", opt, "Next Dollar inputs")}>
              <Save className="h-4 w-4 mr-2" /> Save Next Dollar
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="employer" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employer Benefits Analyzer</CardTitle>
              <CardDescription>Total hidden compensation: <span className="text-prism-amber font-semibold">${empAnalysis.totalHiddenComp.toLocaleString()}/yr</span></CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <Field label="Salary (annual)" value={emp.salary} onChange={(v) => setEmp({ ...emp, salary: v })} />
                <Field label="Your 401(k) %" step={0.01} value={emp.currentUserContribPct} onChange={(v) => setEmp({ ...emp, currentUserContribPct: v })} />
                <Field label="HSA Employer $/yr" value={emp.hsaEmployerContrib} onChange={(v) => setEmp({ ...emp, hsaEmployerContrib: v })} />
                <Field label="Employer match %" step={0.01} value={emp.match401kPct} onChange={(v) => setEmp({ ...emp, match401kPct: v })} />
                <Field label="Match requires you to contribute %" step={0.01} value={emp.matchLimitPct} onChange={(v) => setEmp({ ...emp, matchLimitPct: v })} />
                <Field label="Employer non-elective % (no match required)" step={0.01} value={emp.nonElectiveEmployerPct ?? 0} onChange={(v) => setEmp({ ...emp, nonElectiveEmployerPct: v })} />
                <Field label="ESPP discount %" step={0.01} value={emp.espp?.discountPct ?? 0} onChange={(v) => setEmp({ ...emp, espp: { ...(emp.espp ?? { maxPct: 0.1 }), discountPct: v } })} />
                <Field label="ESPP max % of salary" step={0.01} value={emp.espp?.maxPct ?? 0} onChange={(v) => setEmp({ ...emp, espp: { ...(emp.espp ?? { discountPct: 0 }), maxPct: v } })} />
                <Field label="RSU annual grant value" value={emp.rsu?.annualGrantValue ?? 0} onChange={(v) => setEmp({ ...emp, rsu: { ...(emp.rsu ?? { vestYears: 3 }), annualGrantValue: v } })} />
                <Field label="RSU vest years" value={emp.rsu?.vestYears ?? 3} onChange={(v) => setEmp({ ...emp, rsu: { ...(emp.rsu ?? { annualGrantValue: 0 }), vestYears: Math.max(1, v) } })} />
              </div>
              <div className="space-y-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded border border-border/40">
                <p><b>ESPP</b> = Employee Stock Purchase Plan. You buy company stock at a discount (often 5–15%) with after-tax paycheck deductions. The discount is free money, but the stock can go down.</p>
                <p><b>RSU</b> = Restricted Stock Unit. A company promise to give you shares after they vest (e.g., over 3–4 years). Value is taxed as ordinary income when they vest. Enter the annual grant value and how many years it vests.</p>
                <p><b>No match?</b> Set both match fields to 0 and enter your employer's flat contribution % in "non-elective" (e.g. 9% means they add 9% of your salary to your 401(k) regardless of what you contribute).</p>
              </div>
              <div className="flex items-center justify-between gap-3 p-3 rounded border border-border/40">
                <div className="flex items-center gap-2">
                  <Switch
                    id="tuition-toggle"
                    checked={emp.usesTuitionReimbursement}
                    onCheckedChange={(c) => setEmp({ ...emp, usesTuitionReimbursement: c })}
                  />
                  <Label htmlFor="tuition-toggle" className="cursor-pointer">I use tuition reimbursement</Label>
                </div>
                {emp.usesTuitionReimbursement && (
                  <Field label="Annual tuition reimbursement" value={emp.tuitionReimbursement} onChange={(v) => setEmp({ ...emp, tuitionReimbursement: v })} />
                )}
              </div>
              <div className="space-y-2">
                {empAnalysis.breakdown.map((b, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 rounded border border-border/40">
                    <div>
                      <div className="font-medium">{b.label}</div>
                      {b.note && <div className="text-xs text-muted-foreground">{b.note}</div>}
                    </div>
                    <div className="font-mono">${b.annualValue.toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-prism-amber/10 border border-prism-amber/30 text-sm">
                <strong>Action:</strong> {empAnalysis.action}
              </div>
            </CardContent>
          </Card>
          <div className="flex items-center justify-end gap-3">
            {savedAt.emp && <span className="text-xs text-muted-foreground">Last saved {savedAt.emp}</span>}
            <Button size="sm" onClick={() => saveTab("emp", emp, "Employer inputs")}>
              <Save className="h-4 w-4 mr-2" /> Save Employer
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="hsa" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>HSA Intelligence</CardTitle>
              <CardDescription>Projected balance at 65: <span className="text-prism-amber font-semibold">${hsaProj.balanceAt65.toLocaleString()}</span></CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <Field label="Current Balance" value={hsa.currentBalance} onChange={(v) => setHsa({ ...hsa, currentBalance: v })} />
                <Field label="Annual Contribution" value={hsa.annualContribution} onChange={(v) => setHsa({ ...hsa, annualContribution: v })} />
                <Field label="% Invested" step={0.05} value={hsa.investedPct} onChange={(v) => setHsa({ ...hsa, investedPct: v })} />
                <Field label="Marginal Tax Rate" step={0.01} value={hsa.marginalTaxRate} onChange={(v) => setHsa({ ...hsa, marginalTaxRate: v })} />
                <Field label="Annual Medical (out-of-pocket)" value={hsa.annualQualifiedMedical} onChange={(v) => setHsa({ ...hsa, annualQualifiedMedical: v })} />
                <Field label="Years Until 65" value={hsa.yearsUntil65} onChange={(v) => setHsa({ ...hsa, yearsUntil65: v })} />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border/60">
                  <div className="text-xs text-muted-foreground">Estimated triple-tax savings</div>
                  <div className="text-2xl font-bold text-prism-amber">${hsaProj.tripleTaxSavings.toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-lg border border-border/60">
                  <div className="text-xs text-muted-foreground">Strategy</div>
                  <div className="text-lg font-semibold capitalize">{hsaProj.strategy.replace(/-/g, " ")}</div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-sm">{hsaProj.recommendation}</div>
            </CardContent>
          </Card>
          <div className="flex items-center justify-end gap-3">
            {savedAt.hsa && <span className="text-xs text-muted-foreground">Last saved {savedAt.hsa}</span>}
            <Button size="sm" onClick={() => saveTab("hsa", hsa, "HSA inputs")}>
              <Save className="h-4 w-4 mr-2" /> Save HSA
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="roth" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Roth vs Traditional AI Advisor</CardTitle>
              <CardDescription>Recommendation: <span className="uppercase text-prism-amber font-semibold">{rothVerdict.recommendation}</span> ({(rothVerdict.rothPct * 100).toFixed(0)}% Roth)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <Field label="Current Age" value={roth.currentAge} onChange={(v) => setRoth({ ...roth, currentAge: v })} />
                <Field label="Retirement Age" value={roth.retirementAge} onChange={(v) => setRoth({ ...roth, retirementAge: v })} />
                <Field label="Current Marginal Rate" step={0.01} value={roth.currentMarginalRate} onChange={(v) => setRoth({ ...roth, currentMarginalRate: v })} />
                <Field label="Expected Retirement Rate" step={0.01} value={roth.expectedRetirementRate} onChange={(v) => setRoth({ ...roth, expectedRetirementRate: v })} />
                <Field label="State Rate Now" step={0.01} value={roth.stateRateNow} onChange={(v) => setRoth({ ...roth, stateRateNow: v })} />
                <Field label="State Rate Retirement" step={0.01} value={roth.stateRateRetirement} onChange={(v) => setRoth({ ...roth, stateRateRetirement: v })} />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border/60">
                  <div className="text-xs text-muted-foreground">Roth FV (tax-free)</div>
                  <div className="text-xl font-bold">${rothVerdict.fvRoth.toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-lg border border-border/60">
                  <div className="text-xs text-muted-foreground">Traditional FV (after-tax)</div>
                  <div className="text-xl font-bold">${rothVerdict.fvTradAfterTax.toLocaleString()}</div>
                </div>
              </div>
              <ul className="space-y-1 text-sm list-disc pl-5">
                {rothVerdict.reasoning.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </CardContent>
          </Card>
          <div className="flex items-center justify-end gap-3">
            {savedAt.roth && <span className="text-xs text-muted-foreground">Last saved {savedAt.roth}</span>}
            <Button size="sm" onClick={() => saveTab("roth", roth, "Roth vs Traditional inputs")}>
              <Save className="h-4 w-4 mr-2" /> Save Roth
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="cfo" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-prism-amber" /> Monthly CFO Review</CardTitle>
              <CardDescription>
                Analyzes {snapshot ? "your parsed paycheck plus " : ""}all four tabs (Next Dollar, Employer, HSA, Roth vs Trad)
                and returns wins, concerns, and top 3 actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <Stat label="Readiness" value={`${readiness}/100`} />
                <Stat label="Annual gross" value={`$${(snapshot?.annualGross ?? opt.grossIncome).toLocaleString()}`} />
                <Stat label="Hidden comp" value={`$${empAnalysis.totalHiddenComp.toLocaleString()}/yr`} />
                <Stat label="HSA @ 65" value={`$${hsaProj.balanceAt65.toLocaleString()}`} />
                <Stat label="401(k) rate" value={formatPct(opt.employer401k.currentContribPct ?? 0)} />
                <Stat label="Match missed" value={`$${empAnalysis.match.missed.toLocaleString()}/yr`} />
                <Stat label="Roth verdict" value={rothVerdict.recommendation.toString()} />
                <Stat label="Marginal rate" value={formatPct(roth.currentMarginalRate)} />
              </div>
              {!snapshot && (
                <div className="p-3 rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground">
                  Tip: upload a paystub above for the most accurate review — otherwise the AI uses your manual inputs.
                </div>
              )}
              <Button onClick={generateReview} disabled={loading}>
                {loading ? "Generating…" : "Generate this month's review"}
              </Button>
              {reviewMd && (
                <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border/60 p-4 bg-muted/20 whitespace-pre-wrap">
                  {reviewMd}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <LegacyStepNav />
    </div>
  );
}

function Field({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  const isPct = step < 1;
  const display = isPct ? (value >= 1 ? value : value * 100) : value;
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step={isPct ? 1 : step}
        value={display}
        onChange={(e) => {
          const raw = e.target.value === "" ? 0 : Number(e.target.value);
          const val = Number.isNaN(raw) ? 0 : raw;
          if (isPct && val >= 1) {
            onChange(val / 100);
          } else {
            onChange(val);
          }
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-md border border-border/50 bg-background/50">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono text-sm font-semibold">{value}</div>
    </div>
  );
}

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Sparkles, Target, Building2, HeartPulse, Scale, FileText, Upload, Loader2 } from "lucide-react";
import { optimizeNextDollar, scoreRetirementReadiness, type OptimizerInputs } from "@/lib/retirement/optimizerEngine";
import { analyzeEmployerBenefits, type EmployerBenefits } from "@/lib/retirement/employerBenefits";
import { projectHsa, type HsaInputs } from "@/lib/retirement/hsaIntelligence";
import { analyzeRothVsTraditional, type RothInputs } from "@/lib/retirement/rothVsTraditional";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/contexts/HouseholdContext";

const DEFAULT_OPT: OptimizerInputs = {
  age: 40,
  filingStatus: "married",
  grossIncome: 120000,
  hasEmergencyFund: true,
  monthlyExpenses: 5500,
  emergencyBalance: 15000,
  employer401k: { available: true, matchPct: 0.05, matchLimitPct: 0.06, currentContribPct: 0.03, hasRoth: true },
  hsaEligible: true,
  hsaBalance: 8000,
  hsaContribYTD: 2000,
  familyCoverage: true,
  iraContribYTD: 0,
  hasHighInterestDebt: false,
  totalRetirementBalance: 180000,
};

export default function RetirementDashboard() {
  const { household } = useHousehold();
  const [opt, setOpt] = useState<OptimizerInputs>(DEFAULT_OPT);
  const recs = optimizeNextDollar(opt);
  const readiness = scoreRetirementReadiness(opt.totalRetirementBalance, opt.age, opt.grossIncome);

  const [emp, setEmp] = useState<EmployerBenefits>({
    salary: 120000, match401kPct: 0.05, matchLimitPct: 0.06,
    hsaEmployerContrib: 1200, espp: { discountPct: 0.15, maxPct: 0.1 },
    rsu: { annualGrantValue: 20000, vestYears: 4 }, pension: false,
    tuitionReimbursement: 5000, currentUserContribPct: 0.03,
  });
  const empAnalysis = analyzeEmployerBenefits(emp);

  const [hsa, setHsa] = useState<HsaInputs>({
    age: 40, currentBalance: 8000, annualContribution: 6000, employerContribution: 1200,
    marginalTaxRate: 0.22, investedPct: 0.6, expectedReturn: 0.07,
    annualQualifiedMedical: 2000, yearsUntil65: 25,
  });
  const hsaProj = projectHsa(hsa);

  const [roth, setRoth] = useState<RothInputs>({
    currentAge: 40, retirementAge: 65, currentMarginalRate: 0.22, expectedRetirementRate: 0.24,
    annualContribution: 7500, expectedReturn: 0.07, currentTaxableBalance: 25000,
    currentRothBalance: 30000, currentTraditionalBalance: 150000,
    hasStateIncomeTax: true, stateRateNow: 0.04, stateRateRetirement: 0.0,
  });
  const rothVerdict = analyzeRothVsTraditional(roth);

  const [reviewMd, setReviewMd] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
      console.log("[paystub] invoking parse-paystub", { name: file.name, size: file.size, type: file.type });
      const { data, error } = await supabase.functions.invoke("parse-paystub", {
        body: { image: b64, filename: file.name },
      });
      if (error) {
        console.error("[paystub] invoke error", error);
        throw new Error(error.message || "Edge function failed");
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      console.log("[paystub] parsed", data);
      const gross = data?.monthly_gross_pay ? Math.round(data.monthly_gross_pay * 12) : 0;
      const retire = (data?.deductions || []).find((d: any) => d.category === "retirement_401k");
      const hsaDed = (data?.deductions || []).find((d: any) => d.category === "hsa");
      const contribPct = gross && retire?.monthly_amount ? (retire.monthly_amount * 12) / gross : opt.employer401k.currentContribPct;
      if (!gross && !retire && !hsaDed) {
        toast.dismiss(tId);
        toast.warning("Parsed, but no usable fields found. Try a clearer image.");
        return;
      }
      setOpt((prev) => ({
        ...prev,
        grossIncome: gross || prev.grossIncome,
        employer401k: { ...prev.employer401k, currentContribPct: contribPct ?? prev.employer401k.currentContribPct },
        hsaContribYTD: hsaDed?.monthly_amount ? Math.round(hsaDed.monthly_amount * 12) : prev.hsaContribYTD,
      }));
      setEmp((prev) => ({
        ...prev,
        salary: gross || prev.salary,
        currentUserContribPct: contribPct ?? prev.currentUserContribPct,
      }));
      toast.dismiss(tId);
      toast.success(`Paystub parsed · gross ~$${gross.toLocaleString()}/yr${retire ? ` · 401(k) ${((contribPct ?? 0) * 100).toFixed(1)}%` : ""}`);
    } catch (e: any) {
      console.error("[paystub] failed", e);
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
            total_retirement: opt.totalRetirementBalance,
            income: opt.grossIncome,
            emergency_fund: opt.emergencyBalance,
            top_recommendations: recs.slice(0, 3).map((r) => r.target),
            employer_match_missed: empAnalysis.match.missed,
            hsa_projection_at_65: hsaProj.balanceAt65,
            roth_recommendation: rothVerdict.recommendation,
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
          <p className="text-[11px] text-muted-foreground mt-1 text-right">Auto-fills income, 401(k) %, HSA</p>
        </div>
      </div>


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
        <TabsList className="grid grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="optimizer"><Target className="h-3.5 w-3.5 mr-1.5" /> Next Dollar</TabsTrigger>
          <TabsTrigger value="employer"><Building2 className="h-3.5 w-3.5 mr-1.5" /> Employer</TabsTrigger>
          <TabsTrigger value="hsa"><HeartPulse className="h-3.5 w-3.5 mr-1.5" /> HSA</TabsTrigger>
          <TabsTrigger value="roth"><Scale className="h-3.5 w-3.5 mr-1.5" /> Roth vs Trad</TabsTrigger>
          <TabsTrigger value="cfo"><FileText className="h-3.5 w-3.5 mr-1.5" /> CFO Review</TabsTrigger>
        </TabsList>

        <TabsContent value="optimizer" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Your Inputs</CardTitle></CardHeader>
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
        </TabsContent>

        <TabsContent value="employer" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employer Benefits Analyzer</CardTitle>
              <CardDescription>Total hidden compensation: <span className="text-prism-amber font-semibold">${empAnalysis.totalHiddenComp.toLocaleString()}/yr</span></CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <Field label="Salary" value={emp.salary} onChange={(v) => setEmp({ ...emp, salary: v })} />
                <Field label="Your 401(k) %" step={0.01} value={emp.currentUserContribPct} onChange={(v) => setEmp({ ...emp, currentUserContribPct: v })} />
                <Field label="HSA Employer $/yr" value={emp.hsaEmployerContrib} onChange={(v) => setEmp({ ...emp, hsaEmployerContrib: v })} />
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
        </TabsContent>

        <TabsContent value="cfo" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-prism-amber" /> Monthly CFO Review</CardTitle>
              <CardDescription>AI-generated monthly summary — wins, concerns, and top 3 actions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
    </div>
  );
}

function Field({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </div>
  );
}

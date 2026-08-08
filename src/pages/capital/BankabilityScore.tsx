import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, CreditCard, Building2, DollarSign, BarChart3, Landmark, Users, FileText } from "lucide-react";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageOverview from "@/components/PageOverview";

interface ScoreFactor {
  label: string;
  value: number | null; // 0-100, or null when the data has not been entered
  weight: number;
  icon: typeof TrendingUp;
  color: string;
  description: string;
  missingHint: string;
}

const BankabilityScore = () => {
  const { household } = useHousehold();
  const householdId = household?.id;

  const { data: creditAccounts } = useQuery({
    queryKey: ["bankability-credit", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data } = await supabase.from("credit_accounts").select("*").eq("household_id", householdId);
      return data || [];
    },
    enabled: !!householdId,
  });

  const { data: snapshots } = useQuery({
    queryKey: ["bankability-snapshots", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data } = await supabase
        .from("agency_financial_snapshots")
        .select("*")
        .eq("household_id", householdId)
        .order("snapshot_month", { ascending: false })
        .limit(6);
      return data || [];
    },
    enabled: !!householdId,
  });

  const { data: claims } = useQuery({
    queryKey: ["bankability-claims", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data } = await supabase
        .from("medicaid_claims")
        .select("*")
        .eq("household_id", householdId)
        .order("service_date", { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!householdId,
  });

  const { data: creditSteps } = useQuery({
    queryKey: ["bankability-steps", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data } = await supabase.from("business_credit_steps").select("*").eq("household_id", householdId);
      return data || [];
    },
    enabled: !!householdId,
  });

  // Factor scores — null whenever the underlying data has not been entered.
  // No assumed midpoint (previously 50) is substituted for missing data.
  const accounts = creditAccounts || [];
  const latest = snapshots?.[0];

  // 1. Personal credit strength
  const openAccounts = accounts.filter(a => a.account_status === "Open");
  const negativeAccounts = accounts.filter(a => ["Collection", "Charge-Off"].includes(a.account_status));
  const personalCredit: number | null = accounts.length === 0
    ? null
    : Math.max(0, Math.min(100, (openAccounts.length * 12) - (negativeAccounts.length * 15)));

  // 2. Business credit (PAYDEX proxy)
  const totalSteps = creditSteps?.length || 0;
  const completedSteps = creditSteps?.filter(s => s.is_completed).length || 0;
  const businessCredit: number | null = totalSteps === 0
    ? null
    : Math.min(100, Math.round((completedSteps / totalSteps) * 100));

  // 3. Revenue stability
  let revenueStability: number | null = null;
  if (snapshots && snapshots.length >= 2) {
    const revenues = snapshots.map(s => s.monthly_revenue).filter(r => r > 0);
    if (revenues.length >= 2) {
      const avg = revenues.reduce((a, b) => a + b, 0) / revenues.length;
      const variance = revenues.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / revenues.length;
      const cv = avg > 0 ? Math.sqrt(variance) / avg : 1;
      revenueStability = Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
    }
  }

  // 4. Cash flow consistency
  let cashFlow: number | null = null;
  if (latest && latest.monthly_operating_expenses > 0) {
    const ratio = latest.cash_reserves / latest.monthly_operating_expenses;
    cashFlow = Math.min(100, Math.round(ratio * 33));
  }

  // 5. DSCR
  let dscr: number | null = null;
  if (latest) {
    const noi = latest.monthly_revenue - latest.monthly_operating_expenses;
    const totalDebt = accounts.reduce((sum, a) => sum + (Number(a.monthly_payment) || 0), 0);
    if (totalDebt > 0) {
      dscr = Math.max(0, Math.min(100, Math.round((noi / totalDebt) * 50)));
    } else if (accounts.length > 0) {
      // No debt service reported at all — full coverage by definition.
      dscr = noi > 0 ? 100 : 0;
    }
  }

  // 6. Bank relationship — depth of reported banking history
  const bankRelationship: number | null = !snapshots || snapshots.length === 0
    ? null
    : Math.min(100, snapshots.length * 12);

  // 7. Medicaid receivable stability
  const receivableStability: number | null = claims && claims.length > 0
    ? Math.round((claims.filter(c => c.status === "approved" || c.status === "paid").length / claims.length) * 100)
    : null;

  // 8. Business credit bureau scores — same evidence base as PAYDEX progress
  const bureauScore: number | null = businessCredit;

  const factors: ScoreFactor[] = [
    { label: "Personal Credit Strength", value: personalCredit, weight: 15, icon: CreditCard, color: "text-prism-sky", description: "Based on open accounts and negative items", missingHint: "Import credit reports" },
    { label: "PAYDEX / Business Credit", value: businessCredit, weight: 10, icon: Building2, color: "text-prism-indigo", description: "Business credit building progress", missingHint: "Start the business credit roadmap" },
    { label: "Bureau Scores", value: bureauScore, weight: 10, icon: FileText, color: "text-prism-violet", description: "Business credit bureau score estimates", missingHint: "Start the business credit roadmap" },
    { label: "Revenue Stability", value: revenueStability, weight: 15, icon: TrendingUp, color: "text-prism-teal", description: "Month-over-month revenue consistency", missingHint: "Add at least 2 monthly snapshots" },
    { label: "Cash Flow Consistency", value: cashFlow, weight: 15, icon: DollarSign, color: "text-prism-lime", description: "Operating cash flow and reserves", missingHint: "Add reserves and operating expenses" },
    { label: "Debt Service Coverage", value: dscr, weight: 15, icon: BarChart3, color: "text-prism-amber", description: "Ability to service existing debt", missingHint: "Add a financial snapshot" },
    { label: "Bank Relationship", value: bankRelationship, weight: 10, icon: Landmark, color: "text-prism-orange", description: "Banking history depth", missingHint: "Add financial snapshots over time" },
    { label: "Receivable Stability", value: receivableStability, weight: 10, icon: Users, color: "text-prism-rose", description: "Medicaid claim approval rates", missingHint: "Log Medicaid claims" },
  ];

  // Score only across factors with real data, reweighted to the available evidence.
  const scored = factors.filter(f => f.value !== null);
  const availableWeight = scored.reduce((sum, f) => sum + f.weight, 0);
  const totalScore: number | null = availableWeight >= 50
    ? Math.round(scored.reduce((sum, f) => sum + (f.value! * f.weight), 0) / availableWeight)
    : null;
  const coveragePct = Math.round(availableWeight);


  const getInterpretation = (score: number) => {
    if (score >= 90) return { label: "Highly Bankable", color: "text-prism-teal", variant: "default" as const };
    if (score >= 75) return { label: "Moderately Bankable", color: "text-prism-sky", variant: "default" as const };
    if (score >= 60) return { label: "Needs Improvement", color: "text-prism-amber", variant: "secondary" as const };
    return { label: "High Risk", color: "text-prism-rose", variant: "destructive" as const };
  };

  const interp = totalScore !== null ? getInterpretation(totalScore) : null;

  return (
    <div className="space-y-6 pb-8">
      <PageOverview
        title="Business Bankability Score"
        description="A composite score from 0-100 evaluating how attractive your business is to lenders, based on 8 key financial factors."
        icon={TrendingUp}
        ttsScript="The Business Bankability Score evaluates how attractive your business is to lenders across 8 key factors."
        features={["8-factor weighted scoring", "Score interpretation guide", "Real-time data integration"]}
      />

      {/* Score Display */}
      <Card>
        <CardContent className="pt-8 pb-8">
          {totalScore === null || !interp ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">Your Bankability Score</p>
              <p className="text-3xl font-bold text-muted-foreground">Score unavailable</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Not enough data yet. Add financial snapshots, credit accounts, and claims below —
                at least half of the scoring weight must be backed by real data before a score is shown.
              </p>
              <Badge variant="secondary" className="text-sm px-4 py-1">{coveragePct}% of scoring weight has data</Badge>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">Your Bankability Score</p>
              <p className={`text-6xl font-extrabold ${interp.color}`}>{totalScore}</p>
              <Badge variant={interp.variant} className="text-sm px-4 py-1">{interp.label}</Badge>
              <div className="max-w-md mx-auto mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>High Risk</span>
                  <span>Needs Work</span>
                  <span>Moderate</span>
                  <span>Bankable</span>
                </div>
                <Progress value={totalScore} className="h-3" />
              </div>
              {coveragePct < 100 && (
                <p className="text-xs text-muted-foreground">
                  Based on {coveragePct}% of the scoring weight — factors without data are excluded, not assumed.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Factor Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Score Breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">Each factor is weighted based on its importance to lenders.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {factors.map((factor) => {
            const Icon = factor.icon;
            const hasData = factor.value !== null;
            const contribution = hasData ? Math.round(factor.value! * factor.weight / 100) : 0;
            return (
              <div key={factor.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${factor.color}`} />
                    <span className="text-sm font-medium">{factor.label}</span>
                    <span className="text-xs text-muted-foreground">({factor.weight}% weight)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasData ? (
                      <>
                        <span className="text-sm font-semibold">{factor.value}</span>
                        <span className="text-xs text-muted-foreground">+{contribution} pts</span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">No data</span>
                    )}
                  </div>
                </div>
                <Progress value={hasData ? factor.value! : 0} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  {hasData ? factor.description : `${factor.description} — ${factor.missingHint} to include this factor.`}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>


      {/* Interpretation Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score Interpretation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { range: "90 – 100", label: "Highly Bankable", desc: "Strong candidate for most financing options", color: "text-prism-teal" },
              { range: "75 – 89", label: "Moderately Bankable", desc: "Good position, some areas to strengthen", color: "text-prism-sky" },
              { range: "60 – 74", label: "Needs Improvement", desc: "Focus on weak areas before applying", color: "text-prism-amber" },
              { range: "Below 60", label: "High Risk", desc: "Build credit and stabilize finances first", color: "text-prism-rose" },
            ].map((tier) => (
              <div key={tier.range} className="flex gap-3 rounded-lg border p-3">
                <div className={`font-mono font-bold text-sm ${tier.color}`}>{tier.range}</div>
                <div>
                  <p className="text-sm font-medium">{tier.label}</p>
                  <p className="text-xs text-muted-foreground">{tier.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground">
            <strong>Compliance Notice:</strong> This platform provides financial education and operational intelligence tools.
            It does not provide lending services or guarantee credit approvals.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BankabilityScore;

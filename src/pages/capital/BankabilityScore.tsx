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
  value: number; // 0-100
  weight: number;
  icon: typeof TrendingUp;
  color: string;
  description: string;
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

  // Calculate factor scores
  const accounts = creditAccounts || [];
  const latest = snapshots?.[0];

  // 1. Personal credit strength
  const openAccounts = accounts.filter(a => a.account_status === "Open");
  const negativeAccounts = accounts.filter(a => ["Collection", "Charge-Off"].includes(a.account_status));
  const personalCredit = Math.max(0, Math.min(100, 60 + (openAccounts.length * 5) - (negativeAccounts.length * 15)));

  // 2. Business credit (PAYDEX proxy)
  const completedSteps = creditSteps?.filter(s => s.is_completed).length || 0;
  const businessCredit = Math.min(100, completedSteps * 16);

  // 3. Revenue stability
  let revenueStability = 50;
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
  let cashFlow = 50;
  if (latest) {
    const ratio = latest.monthly_operating_expenses > 0
      ? latest.cash_reserves / latest.monthly_operating_expenses
      : 0;
    cashFlow = Math.min(100, Math.round(ratio * 33));
  }

  // 5. DSCR
  let dscr = 50;
  if (latest) {
    const noi = latest.monthly_revenue - latest.monthly_operating_expenses;
    const totalDebt = accounts.reduce((sum, a) => sum + (Number(a.monthly_payment) || 0), 0);
    if (totalDebt > 0) {
      const dscrVal = noi / totalDebt;
      dscr = Math.min(100, Math.round(dscrVal * 50));
    } else if (noi > 0) {
      dscr = 85;
    }
  }

  // 6. Bank relationship
  const bankRelationship = latest ? Math.min(100, 50 + (snapshots!.length * 8)) : 20;

  // 7. Medicaid receivable stability
  let receivableStability = 50;
  if (claims && claims.length > 0) {
    const approved = claims.filter(c => c.status === "approved" || c.status === "paid").length;
    receivableStability = Math.round((approved / claims.length) * 100);
  }

  // 8. Business credit bureau scores (proxy)
  const bureauScore = businessCredit;

  const factors: ScoreFactor[] = [
    { label: "Personal Credit Strength", value: personalCredit, weight: 15, icon: CreditCard, color: "text-prism-sky", description: "Based on open accounts and negative items" },
    { label: "PAYDEX / Business Credit", value: businessCredit, weight: 10, icon: Building2, color: "text-prism-indigo", description: "Business credit building progress" },
    { label: "Bureau Scores", value: bureauScore, weight: 10, icon: FileText, color: "text-prism-violet", description: "Business credit bureau score estimates" },
    { label: "Revenue Stability", value: revenueStability, weight: 15, icon: TrendingUp, color: "text-prism-teal", description: "Month-over-month revenue consistency" },
    { label: "Cash Flow Consistency", value: cashFlow, weight: 15, icon: DollarSign, color: "text-prism-lime", description: "Operating cash flow and reserves" },
    { label: "Debt Service Coverage", value: dscr, weight: 15, icon: BarChart3, color: "text-prism-amber", description: "Ability to service existing debt" },
    { label: "Bank Relationship", value: bankRelationship, weight: 10, icon: Landmark, color: "text-prism-orange", description: "Banking history depth" },
    { label: "Receivable Stability", value: receivableStability, weight: 10, icon: Users, color: "text-prism-rose", description: "Medicaid claim approval rates" },
  ];

  const totalScore = Math.round(
    factors.reduce((sum, f) => sum + (f.value * f.weight / 100), 0)
  );

  const getInterpretation = (score: number) => {
    if (score >= 90) return { label: "Highly Bankable", color: "text-prism-teal", variant: "default" as const };
    if (score >= 75) return { label: "Moderately Bankable", color: "text-prism-sky", variant: "default" as const };
    if (score >= 60) return { label: "Needs Improvement", color: "text-prism-amber", variant: "secondary" as const };
    return { label: "High Risk", color: "text-prism-rose", variant: "destructive" as const };
  };

  const interp = getInterpretation(totalScore);

  return (
    <div className="space-y-6 pb-8">
      <PageOverview
        title="Business Bankability Score"
        description="A composite score from 0-100 evaluating how attractive your business is to lenders, based on 8 key financial factors."
      />

      {/* Score Display */}
      <Card>
        <CardContent className="pt-8 pb-8">
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
          </div>
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
            const contribution = Math.round(factor.value * factor.weight / 100);
            return (
              <div key={factor.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${factor.color}`} />
                    <span className="text-sm font-medium">{factor.label}</span>
                    <span className="text-xs text-muted-foreground">({factor.weight}% weight)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{factor.value}</span>
                    <span className="text-xs text-muted-foreground">+{contribution} pts</span>
                  </div>
                </div>
                <Progress value={factor.value} className="h-1.5" />
                <p className="text-xs text-muted-foreground">{factor.description}</p>
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

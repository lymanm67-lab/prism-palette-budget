import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calculator, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageOverview from "@/components/PageOverview";

const DSCRCalculator = () => {
  const { household } = useHousehold();
  const householdId = household?.id;
  const [form, setForm] = useState({
    revenue: "",
    operatingExpenses: "",
    totalDebtPayments: "",
  });
  const [result, setResult] = useState<number | null>(null);

  // Pre-fill from latest snapshot
  const { data: latest } = useQuery({
    queryKey: ["dscr-snapshot", householdId],
    queryFn: async () => {
      if (!householdId) return null;
      const { data } = await supabase
        .from("agency_financial_snapshots")
        .select("*")
        .eq("household_id", householdId)
        .order("snapshot_month", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!householdId,
  });

  const prefill = () => {
    if (latest) {
      setForm({
        revenue: String(latest.monthly_revenue),
        operatingExpenses: String(latest.monthly_operating_expenses),
        totalDebtPayments: form.totalDebtPayments,
      });
    }
  };

  const calculate = () => {
    const rev = parseFloat(form.revenue) || 0;
    const opex = parseFloat(form.operatingExpenses) || 0;
    const debt = parseFloat(form.totalDebtPayments) || 0;

    if (debt <= 0) {
      setResult(999); // No debt = infinite coverage
      return;
    }

    const noi = rev - opex;
    setResult(Math.round((noi / debt) * 100) / 100);
  };

  const getInterpretation = (dscr: number) => {
    if (dscr >= 999) return { label: "No Debt Payments", color: "text-prism-teal", variant: "default" as const, desc: "No debt service obligations detected." };
    if (dscr >= 1.5) return { label: "Strong", color: "text-prism-teal", variant: "default" as const, desc: "Excellent debt service coverage. Lenders view this favorably." };
    if (dscr >= 1.25) return { label: "Healthy", color: "text-prism-sky", variant: "default" as const, desc: "Good coverage ratio. Most lenders require 1.25x minimum." };
    if (dscr >= 1.0) return { label: "Marginal", color: "text-prism-amber", variant: "secondary" as const, desc: "Just covering debt. Any revenue disruption creates risk." };
    return { label: "High Risk", color: "text-prism-rose", variant: "destructive" as const, desc: "Net operating income does not cover debt payments." };
  };

  return (
    <div className="space-y-6 pb-8">
      <PageOverview
        title="DSCR Calculator"
        description="Calculate your Debt Service Coverage Ratio — a key metric lenders use to evaluate your ability to repay loans from operating income."
        icon={Calculator}
        ttsScript="The DSCR Calculator helps you determine your Debt Service Coverage Ratio, a key metric lenders use."
        features={["Auto-prefill from financial data", "Lender benchmark comparison", "Risk interpretation"]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Calculate DSCR
              </CardTitle>
              {latest && (
                <Button variant="outline" size="sm" onClick={prefill}>
                  Prefill from Data
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              DSCR = Net Operating Income ÷ Total Debt Payments
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Monthly Revenue ($)</Label>
              <Input
                type="number"
                placeholder="e.g. 50000"
                value={form.revenue}
                onChange={(e) => setForm({ ...form, revenue: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Operating Expenses ($)</Label>
              <Input
                type="number"
                placeholder="e.g. 35000"
                value={form.operatingExpenses}
                onChange={(e) => setForm({ ...form, operatingExpenses: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Total Monthly Debt Payments ($)</Label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={form.totalDebtPayments}
                onChange={(e) => setForm({ ...form, totalDebtPayments: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Include all loan payments, lines of credit, and financing obligations.</p>
            </div>

            {form.revenue && form.operatingExpenses && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <span className="text-muted-foreground">Net Operating Income: </span>
                <span className="font-semibold">
                  ${((parseFloat(form.revenue) || 0) - (parseFloat(form.operatingExpenses) || 0)).toLocaleString()}
                </span>
              </div>
            )}

            <Button onClick={calculate} className="w-full">
              Calculate DSCR
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        {result !== null ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-8 pb-8 text-center">
                <p className="text-sm text-muted-foreground mb-2">Your DSCR</p>
                <p className={`text-6xl font-extrabold ${getInterpretation(result).color}`}>
                  {result >= 999 ? "∞" : `${result}x`}
                </p>
                <Badge variant={getInterpretation(result).variant} className="mt-3 text-sm px-4 py-1">
                  {getInterpretation(result).label}
                </Badge>
                <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto">
                  {getInterpretation(result).desc}
                </p>
              </CardContent>
            </Card>

            {/* Reference guide */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lender Benchmarks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { range: "Below 1.0x", label: "High Risk", desc: "Cannot cover debt from operations", icon: AlertTriangle, color: "text-prism-rose" },
                  { range: "1.0x – 1.24x", label: "Marginal", desc: "Minimal cushion — most lenders avoid", icon: AlertTriangle, color: "text-prism-amber" },
                  { range: "1.25x – 1.49x", label: "Healthy", desc: "Meets most SBA & bank requirements", icon: CheckCircle2, color: "text-prism-sky" },
                  { range: "1.5x+", label: "Strong", desc: "Preferred by lenders — room for growth", icon: TrendingUp, color: "text-prism-teal" },
                ].map((tier) => {
                  const Icon = tier.icon;
                  return (
                    <div key={tier.range} className="flex items-start gap-3 text-sm">
                      <Icon className={`h-4 w-4 mt-0.5 ${tier.color}`} />
                      <div>
                        <span className="font-mono font-semibold">{tier.range}</span>
                        <span className="mx-2">—</span>
                        <span className="font-medium">{tier.label}:</span>
                        <span className="text-muted-foreground ml-1">{tier.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="flex items-center justify-center min-h-[300px]">
            <CardContent className="text-center text-muted-foreground space-y-2">
              <Calculator className="h-12 w-12 mx-auto opacity-30" />
              <p className="font-medium">Enter Your Financial Data</p>
              <p className="text-sm">Calculate your Debt Service Coverage Ratio</p>
            </CardContent>
          </Card>
        )}
      </div>

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

export default DSCRCalculator;

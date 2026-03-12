import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Clock, DollarSign, TrendingDown, Users, Shield, Activity, Radar } from "lucide-react";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageOverview from "@/components/PageOverview";

interface RiskAlert {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  icon: typeof AlertTriangle;
}

const FinancialRiskRadar = () => {
  const { household } = useHousehold();
  const householdId = household?.id;

  const { data: snapshots } = useQuery({
    queryKey: ["risk-snapshots", householdId],
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
    queryKey: ["risk-claims", householdId],
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

  // Generate risk alerts based on data
  const alerts: RiskAlert[] = [];
  const latest = snapshots?.[0];
  const prev = snapshots?.[1];

  if (latest) {
    // Payroll risk
    const payrollDays = latest.biweekly_payroll > 0
      ? (latest.cash_reserves / latest.biweekly_payroll) * 14
      : 999;
    if (payrollDays < 30) {
      alerts.push({
        id: "payroll-critical",
        category: "Payroll",
        title: "Payroll runway critical",
        description: `Only ${Math.round(payrollDays)} days of payroll coverage remaining. Consider accelerating receivable collection.`,
        severity: "critical",
        icon: Clock,
      });
    } else if (payrollDays < 60) {
      alerts.push({
        id: "payroll-warning",
        category: "Payroll",
        title: "Payroll runway declining",
        description: `${Math.round(payrollDays)} days of payroll coverage. Monitor cash position closely.`,
        severity: "warning",
        icon: Clock,
      });
    }

    // Revenue volatility
    if (prev && latest.monthly_revenue > 0) {
      const revenueChange = ((latest.monthly_revenue - prev.monthly_revenue) / prev.monthly_revenue) * 100;
      if (revenueChange < -15) {
        alerts.push({
          id: "revenue-drop",
          category: "Revenue",
          title: "Revenue declined significantly",
          description: `Revenue dropped ${Math.abs(Math.round(revenueChange))}% from previous month. Investigate client census and billing.`,
          severity: "critical",
          icon: TrendingDown,
        });
      } else if (revenueChange < -5) {
        alerts.push({
          id: "revenue-dip",
          category: "Revenue",
          title: "Revenue trending down",
          description: `Revenue decreased ${Math.abs(Math.round(revenueChange))}% from previous month.`,
          severity: "warning",
          icon: TrendingDown,
        });
      }
    }

    // Client census
    if (prev && latest.client_census < prev.client_census) {
      const censusDrop = prev.client_census - latest.client_census;
      alerts.push({
        id: "census-drop",
        category: "Census",
        title: `Client census decreased by ${censusDrop}`,
        description: "Declining census impacts future revenue. Review intake pipeline and retention.",
        severity: censusDrop >= 3 ? "critical" : "warning",
        icon: Users,
      });
    }

    // Cash reserves
    if (latest.cash_reserves < latest.monthly_operating_expenses) {
      alerts.push({
        id: "reserves-low",
        category: "Cash",
        title: "Cash reserves below 1 month expenses",
        description: "Reserves should cover at least 2-3 months of operating expenses.",
        severity: "critical",
        icon: DollarSign,
      });
    }
  }

  // Claim denial trends
  if (claims && claims.length > 0) {
    const recentClaims = claims.slice(0, 50);
    const denied = recentClaims.filter(c => c.status === "denied").length;
    const denialRate = (denied / recentClaims.length) * 100;
    if (denialRate > 15) {
      alerts.push({
        id: "denial-high",
        category: "Claims",
        title: `Claim denial rate at ${Math.round(denialRate)}%`,
        description: "High denial rates reduce cash flow predictability. Review denial reasons and correct billing patterns.",
        severity: "critical",
        icon: AlertTriangle,
      });
    } else if (denialRate > 5) {
      alerts.push({
        id: "denial-moderate",
        category: "Claims",
        title: `Claim denial rate at ${Math.round(denialRate)}%`,
        description: "Monitor denial reasons to prevent escalation.",
        severity: "warning",
        icon: AlertTriangle,
      });
    }

    // Receivable delays
    const pending = claims.filter(c => c.status === "pending" || c.status === "submitted");
    const totalPending = pending.reduce((sum, c) => sum + Number(c.amount), 0);
    if (totalPending > 50000) {
      alerts.push({
        id: "receivable-high",
        category: "Receivables",
        title: `$${totalPending.toLocaleString()} in pending receivables`,
        description: "Large outstanding receivables increase cash flow risk. Consider receivable financing options.",
        severity: totalPending > 100000 ? "critical" : "warning",
        icon: DollarSign,
      });
    }
  }

  // No data alerts
  if (!latest) {
    alerts.push({
      id: "no-data",
      category: "Data",
      title: "No financial snapshots available",
      description: "Add monthly financial snapshots in the Survival Index to enable risk monitoring.",
      severity: "info",
      icon: Activity,
    });
  }

  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const warningCount = alerts.filter(a => a.severity === "warning").length;
  const overallRisk = criticalCount >= 2 ? "High" : criticalCount >= 1 || warningCount >= 2 ? "Moderate" : "Low";

  return (
    <div className="space-y-6 pb-8">
      <PageOverview
        title="Financial Risk Radar"
        description="Real-time monitoring of emerging financial risks across payroll, revenue, receivables, and operations."
        icon={Radar}
        ttsScript="The Financial Risk Radar monitors emerging financial risks across payroll, revenue, receivables, and operations."
        features={["Payroll risk monitoring", "Revenue volatility alerts", "Claim denial tracking"]}
      />

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={overallRisk === "High" ? "border-destructive/30" : overallRisk === "Moderate" ? "border-amber-500/30" : "border-prism-teal/30"}>
          <CardContent className="pt-6 text-center">
            <Shield className={`h-8 w-8 mx-auto mb-2 ${
              overallRisk === "High" ? "text-destructive" : overallRisk === "Moderate" ? "text-prism-amber" : "text-prism-teal"
            }`} />
            <p className="text-sm text-muted-foreground">Overall Risk Level</p>
            <p className={`text-2xl font-bold ${
              overallRisk === "High" ? "text-destructive" : overallRisk === "Moderate" ? "text-prism-amber" : "text-prism-teal"
            }`}>
              {overallRisk}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-destructive">{criticalCount}</p>
            <p className="text-sm text-muted-foreground">Critical Alerts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-prism-amber">{warningCount}</p>
            <p className="text-sm text-muted-foreground">Warning Alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Risk Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto opacity-30 mb-2" />
              <p className="font-medium">No active risk alerts</p>
              <p className="text-sm">Your financial metrics are within healthy ranges.</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const Icon = alert.icon;
              return (
                <div
                  key={alert.id}
                  className={`flex gap-3 rounded-lg border p-4 ${
                    alert.severity === "critical"
                      ? "border-destructive/30 bg-destructive/5"
                      : alert.severity === "warning"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-border"
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${
                    alert.severity === "critical" ? "text-destructive" : alert.severity === "warning" ? "text-prism-amber" : "text-muted-foreground"
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{alert.title}</span>
                      <Badge variant={alert.severity === "critical" ? "destructive" : "secondary"} className="text-xs">
                        {alert.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                  </div>
                </div>
              );
            })
          )}
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

export default FinancialRiskRadar;

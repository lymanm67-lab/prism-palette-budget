import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, TrendingUp, AlertTriangle, DollarSign, BarChart3, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import PageOverview from "@/components/PageOverview";

interface BankHealthMetrics {
  averageDailyBalance: number;
  monthlyDeposits: number;
  revenueStability: number; // 0-100
  nsfCount: number;
  depositVolatility: number; // 0-100 (lower is better)
  healthScore: number; // 0-100
  months: number;
}

const BankStatementAnalyzer = () => {
  const [metrics, setMetrics] = useState<BankHealthMetrics | null>(null);
  const [form, setForm] = useState({
    months: "6",
    avgBalance: "",
    monthlyDeposits: "",
    nsfCount: "0",
    lowestBalance: "",
    highestBalance: "",
  });

  const calculate = () => {
    const avg = parseFloat(form.avgBalance) || 0;
    const deposits = parseFloat(form.monthlyDeposits) || 0;
    const nsf = parseInt(form.nsfCount) || 0;
    const low = parseFloat(form.lowestBalance) || 0;
    const high = parseFloat(form.highestBalance) || avg;
    const months = parseInt(form.months) || 6;

    if (avg <= 0 || deposits <= 0) {
      toast.error("Please enter valid balance and deposit amounts");
      return;
    }

    const volatility = high > 0 ? Math.round(((high - low) / high) * 100) : 0;
    const stability = Math.max(0, 100 - volatility);

    // Health score calculation
    let score = 50;
    if (avg >= 10000) score += 15;
    else if (avg >= 5000) score += 10;
    else if (avg >= 2000) score += 5;

    if (deposits >= 20000) score += 15;
    else if (deposits >= 10000) score += 10;
    else if (deposits >= 5000) score += 5;

    score -= nsf * 8;
    score += Math.round(stability * 0.2);

    if (months >= 12) score += 5;
    else if (months >= 6) score += 2;

    score = Math.max(0, Math.min(100, score));

    setMetrics({
      averageDailyBalance: avg,
      monthlyDeposits: deposits,
      revenueStability: stability,
      nsfCount: nsf,
      depositVolatility: volatility,
      healthScore: score,
      months,
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-prism-teal";
    if (score >= 60) return "text-prism-amber";
    return "text-prism-rose";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Strong";
    if (score >= 60) return "Moderate";
    if (score >= 40) return "Needs Improvement";
    return "High Risk";
  };

  return (
    <div className="space-y-6 pb-8">
      <PageOverview
        title="Bank Statement Analyzer"
        description="Analyze your bank statement data to generate a Bank Health Score. Lenders review average balances, deposit consistency, and NSF activity when evaluating loan applications."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Statement Data Entry
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter aggregate data from your recent bank statements.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Months Analyzed</Label>
                <Input
                  type="number"
                  value={form.months}
                  onChange={(e) => setForm({ ...form, months: e.target.value })}
                  min="1"
                  max="24"
                />
              </div>
              <div className="space-y-2">
                <Label>NSF/Overdraft Count</Label>
                <Input
                  type="number"
                  value={form.nsfCount}
                  onChange={(e) => setForm({ ...form, nsfCount: e.target.value })}
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Average Daily Balance ($)</Label>
              <Input
                type="number"
                placeholder="e.g. 8500"
                value={form.avgBalance}
                onChange={(e) => setForm({ ...form, avgBalance: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Average Monthly Deposits ($)</Label>
              <Input
                type="number"
                placeholder="e.g. 25000"
                value={form.monthlyDeposits}
                onChange={(e) => setForm({ ...form, monthlyDeposits: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lowest Monthly Balance ($)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1200"
                  value={form.lowestBalance}
                  onChange={(e) => setForm({ ...form, lowestBalance: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Highest Monthly Balance ($)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 18000"
                  value={form.highestBalance}
                  onChange={(e) => setForm({ ...form, highestBalance: e.target.value })}
                />
              </div>
            </div>

            <Button onClick={calculate} className="w-full">
              Analyze Statements
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {metrics ? (
          <div className="space-y-4">
            {/* Health Score */}
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">Bank Health Score</p>
                <p className={`text-5xl font-extrabold ${getScoreColor(metrics.healthScore)}`}>
                  {metrics.healthScore}
                </p>
                <Badge variant={metrics.healthScore >= 60 ? "default" : "destructive"} className="mt-2">
                  {getScoreLabel(metrics.healthScore)}
                </Badge>
              </CardContent>
            </Card>

            {/* Metric cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs">Avg Daily Balance</span>
                  </div>
                  <p className="text-lg font-bold">${metrics.averageDailyBalance.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs">Monthly Deposits</span>
                  </div>
                  <p className="text-lg font-bold">${metrics.monthlyDeposits.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs">Revenue Stability</span>
                  </div>
                  <Progress value={metrics.revenueStability} className="h-2 mt-1" />
                  <p className="text-sm font-medium mt-1">{metrics.revenueStability}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs">NSF Occurrences</span>
                  </div>
                  <p className={`text-lg font-bold ${metrics.nsfCount > 0 ? 'text-prism-rose' : 'text-prism-teal'}`}>
                    {metrics.nsfCount}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lender Perspective</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {metrics.nsfCount > 0 && (
                  <p className="text-prism-rose">⚠️ {metrics.nsfCount} NSF occurrence(s) — lenders view this negatively. Maintain a buffer to avoid overdrafts.</p>
                )}
                {metrics.averageDailyBalance < 5000 && (
                  <p className="text-prism-amber">⚠️ Average daily balance is below $5,000 — most lenders prefer $5K+ for working capital loans.</p>
                )}
                {metrics.depositVolatility > 50 && (
                  <p className="text-prism-amber">⚠️ Deposit volatility is {metrics.depositVolatility}% — lenders prefer consistent revenue patterns.</p>
                )}
                {metrics.healthScore >= 80 && (
                  <p className="text-prism-teal">✅ Your bank statements present a strong profile. You're well-positioned for loan applications.</p>
                )}
                {metrics.months < 6 && (
                  <p className="text-muted-foreground">💡 Most lenders require 3-12 months of statements. Consider providing more history for stronger applications.</p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="flex items-center justify-center min-h-[300px]">
            <CardContent className="text-center text-muted-foreground space-y-2">
              <BarChart3 className="h-12 w-12 mx-auto opacity-30" />
              <p className="font-medium">Enter Your Statement Data</p>
              <p className="text-sm">Fill in the form to generate your Bank Health Score</p>
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

export default BankStatementAnalyzer;

import { useState } from 'react';
import { Brain, AlertTriangle, CheckCircle2, Info, Loader2, TrendingUp, Shield, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';

interface CreditIssue {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  action: string;
  accounts: string[];
}

interface Recommendation {
  priority: number;
  action: string;
  impact: string;
}

interface CreditAnalysis {
  summary: string;
  score_estimate: { low: number; high: number; label: string };
  issues: CreditIssue[];
  strengths: string[];
  recommendations: Recommendation[];
}

const severityConfig = {
  critical: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', badge: 'destructive' as const, label: 'Critical' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-500/10', badge: 'secondary' as const, label: 'Warning' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', badge: 'outline' as const, label: 'Info' },
};

export default function AiCreditAnalysis() {
  const { household } = useHousehold();
  const [analysis, setAnalysis] = useState<CreditAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());

  const runAnalysis = async () => {
    if (!household) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-credit-report', {
        body: { household_id: household.id },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setAnalysis(data.analysis);
      toast.success('Credit analysis complete');
    } catch (e: any) {
      toast.error(e.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleIssue = (idx: number) => {
    setExpandedIssues(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  if (!analysis) {
    return (
      <Card className="relative overflow-hidden border-dashed">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-accent/3" />
        <CardContent className="relative flex flex-col items-center justify-center py-10 gap-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Brain className="h-7 w-7 text-primary" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-semibold text-lg">AI Credit Report Analysis</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Let AI analyze your imported credit accounts to find errors, issues, and provide personalized recommendations to improve your score.
            </p>
          </div>
          <Button onClick={runAnalysis} disabled={loading} size="lg" className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Analyzing...' : 'Run AI Analysis'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = analysis.issues.filter(i => i.severity === 'critical').length;
  const warningCount = analysis.issues.filter(i => i.severity === 'warning').length;
  const sortedIssues = [...analysis.issues].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
        <CardHeader className="relative pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Credit Analysis
            </CardTitle>
            <Button variant="outline" size="sm" onClick={runAnalysis} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Re-analyze
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <p className="text-sm text-muted-foreground">{analysis.summary}</p>

          {/* AI Score Estimate */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <Shield className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">AI Estimated Score Range</p>
              <p className="text-xl font-bold">
                {analysis.score_estimate.low} – {analysis.score_estimate.high}
                <span className="text-sm font-normal text-muted-foreground ml-2">({analysis.score_estimate.label})</span>
              </p>
            </div>
          </div>

          {/* Issue Summary Badges */}
          <div className="flex gap-2 flex-wrap">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> {criticalCount} Critical Issue{criticalCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> {warningCount} Warning{warningCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {analysis.strengths.length > 0 && (
              <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200">
                <CheckCircle2 className="h-3 w-3" /> {analysis.strengths.length} Strength{analysis.strengths.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      {sortedIssues.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Issues Found</CardTitle>
            <CardDescription>Problems and potential errors on your credit report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedIssues.map((issue, idx) => {
              const config = severityConfig[issue.severity];
              const Icon = config.icon;
              const expanded = expandedIssues.has(idx);
              return (
                <div key={idx} className={`rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/30 ${config.bg}`} onClick={() => toggleIssue(idx)}>
                  <div className="flex items-start gap-2">
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{issue.title}</span>
                        <Badge variant={config.badge} className="text-[10px] h-4">{config.label}</Badge>
                      </div>
                      {expanded && (
                        <div className="mt-2 space-y-2 text-sm">
                          <p className="text-muted-foreground">{issue.description}</p>
                          <div className="flex items-start gap-1.5 text-primary">
                            <TrendingUp className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span className="font-medium">{issue.action}</span>
                          </div>
                          {issue.accounts.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {issue.accounts.map((name, i) => (
                                <Badge key={i} variant="outline" className="text-[10px]">{name}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Strengths & Recommendations */}
      <div className="grid gap-4 md:grid-cols-2">
        {analysis.strengths.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {analysis.strengths.map((s, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {analysis.recommendations.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.recommendations
                  .sort((a, b) => a.priority - b.priority)
                  .map((r, i) => (
                    <li key={i} className="text-sm space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                          {r.priority}
                        </span>
                        <span className="font-medium">{r.action}</span>
                      </div>
                      <p className="text-muted-foreground text-xs ml-7">{r.impact}</p>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

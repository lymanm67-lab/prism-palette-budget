import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Clock, CheckCircle2 } from 'lucide-react';
import { useMoneyRules } from '@/hooks/use-investment-v2';
import { useRuleExecutions } from '@/hooks/use-investment-v3';

export function AutomationLog({ planId }: { planId?: string }) {
  const { data: rules = [] } = useMoneyRules();
  const { data: executions = [] } = useRuleExecutions(planId);

  const active = rules.filter((r: any) => r.is_active);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Rule Automation Log</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Money rules created in the Money Rules tab are evaluated daily. When a trigger date is reached, the system logs an execution and sends you a notification to redirect the funds.
        </p>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Active rules</div><div className="text-xl font-bold">{active.length}</div></div>
          <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Executions logged</div><div className="text-xl font-bold">{executions.length}</div></div>
          <div className="rounded-lg bg-primary/10 p-3"><div className="text-xs text-muted-foreground">Status</div><div className="text-sm font-bold text-primary flex items-center gap-1"><Clock className="h-3 w-3" /> Daily 06:00 UTC</div></div>
        </div>

        <div>
          <h3 className="font-semibold text-sm mb-2">Recent executions</h3>
          {executions.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6 border rounded-lg">
              No rules have fired yet. Add a rule with a future trigger date in the Money Rules tab.
            </div>
          ) : (
            <div className="space-y-2">
              {executions.slice(0, 10).map((e: any) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Rule {e.rule_id.slice(0, 8)}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{e.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(e.executed_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

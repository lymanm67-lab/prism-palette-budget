import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useHpRules, useUpdateRule, useAddRule, useHpCoach } from '@/hooks/use-hp-planner';
import { useHomeBuyingMetrics } from '@/hooks/use-home-buying-metrics';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import RisksPanel from './RisksPanel';

const RULE_TYPES = [
  { value: 'max_payment', label: 'Max monthly payment ($)' },
  { value: 'min_emergency_fund', label: 'Min emergency fund (months)' },
  { value: 'max_hoa', label: 'Max HOA fee ($)' },
  { value: 'min_retirement_contribution', label: 'Min retirement contribution (%)' },
  { value: 'no_new_debt', label: 'No new debt' },
  { value: 'custom', label: 'Custom rule' },
];

export default function RulesEngine({ projectId }: { projectId: string }) {
  const { household } = useHousehold();
  const { data: rules = [] } = useHpRules(projectId);
  const updateRule = useUpdateRule();
  const addRule = useAddRule();
  const metrics = useHomeBuyingMetrics();
  const review = useHpCoach(projectId, 'rules_review', null);

  const [newRule, setNewRule] = useState({ rule_type: 'custom', label: '', value_numeric: '', value_text: '' });

  // Compute live violations
  const violations: { rule: any; reason: string }[] = [];
  const efMetric = metrics.find((m) => m.label === 'Emergency Fund');
  const dpMetric = metrics.find((m) => m.label === 'Down Payment');
  for (const r of rules) {
    if (!r.is_active) continue;
    if (r.rule_type === 'min_emergency_fund' && efMetric && r.value_numeric) {
      const months = parseFloat((efMetric.value || '0').replace(/[^\d.]/g, ''));
      if (months < Number(r.value_numeric)) {
        violations.push({ rule: r, reason: `Current emergency fund is ${months}mo, below your ${r.value_numeric}mo rule.` });
      }
    }
  }

  return (
    <div className="space-y-4">
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-prism-teal" />
            Personal Rules Engine
          </CardTitle>
          <p className="text-xs text-muted-foreground">Non-negotiable rules the AI coach enforces throughout your plan.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {violations.length > 0 && (
            <div className="rounded-lg border border-prism-rose/40 bg-prism-rose/10 p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold text-prism-rose">
                <AlertTriangle className="h-4 w-4" /> {violations.length} rule{violations.length > 1 ? 's' : ''} at risk
              </div>
              {violations.map((v, i) => (
                <div key={i} className="text-xs pl-6">{v.reason}</div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {rules.map((r: any) => (
              <div key={r.id} className="flex items-center gap-2 rounded-md border border-border/30 bg-card/30 px-3 py-2">
                <Switch checked={r.is_active} onCheckedChange={(v) => updateRule.mutate({ id: r.id, patch: { is_active: v } })} />
                <div className="flex-1 min-w-0">
                  <Input
                    value={r.label}
                    onChange={(e) => updateRule.mutate({ id: r.id, patch: { label: e.target.value } })}
                    className="h-7 border-0 px-0 focus-visible:ring-0 text-sm"
                  />
                </div>
                {r.value_numeric !== null && (
                  <Input
                    type="number"
                    value={r.value_numeric ?? ''}
                    onChange={(e) => updateRule.mutate({ id: r.id, patch: { value_numeric: e.target.value === '' ? null : +e.target.value } })}
                    className="h-7 w-28 text-sm"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-3 border-t border-border/30">
            <Select value={newRule.rule_type} onValueChange={(v) => setNewRule({ ...newRule, rule_type: v })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RULE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Rule label" value={newRule.label} onChange={(e) => setNewRule({ ...newRule, label: e.target.value })} className="h-8" />
            <Input placeholder="Value (optional)" type="number" value={newRule.value_numeric} onChange={(e) => setNewRule({ ...newRule, value_numeric: e.target.value })} className="h-8" />
            <Button
              size="sm"
              onClick={() => {
                if (!newRule.label.trim() || !household) return;
                addRule.mutate({
                  project_id: projectId,
                  household_id: household.id,
                  rule_type: newRule.rule_type,
                  label: newRule.label.trim(),
                  value_numeric: newRule.value_numeric === '' ? null : +newRule.value_numeric,
                  value_text: newRule.value_text || null,
                  is_active: true,
                }, {
                  onSuccess: () => { setNewRule({ rule_type: 'custom', label: '', value_numeric: '', value_text: '' }); toast.success('Rule added'); },
                });
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Rule
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm">AI Rule Review</CardTitle>
        </CardHeader>
        <CardContent>
          {review.data?.content_md ? (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{review.data.content_md}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Generating rule review…</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Sliders } from 'lucide-react';
import { useDeploymentRules, useUpdateDeploymentRules, DEFAULT_RULES, type DeploymentRules } from '@/hooks/use-deployment-rules';
import { useAccounts } from '@/hooks/use-finance-data';

const BUCKETS = [
  { key: 'fixed', label: 'Fixed Costs', desc: 'Rent, utilities, insurance, debt minimums, groceries' },
  { key: 'invest', label: 'Investments', desc: 'Roth IRA, 457(b), brokerage, retirement' },
  { key: 'savings', label: 'Savings Goals', desc: 'Emergency fund, kick-off, sub-goals' },
  { key: 'guiltfree', label: 'Guilt-Free Spending', desc: 'Date nights, hobbies, restaurants' },
] as const;

export default function PaycheckDeploymentRules() {
  const { data: serverRules, isLoading } = useDeploymentRules();
  const update = useUpdateDeploymentRules();
  const { data: accounts } = useAccounts();
  const [rules, setRules] = useState<DeploymentRules | null>(null);

  useEffect(() => {
    if (serverRules) setRules(serverRules);
  }, [serverRules]);

  if (isLoading || !rules) {
    return <div className="p-6 text-sm text-muted-foreground">Loading rules…</div>;
  }

  const targetSum = rules.fixed_target + rules.invest_target + rules.savings_target + rules.guiltfree_target;
  const sumOk = Math.abs(targetSum - 100) < 0.01;

  const savingsAccounts = (accounts || []).filter(a => a.account_type === 'savings' && a.is_active);
  const investmentAccounts = (accounts || []).filter(a => ((a.account_type as string) === 'investment' || (a.account_type as string) === 'brokerage') && a.is_active);

  const setField = (k: keyof DeploymentRules, v: any) => setRules(r => r ? { ...r, [k]: v } : r);

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-4xl mx-auto">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/coach"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Coach</Link>
        </Button>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">Paycheck Deployment Rules</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Ramit's Conscious Spending bands. Set the target % for each bucket and an acceptable range. Smart Allocation will use these
          every paycheck.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <Sliders className="h-4 w-4 text-prism-amber" /> Bands
            </CardTitle>
            <Badge variant={sumOk ? 'outline' : 'destructive'} className="text-[10px]">
              Targets sum: {targetSum.toFixed(0)}% {sumOk ? '✓' : '— must equal 100%'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {BUCKETS.map(b => {
            const min = (rules as any)[`${b.key}_min`] as number;
            const max = (rules as any)[`${b.key}_max`] as number;
            const target = (rules as any)[`${b.key}_target`] as number;
            return (
              <div key={b.key} className="space-y-2 pb-4 border-b border-border/40 last:border-0 last:pb-0">
                <div>
                  <div className="font-medium text-sm">{b.label}</div>
                  <div className="text-xs text-muted-foreground">{b.desc}</div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Min %</Label>
                    <Input type="number" min={0} max={100} value={min}
                      onChange={e => setField(`${b.key}_min` as any, Number(e.target.value))}
                      className="h-9 font-mono" />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Target %</Label>
                    <Input type="number" min={0} max={100} value={target}
                      onChange={e => setField(`${b.key}_target` as any, Number(e.target.value))}
                      className="h-9 font-mono font-semibold" />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Max %</Label>
                    <Input type="number" min={0} max={100} value={max}
                      onChange={e => setField(`${b.key}_max` as any, Number(e.target.value))}
                      className="h-9 font-mono" />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Destination Accounts</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Savings goes to</Label>
            <Select value={rules.savings_account_id || 'none'} onValueChange={v => setField('savings_account_id', v === 'none' ? null : v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Pick savings account" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {savingsAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Investments go to</Label>
            <Select value={rules.investment_account_id || 'none'} onValueChange={v => setField('investment_account_id', v === 'none' ? null : v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Pick investment account" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {investmentAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Coach Nag</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Remind me if money hasn't moved</Label>
              <p className="text-xs text-muted-foreground">Money Coach pings you within N hours of each paycheck.</p>
            </div>
            <Switch checked={rules.nag_enabled} onCheckedChange={v => setField('nag_enabled', v)} />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Hours:</Label>
            <Input type="number" min={1} max={168} value={rules.nag_hours}
              onChange={e => setField('nag_hours', Number(e.target.value))}
              className="h-9 w-24 font-mono" disabled={!rules.nag_enabled} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 sticky bottom-4">
        <Button onClick={() => update.mutate(rules)} disabled={update.isPending || !sumOk} className="flex-1">
          <Save className="h-3.5 w-3.5 mr-1.5" /> {update.isPending ? 'Saving…' : 'Save Rules'}
        </Button>
        <Button variant="outline" onClick={() => setRules(r => r ? { ...r, ...DEFAULT_RULES } : r)}>
          Reset defaults
        </Button>
      </div>
    </div>
  );
}

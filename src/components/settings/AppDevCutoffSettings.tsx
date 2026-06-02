import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RotateCcw, Save, ExternalLink, ShieldAlert } from 'lucide-react';
import { useAppDevLimits, useUpsertAppDevLimits, useResetAppDevPeriod } from '@/hooks/use-app-dev-cutoff';
import { useCategories } from '@/hooks/use-finance-data';
import { toast } from 'sonner';

const LOVABLE_LIMITS_URL = 'https://lovable.dev/settings/plans';

export function AppDevCutoffSettings() {
  const { data: limits, isLoading } = useAppDevLimits();
  const { data: categories } = useCategories();
  const upsert = useUpsertAppDevLimits();
  const reset = useResetAppDevPeriod();

  const [spend, setSpend] = useState('100');
  const [credits, setCredits] = useState('400');
  const [categoryId, setCategoryId] = useState<string>('');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (limits) {
      setSpend(String(limits.monthly_spend_limit));
      setCredits(String(limits.monthly_credit_limit));
      setCategoryId(limits.tracked_category_id ?? '');
      setEnabled(limits.is_enabled);
    }
  }, [limits]);

  const save = async () => {
    try {
      await upsert.mutateAsync({
        monthly_spend_limit: Number(spend) || 100,
        monthly_credit_limit: parseInt(credits, 10) || 400,
        tracked_category_id: categoryId || null,
        is_enabled: enabled,
      });
      toast.success('App-dev cutoff updated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    }
  };

  const doReset = async () => {
    if (!confirm('Reset this month\'s tracked spend & credit period to the 1st? This zeros the counters until new entries arrive.')) return;
    try {
      await reset.mutateAsync();
      toast.success('Period reset to month start');
    } catch (e: any) {
      toast.error(e.message || 'Reset failed');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>App-Dev Cutoff</CardTitle>
        <CardDescription>
          Soft monthly guardrails on Lovable / app development spend and build credits.
          Defaults: $100 and 400 credits per month, auto-resets on the 1st.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="app-dev-enabled" className="cursor-pointer">Enable cutoff tracking</Label>
          <Switch id="app-dev-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="spend">Monthly spend limit ($)</Label>
            <Input id="spend" type="number" min={0} step={5} value={spend} onChange={(e) => setSpend(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="credits">Monthly credit limit</Label>
            <Input id="credits" type="number" min={0} step={50} value={credits} onChange={(e) => setCredits(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Tracked category (for auto-spend)</Label>
          <Select value={categoryId || 'auto'} onValueChange={(v) => setCategoryId(v === 'auto' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Auto-detect by name" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto-detect (matches "Lovable" / "App Dev")</SelectItem>
              {(categories || []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Transactions in this category (expense, not transfers) count toward the spend limit this period.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={save} disabled={upsert.isPending || isLoading}>
            {upsert.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
          <Button variant="outline" onClick={doReset} disabled={reset.isPending}>
            {reset.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
            Reset period now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

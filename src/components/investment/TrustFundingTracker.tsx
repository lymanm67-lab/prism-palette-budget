import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Trophy, Target, Plus } from 'lucide-react';
import { InvestmentPlan } from '@/hooks/use-investment-plan';
import {
  useTrustContributions,
  useAddTrustContribution,
  useDeleteTrustContribution,
} from '@/hooks/use-trust-contributions';
import { useAssetTags, ASSET_KEY_LABELS, AssetKey } from '@/hooks/use-asset-tags';
import { formatCurrencyFull } from '@/lib/investment/projection';
import { toast } from '@/hooks/use-toast';

interface Props {
  plan: InvestmentPlan | null;
}

const MILESTONES = [25, 50, 75, 100];

export function TrustFundingTracker({ plan }: Props) {
  const { data: contributions = [] } = useTrustContributions(plan?.id);
  const { data: tags = [] } = useAssetTags(plan?.id);
  const addMut = useAddTrustContribution();
  const delMut = useDeleteTrustContribution(plan?.id);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sourceKey, setSourceKey] = useState<string>('none');
  const [note, setNote] = useState('');

  const goal = plan?.target_amount ?? 4_000_000;
  const goalName = (plan as any)?.legacy_goal_name ?? 'Legacy Trust';

  const total = useMemo(
    () => contributions.reduce((s, c) => s + Number(c.amount || 0), 0),
    [contributions],
  );
  const pct = goal > 0 ? Math.min(100, (total / goal) * 100) : 0;
  const remaining = Math.max(0, goal - total);

  const legacyAssetKeys = useMemo(
    () => tags.filter((t) => t.include_in_legacy).map((t) => t.asset_key as AssetKey),
    [tags],
  );

  const handleAdd = async () => {
    if (!plan?.id || !plan?.household_id) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast({ title: 'Enter an amount', variant: 'destructive' });
      return;
    }
    try {
      const sourceLabel =
        sourceKey && sourceKey !== 'none'
          ? ASSET_KEY_LABELS[sourceKey as AssetKey] ?? sourceKey
          : null;
      await addMut.mutateAsync({
        plan_id: plan.id,
        household_id: plan.household_id,
        contribution_date: date,
        amount: amt,
        source_asset_key: sourceKey === 'none' ? null : sourceKey,
        source_label: sourceLabel,
        note: note || null,
      });
      setAmount('');
      setNote('');
      toast({ title: 'Contribution added' });
    } catch (e: any) {
      toast({ title: 'Failed to add', description: e.message, variant: 'destructive' });
    }
  };

  const milestoneStatus = (m: number) => {
    const target = (goal * m) / 100;
    return total >= target ? 'reached' : 'pending';
  };

  return (
    <Card className="bg-card/60 backdrop-blur border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-prism-amber" />
          {goalName} Funding Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Progress</span>
            <span className="text-sm font-medium">{pct.toFixed(1)}%</span>
          </div>
          <Progress value={pct} className="h-3" />
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span>
              <span className="font-semibold">{formatCurrencyFull(total)}</span>
              <span className="text-muted-foreground"> contributed</span>
            </span>
            <span className="text-muted-foreground">
              Goal: <span className="font-medium text-foreground">{formatCurrencyFull(goal)}</span>
            </span>
            <span className="text-muted-foreground">
              Remaining: <span className="font-medium text-foreground">{formatCurrencyFull(remaining)}</span>
            </span>
          </div>
        </div>

        {/* Milestones */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {MILESTONES.map((m) => {
            const status = milestoneStatus(m);
            const target = (goal * m) / 100;
            return (
              <div
                key={m}
                className={`rounded-lg border p-3 text-center ${
                  status === 'reached'
                    ? 'border-prism-amber/60 bg-prism-amber/10'
                    : 'border-border/50'
                }`}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target className="h-3 w-3" />
                  <span className="text-xs font-medium">{m}%</span>
                </div>
                <div className="text-xs text-muted-foreground">{formatCurrencyFull(target)}</div>
                <Badge
                  variant={status === 'reached' ? 'default' : 'outline'}
                  className="mt-1 text-[10px]"
                >
                  {status === 'reached' ? 'Reached' : 'Pending'}
                </Badge>
              </div>
            );
          })}
        </div>

        {/* Add form */}
        <div className="rounded-lg border border-border/50 p-3 space-y-3">
          <div className="text-sm font-medium">Log a contribution</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="trust-amount" className="text-xs">Amount</Label>
              <Input
                id="trust-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="trust-date" className="text-xs">Date</Label>
              <Input
                id="trust-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Source asset</Label>
              <Select value={sourceKey} onValueChange={setSourceKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Unspecified —</SelectItem>
                  {legacyAssetKeys.length === 0 && (
                    <SelectItem value="primary_balance">
                      {ASSET_KEY_LABELS.primary_balance}
                    </SelectItem>
                  )}
                  {legacyAssetKeys.map((k) => (
                    <SelectItem key={k} value={k}>
                      {ASSET_KEY_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="trust-note" className="text-xs">Note (optional)</Label>
              <Input
                id="trust-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Q1 transfer"
              />
            </div>
          </div>
          <Button
            onClick={handleAdd}
            disabled={!plan?.id || addMut.isPending}
            className="w-full md:w-auto"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add contribution
          </Button>
        </div>

        {/* History */}
        <div>
          <div className="text-sm font-medium mb-2">Contribution history</div>
          {contributions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border/50 rounded-lg">
              No contributions logged yet.
            </p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {contributions.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-muted/30 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-medium">{formatCurrencyFull(Number(c.amount))}</span>
                      <span className="text-xs text-muted-foreground">{c.contribution_date}</span>
                      {c.source_label && (
                        <Badge variant="outline" className="text-[10px]">
                          {c.source_label}
                        </Badge>
                      )}
                    </div>
                    {c.note && (
                      <div className="text-xs text-muted-foreground truncate">{c.note}</div>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => delMut.mutate(c.id)}
                    disabled={delMut.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

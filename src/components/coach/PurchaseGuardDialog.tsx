import { useState, useMemo, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calendar as CalendarIcon, ShieldCheck, ShieldAlert, AlertCircle, Sparkles, Clock, ArrowLeftRight, Heart, Zap, Briefcase } from 'lucide-react';
import {
  detectFomo, computeFitScore, useCreatePurchaseGuardCheck,
  usePurchaseGuardContext, useOverridePattern,
} from '@/hooks/use-purchase-guard';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Classification = 'need' | 'want' | 'strategic';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export function PurchaseGuardDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<'inputs' | 'review'>('inputs');
  const [amount, setAmount] = useState<string>('');
  const [merchant, setMerchant] = useState('');
  const [purpose, setPurpose] = useState('');
  const [classification, setClassification] = useState<Classification>('want');
  const [overrideReason, setOverrideReason] = useState('');
  const [swapSubId, setSwapSubId] = useState<string>('');
  const [plannedDate, setPlannedDate] = useState<string>('');
  const [strategicAnswers, setStrategicAnswers] = useState({ ledgerAsset: false, growsIncome: false, builtsSkill: false, replacesCost: false });

  const ctx = usePurchaseGuardContext();
  const overrides = useOverridePattern();
  const create = useCreatePurchaseGuardCheck();

  useEffect(() => {
    if (!open) {
      setStep('inputs'); setAmount(''); setMerchant(''); setPurpose('');
      setClassification('want'); setOverrideReason(''); setSwapSubId('');
      setPlannedDate(''); setStrategicAnswers({ ledgerAsset: false, growsIncome: false, builtsSkill: false, replacesCost: false });
    }
  }, [open]);

  const amountNum = parseFloat(amount) || 0;
  const fomoSignals = useMemo(() => detectFomo(purpose), [purpose]);

  const fit = useMemo(() => computeFitScore({
    amount: amountNum,
    classification,
    fomoCount: fomoSignals.length,
    safeToSpendMonthly: ctx.safeToSpendMonthly,
    monthlyIncome: ctx.monthlyIncome,
    hasHighInterestDebt: ctx.hasHighInterestDebt,
    hasUnderfundedGoal: ctx.hasUnderfundedGoal,
    bufferPercent: ctx.bufferPercent,
  }), [amountNum, classification, fomoSignals.length, ctx]);

  // 24h wait if amount > $50 OR FOMO detected OR Fit < 60
  const waitHours = (amountNum > 50 || fomoSignals.length > 0 || fit.score < 60) ? 24 : 0;

  const verdictMeta = {
    'great-fit': { label: 'Great fit', icon: ShieldCheck, color: 'text-prism-teal', bg: 'bg-prism-teal/10 border-prism-teal/30' },
    'ok-fit': { label: 'OK fit', icon: ShieldCheck, color: 'text-prism-sky', bg: 'bg-prism-sky/10 border-prism-sky/30' },
    'risky': { label: 'Risky', icon: ShieldAlert, color: 'text-prism-amber', bg: 'bg-prism-amber/10 border-prism-amber/30' },
    'wait': { label: 'Wait', icon: AlertCircle, color: 'text-prism-rose', bg: 'bg-prism-rose/10 border-prism-rose/30' },
  }[fit.verdict];

  const VerdictIcon = verdictMeta.icon;

  const canReview = amountNum > 0 && purpose.trim().length > 3;

  const submit = async (decision: 'approved' | 'skipped' | 'overridden' | 'planned' | 'waiting') => {
    try {
      const strategicProof = classification === 'strategic' ? strategicAnswers : undefined;
      await create.mutateAsync({
        amount: amountNum,
        merchant: merchant || undefined,
        purpose,
        classification,
        fit_score: fit.score,
        fit_breakdown: fit.breakdown,
        fomo_signals: fomoSignals,
        wait_required_hours: decision === 'waiting' ? waitHours : 0,
        decision,
        override_reason: decision === 'overridden' ? overrideReason : undefined,
        planned_target_date: decision === 'planned' ? plannedDate || undefined : undefined,
        strategic_proof: strategicProof,
        swap_subscription_id: swapSubId || undefined,
      });
      const msg = {
        approved: 'Purchase logged — Coach will check in for the 7-day review.',
        skipped: 'Nice pause. The money stays in your plan.',
        overridden: 'Logged the override. Coach will look for repeat patterns.',
        planned: 'Added to planned purchases. Coach will help you save toward it.',
        waiting: 'On the 24-hour pause. Coach will remind you tomorrow.',
      }[decision];
      toast({ title: 'Saved', description: msg });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Could not save', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-prism-amber" />
            Purchase Guard
          </DialogTitle>
          <DialogDescription>
            Pause before you spend. Coach checks whether this protects or weakens your plan.
          </DialogDescription>
        </DialogHeader>

        {step === 'inputs' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pg-amount">Amount</Label>
                <Input id="pg-amount" type="number" inputMode="decimal" placeholder="0.00"
                  value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="pg-merchant">Merchant (optional)</Label>
                <Input id="pg-merchant" placeholder="e.g. Best Buy" value={merchant} onChange={e => setMerchant(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Type</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {([
                  { key: 'need', label: 'Need', icon: Heart, hint: 'Required to live or work' },
                  { key: 'want', label: 'Want', icon: Zap, hint: 'Quality of life' },
                  { key: 'strategic', label: 'Strategic', icon: Briefcase, hint: 'Asset, skill, or income' },
                ] as const).map(opt => {
                  const Icon = opt.icon;
                  const active = classification === opt.key;
                  return (
                    <button key={opt.key} type="button" onClick={() => setClassification(opt.key)}
                      className={`rounded-lg border px-3 py-2.5 text-left transition ${active ? 'border-prism-teal bg-prism-teal/10' : 'border-border/40 hover:border-border'}`}>
                      <div className="flex items-center gap-1.5 font-semibold text-sm">
                        <Icon className="h-3.5 w-3.5" />{opt.label}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{opt.hint}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="pg-purpose">Why do you want this?</Label>
              <Textarea id="pg-purpose" rows={3} placeholder="The more honest you are, the better Coach can help."
                value={purpose} onChange={e => setPurpose(e.target.value)} />
              {fomoSignals.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {fomoSignals.map(s => (
                    <Badge key={s} variant="outline" className="text-[10px] bg-prism-amber/10 border-prism-amber/30 text-prism-amber">
                      <AlertCircle className="h-2.5 w-2.5 mr-1" />{s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {classification === 'strategic' && (
              <div className="rounded-lg border border-prism-sky/30 bg-prism-sky/5 p-3 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-prism-sky">Strategic investment check</p>
                {([
                  { key: 'ledgerAsset', label: 'Becomes an asset I can sell or use' },
                  { key: 'growsIncome', label: 'Grows my income' },
                  { key: 'builtsSkill', label: 'Builds a skill with payoff' },
                  { key: 'replacesCost', label: 'Replaces a recurring cost' },
                ] as const).map(q => (
                  <label key={q.key} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={strategicAnswers[q.key]}
                      onChange={e => setStrategicAnswers(s => ({ ...s, [q.key]: e.target.checked }))} />
                    {q.label}
                  </label>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button disabled={!canReview} onClick={() => setStep('review')}>
                Run Purchase Guard
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className={`rounded-xl border p-4 ${verdictMeta.bg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <VerdictIcon className={`h-5 w-5 ${verdictMeta.color}`} />
                  <div>
                    <div className={`text-xs font-bold uppercase tracking-wider ${verdictMeta.color}`}>{verdictMeta.label}</div>
                    <div className="text-sm font-semibold">{fmt(amountNum)} · {classification}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase text-muted-foreground font-bold">Fit Score</div>
                  <div className={`font-mono text-2xl font-extrabold ${verdictMeta.color}`}>{fit.score}</div>
                </div>
              </div>
              <Progress value={fit.score} className="mt-3 h-1.5" />
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Why this score</p>
              {fit.breakdown.map((b, i) => (
                <div key={i} className="flex items-start justify-between gap-3 text-xs rounded-md bg-muted/30 px-2.5 py-1.5">
                  <div className="min-w-0">
                    <div className="font-medium">{b.label}</div>
                    <div className="text-muted-foreground">{b.reason}</div>
                  </div>
                  <span className={`font-mono font-bold shrink-0 ${b.delta > 0 ? 'text-prism-teal' : b.delta < 0 ? 'text-prism-rose' : 'text-muted-foreground'}`}>
                    {b.delta > 0 ? '+' : ''}{b.delta}
                  </span>
                </div>
              ))}
            </div>

            {overrides.hasPattern && (
              <div className="rounded-lg border border-prism-amber/30 bg-prism-amber/5 p-3 text-xs">
                <div className="font-bold text-prism-amber mb-1">Override pattern noticed</div>
                <p className="text-muted-foreground">
                  You've overridden Purchase Guard {overrides.count}× in the last 6 months. Coach will suggest a system rule (cap, alert, or sinking fund) next phase.
                </p>
              </div>
            )}

            <Tabs defaultValue={waitHours > 0 ? 'wait' : 'buy'} className="w-full">
              <TabsList className="grid grid-cols-4 w-full h-auto">
                <TabsTrigger value="buy" className="text-[11px]">Buy now</TabsTrigger>
                <TabsTrigger value="wait" className="text-[11px]">24h wait</TabsTrigger>
                <TabsTrigger value="plan" className="text-[11px]">Plan it</TabsTrigger>
                <TabsTrigger value="swap" className="text-[11px]">Swap</TabsTrigger>
              </TabsList>

              <TabsContent value="buy" className="space-y-3 pt-3">
                {fit.score < 60 && (
                  <div>
                    <Label htmlFor="pg-override">Why are you overriding the recommendation?</Label>
                    <Textarea id="pg-override" rows={2} placeholder="Be honest with future-you."
                      value={overrideReason} onChange={e => setOverrideReason(e.target.value)} />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button className="flex-1" disabled={create.isPending || (fit.score < 60 && !overrideReason.trim())}
                    onClick={() => submit(fit.score < 60 ? 'overridden' : 'approved')}>
                    Confirm purchase
                  </Button>
                  <Button variant="outline" onClick={() => submit('skipped')}>Skip it</Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Coach will ask in 7 days whether it was worth it.</p>
              </TabsContent>

              <TabsContent value="wait" className="space-y-3 pt-3">
                <div className="rounded-lg bg-prism-sky/5 border border-prism-sky/20 p-3 text-sm">
                  <div className="flex items-center gap-1.5 font-semibold mb-1">
                    <Clock className="h-3.5 w-3.5 text-prism-sky" /> Sleep on it for 24 hours
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Most regret happens inside the first day. If you still want it tomorrow, it's a stronger yes.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => submit('waiting')}>Start 24h pause</Button>
                  <Button variant="outline" onClick={() => submit('skipped')}>Skip it</Button>
                </div>
              </TabsContent>

              <TabsContent value="plan" className="space-y-3 pt-3">
                <div>
                  <Label htmlFor="pg-plan-date">Target date</Label>
                  <Input id="pg-plan-date" type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Coach will track this as a planned purchase and suggest a weekly set-aside.
                  </p>
                </div>
                <Button className="w-full" disabled={!plannedDate} onClick={() => submit('planned')}>
                  <CalendarIcon className="h-3.5 w-3.5 mr-1.5" /> Add to planned purchases
                </Button>
              </TabsContent>

              <TabsContent value="swap" className="space-y-3 pt-3">
                <p className="text-xs text-muted-foreground">
                  One-in, one-out: pick a subscription to cancel to fund this purchase.
                </p>
                {ctx.activeSubs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No active subscriptions to swap.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {ctx.activeSubs.slice(0, 8).map(s => (
                      <button key={s.id} type="button" onClick={() => setSwapSubId(s.id)}
                        className={`w-full flex items-center justify-between rounded-md border px-2.5 py-2 text-xs transition ${swapSubId === s.id ? 'border-prism-teal bg-prism-teal/10' : 'border-border/40 hover:border-border'}`}>
                        <span className="capitalize truncate">{s.merchant}</span>
                        <span className="font-mono text-muted-foreground">{fmt(s.monthly)}/mo</span>
                      </button>
                    ))}
                  </div>
                )}
                <Button className="w-full" disabled={!swapSubId} onClick={() => submit('approved')}>
                  <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" /> Swap and approve
                </Button>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep('inputs')}>← Edit details</Button>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Purchase Guard v2 — behavioral dialog before completing a discretionary purchase.
 * Extends existing Purchase Guard system with:
 *  - Need vs Want
 *  - "Will Future You thank you?"
 *  - Legacy Worth acknowledgement
 *  - 24-hour cooling-off timer
 *  - Opportunity-cost framing
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { AlertTriangle, Clock, Sparkles, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useOpportunityCost } from '@/hooks/use-financial-os';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  amount: number;
  merchant?: string;
  category?: string;
  onOutcome?: (decision: 'approved' | 'waited' | 'skipped') => void;
}

export function PurchaseGuardV2Dialog({ open, onOpenChange, amount, merchant, category, onOutcome }: Props) {
  const { household } = useHousehold();
  const oc = useOpportunityCost(amount, category);

  const [needwant, setNeedwant] = useState<string>('');
  const [futureYou, setFutureYou] = useState<string>('');
  const [canWait, setCanWait] = useState<string>('');
  const [ack, setAck] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const emotional = (oc?.emotionalScore ?? 0) >= 0.5;

  const record = async (decision: 'approved' | 'waited' | 'skipped') => {
    if (!household) return;
    setSaving(true);
    try {
      await (supabase as any).from('purchase_guard_checks').insert({
        household_id: household.id,
        amount,
        merchant,
        classification: needwant || 'unknown',
        decision,
        is_emotional: emotional,
        needwant,
        future_you_answer: futureYou,
        legacy_impact_ack: ack,
        days_delayed_freedom: oc?.daysDelayedFreedom ?? null,
        legacy_worth_delta: oc?.legacyWorthDelta ?? null,
        notes: reason,
      });
      onOutcome?.(decision);
      onOpenChange(false);
      toast({
        title: decision === 'approved' ? 'Purchase logged' : decision === 'waited' ? 'Waiting 24 hours' : 'Skipped — well done',
      });
    } catch (e: any) {
      toast({ title: 'Failed to log', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-prism-amber" />
            Purchase Guard
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className={emotional ? 'p-3 border-prism-rose/50 bg-prism-rose/5' : 'p-3'}>
            <div className="flex items-start gap-2">
              {emotional && <AlertTriangle className="h-4 w-4 text-prism-rose shrink-0 mt-0.5" />}
              <div className="flex-1">
                <div className="text-sm">
                  <b>{merchant || 'Purchase'}</b> · ${amount.toFixed(0)}
                </div>
                {oc && (
                  <>
                    <p className="text-xs text-muted-foreground mt-1">{oc.headline}</p>
                    <p className="text-xs text-muted-foreground">{oc.detail}</p>
                    {emotional && (
                      <p className="text-xs text-prism-rose mt-1">
                        Emotional-spend signals: {oc.emotionalReasons.join(', ')}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </Card>

          <div>
            <Label className="text-xs">Is this a need or a want?</Label>
            <RadioGroup value={needwant} onValueChange={setNeedwant} className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="need" /> Need</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="want" /> Want</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="wish" /> Wish</label>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-xs">Will Future You thank Present You?</Label>
            <RadioGroup value={futureYou} onValueChange={setFutureYou} className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="yes" /> Yes</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="maybe" /> Maybe</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="no" /> No</label>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-xs">Can this wait 24 hours?</Label>
            <RadioGroup value={canWait} onValueChange={setCanWait} className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="yes" /> Yes</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="no" /> No — needed today</label>
            </RadioGroup>
          </div>

          <label className="flex items-start gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} className="mt-0.5" />
            <span className="text-muted-foreground">I acknowledge this may reduce my Legacy Worth by ~${Math.abs(oc?.legacyWorthDelta ?? 0).toFixed(2)}.</span>
          </label>

          <div>
            <Label className="text-xs">Why are you making this purchase? (optional)</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} className="min-h-[60px] text-sm" placeholder="Adds context Coach can learn from…" />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => record('skipped')} disabled={saving} className="w-full sm:w-auto">
            <Heart className="h-3.5 w-3.5 mr-1.5" /> Skip — protect Freedom
          </Button>
          <Button variant="secondary" onClick={() => record('waited')} disabled={saving} className="w-full sm:w-auto">
            <Clock className="h-3.5 w-3.5 mr-1.5" /> Wait 24 hours
          </Button>
          <Button onClick={() => record('approved')} disabled={saving || !needwant} className="w-full sm:w-auto">
            Continue purchase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

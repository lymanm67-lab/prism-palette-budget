import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Pause, ArrowRight, Star, Clock } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useGuardrailSettings } from '@/hooks/use-spend-guardrails';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onClose: () => void;
  overageAmount: number;
  limitType: 'daily' | 'weekly';
  onContinue: () => void;
  onDelay: () => void;
}

export function GuardrailInterventionModal({ open, onClose, overageAmount, limitType, onContinue, onDelay }: Props) {
  const { formatCurrency } = useCurrency();
  const { household } = useHousehold();
  const { data: settings } = useGuardrailSettings();
  const qc = useQueryClient();
  const [multiUseScore, setMultiUseScore] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const coolingEnabled = !!(settings?.cooling_off_threshold && overageAmount >= (settings.cooling_off_threshold ?? Infinity));
  const multiUseEnabled = settings?.multi_use_check_enabled ?? false;
  const coolingHours = settings?.cooling_off_hours ?? 48;

  const handleCoolingOff = async () => {
    if (!household?.id) return;
    setSaving(true);
    try {
      const expiresAt = new Date(Date.now() + coolingHours * 3600000).toISOString();
      const { error } = await supabase
        .from('guardrail_pending_purchases' as any)
        .insert({
          household_id: household.id,
          amount: overageAmount,
          description: description || 'Unnamed purchase',
          multi_use_score: multiUseScore,
          expires_at: expiresAt,
        } as any);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['pending-purchases'] });
      toast.success(`Purchase added to ${coolingHours}-hour cooling-off list`);
      onDelay();
      onClose();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2 text-prism-orange">
            <AlertTriangle className="h-5 w-5" />
            Spending Limit Reached
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="rounded-xl bg-prism-orange/10 border border-prism-orange/20 p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">
              You're about to exceed your {limitType} budget by
            </p>
            <p className="font-display text-3xl font-bold text-prism-orange">
              {formatCurrency(overageAmount)}
            </p>
          </div>

          {/* Multi-Use Check */}
          {multiUseEnabled && (
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-prism-violet" />
                How many uses will this item get?
              </Label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setMultiUseScore(n)}
                    className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-all ${
                      multiUseScore === n
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/40 border-border/40 hover:border-primary/40'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">1 = single-use, 5 = daily use. Avoid single-use purchases.</p>
              {multiUseScore === 1 && (
                <p className="text-xs text-prism-rose font-medium">⚠️ Single-use items rarely justify exceeding your budget.</p>
              )}
            </div>
          )}

          {/* Description for cooling-off */}
          {coolingEnabled && (
            <div className="space-y-1.5">
              <Label className="text-xs">What's the purchase?</Label>
              <Input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. New headphones"
                className="h-9 text-sm"
              />
            </div>
          )}

          <p className="text-sm text-muted-foreground text-center">
            Take a moment to consider — is this purchase necessary right now?
          </p>

          <div className="space-y-2">
            {coolingEnabled && (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 border-prism-orange/30"
                onClick={handleCoolingOff}
                disabled={saving}
              >
                <Clock className="h-5 w-5 text-prism-orange" />
                <div className="text-left">
                  <p className="text-sm font-medium">Start {coolingHours}-Hour Cooling Off</p>
                  <p className="text-[10px] text-muted-foreground">Revisit after the waiting period</p>
                </div>
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => { onDelay(); onClose(); }}
            >
              <Pause className="h-5 w-5 text-prism-teal" />
              <div className="text-left">
                <p className="text-sm font-medium">Delay Purchase</p>
                <p className="text-[10px] text-muted-foreground">Sleep on it — revisit tomorrow</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => { onContinue(); onClose(); }}
            >
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <p className="text-sm font-medium">Continue Anyway</p>
                <p className="text-[10px] text-muted-foreground">I understand this exceeds my limit</p>
              </div>
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center italic">
            "Most people don't fail financially because they lack information — they fail in the moment of decision."
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

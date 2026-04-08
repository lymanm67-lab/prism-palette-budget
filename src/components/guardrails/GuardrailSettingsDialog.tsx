import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Shield, Loader2, Clock, Layers } from 'lucide-react';
import { useGuardrailSettings, useUpsertGuardrailSettings } from '@/hooks/use-spend-guardrails';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GuardrailSettingsDialog({ open, onClose }: Props) {
  const { data: settings } = useGuardrailSettings();
  const upsert = useUpsertGuardrailSettings();

  const [dailyLimit, setDailyLimit] = useState('');
  const [weeklyLimit, setWeeklyLimit] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [coolingOffThreshold, setCoolingOffThreshold] = useState('');
  const [coolingOffHours, setCoolingOffHours] = useState('48');
  const [multiUseCheck, setMultiUseCheck] = useState(false);

  useEffect(() => {
    if (settings) {
      setDailyLimit(settings.daily_limit ? String(settings.daily_limit) : '');
      setWeeklyLimit(settings.weekly_limit ? String(settings.weekly_limit) : '');
      setIsEnabled(settings.is_enabled ?? true);
      setCoolingOffThreshold(settings.cooling_off_threshold ? String(settings.cooling_off_threshold) : '');
      setCoolingOffHours(settings.cooling_off_hours ? String(settings.cooling_off_hours) : '48');
      setMultiUseCheck(settings.multi_use_check_enabled ?? false);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({
        daily_limit: dailyLimit ? parseFloat(dailyLimit) : null,
        weekly_limit: weeklyLimit ? parseFloat(weeklyLimit) : null,
        is_enabled: isEnabled,
        cooling_off_threshold: coolingOffThreshold ? parseFloat(coolingOffThreshold) : null,
        cooling_off_hours: coolingOffHours ? parseInt(coolingOffHours) : 48,
        multi_use_check_enabled: multiUseCheck,
      });
      toast.success('Guardrail settings saved');
      onClose();
    } catch {
      toast.error('Failed to save settings');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Smart Spend Guardrails
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <p className="text-sm text-muted-foreground">
            Set spending limits to get real-time feedback and stay on track. Think of it as your financial coach — supportive, not restrictive.
          </p>

          <div className="flex items-center justify-between">
            <Label htmlFor="guardrail-enabled" className="text-sm font-medium">Enable Guardrails</Label>
            <Switch id="guardrail-enabled" checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="daily-limit" className="text-sm">Daily Spending Limit</Label>
              <Input
                id="daily-limit"
                type="number"
                min="0"
                step="5"
                placeholder="e.g. 75"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">Leave empty to skip daily tracking</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weekly-limit" className="text-sm">Weekly Spending Limit</Label>
              <Input
                id="weekly-limit"
                type="number"
                min="0"
                step="25"
                placeholder="e.g. 500"
                value={weeklyLimit}
                onChange={(e) => setWeeklyLimit(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">Leave empty to skip weekly tracking</p>
            </div>
          </div>

          {/* Cooling-Off Rule */}
          <div className="pt-3 border-t border-border/40 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-prism-orange" />
              <p className="text-sm font-medium">48-Hour Cooling-Off Rule</p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Purchases above this amount trigger a waiting period before you can proceed.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cooling-threshold" className="text-sm">Threshold ($)</Label>
                <Input
                  id="cooling-threshold"
                  type="number"
                  min="0"
                  step="25"
                  placeholder="e.g. 100"
                  value={coolingOffThreshold}
                  onChange={(e) => setCoolingOffThreshold(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cooling-hours" className="text-sm">Wait (hours)</Label>
                <Input
                  id="cooling-hours"
                  type="number"
                  min="1"
                  max="168"
                  value={coolingOffHours}
                  onChange={(e) => setCoolingOffHours(e.target.value)}
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Leave threshold empty to disable</p>
          </div>

          {/* Multi-Use Check */}
          <div className="pt-3 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-prism-violet" />
                <div>
                  <p className="text-sm font-medium">Multi-Use Check</p>
                  <p className="text-[10px] text-muted-foreground">Ask "how many uses will this get?" (1-5) before purchase</p>
                </div>
              </div>
              <Switch id="multi-use" checked={multiUseCheck} onCheckedChange={setMultiUseCheck} />
            </div>
          </div>

          <Button className="w-full" onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

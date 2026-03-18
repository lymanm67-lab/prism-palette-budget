import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Shield, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    if (settings) {
      setDailyLimit(settings.daily_limit ? String(settings.daily_limit) : '');
      setWeeklyLimit(settings.weekly_limit ? String(settings.weekly_limit) : '');
      setIsEnabled(settings.is_enabled ?? true);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({
        daily_limit: dailyLimit ? parseFloat(dailyLimit) : null,
        weekly_limit: weeklyLimit ? parseFloat(weeklyLimit) : null,
        is_enabled: isEnabled,
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

          <Button className="w-full" onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

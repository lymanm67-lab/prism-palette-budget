import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Shield, Zap, Leaf, Loader2 } from 'lucide-react';
import { useModeSettings, useUpsertModeSettings, type FinancialMode, MODE_CONFIG } from '@/hooks/use-financial-mode';
import { toast } from 'sonner';

const modeOptions: { key: FinancialMode; icon: typeof Shield; description: string }[] = [
  { key: 'guardrail', icon: Shield, description: 'More protection lowers your Safe-to-Spend' },
  { key: 'balanced', icon: Zap, description: 'Moderate balance of protection and flexibility' },
  { key: 'greenlight', icon: Leaf, description: 'More flexibility increases your Safe-to-Spend' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ModeSettingsDialog({ open, onClose }: Props) {
  const { data: settings } = useModeSettings();
  const upsert = useUpsertModeSettings();

  const [selectedMode, setSelectedMode] = useState<FinancialMode>(
    (settings?.current_mode as FinancialMode) || 'guardrail'
  );
  const [buffer, setBuffer] = useState<number>(settings?.buffer_percent ?? 20);

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({ current_mode: selectedMode, buffer_percent: buffer });
      toast.success(`Switched to ${MODE_CONFIG[selectedMode].label} Mode`);
      onClose();
    } catch {
      toast.error('Failed to save mode settings');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Financial Mode</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <p className="text-sm text-muted-foreground">
            Choose how much protection you want. You can change this anytime.
          </p>

          {/* Mode selection */}
          <div className="grid gap-2">
            {modeOptions.map(opt => {
              const config = MODE_CONFIG[opt.key];
              const isSelected = selectedMode === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    setSelectedMode(opt.key);
                    setBuffer(config.bufferDefault);
                  }}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-border/80'
                  }`}
                >
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    <opt.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-display text-sm font-bold">{config.label} Mode</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Buffer slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Safety Buffer</Label>
              <span className="text-sm font-semibold">{buffer}%</span>
            </div>
            <Slider
              value={[buffer]}
              onValueChange={(v) => setBuffer(v[0])}
              min={0}
              max={40}
              step={5}
            />
            <p className="text-[10px] text-muted-foreground">
              Higher buffer = more conservative Safe-to-Spend
            </p>
          </div>

          <Button className="w-full" onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Mode
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

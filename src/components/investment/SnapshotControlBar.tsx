import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RotateCcw, Save, SlidersHorizontal } from 'lucide-react';

export interface SnapshotControls {
  returnPct: number;
  horizonAge: number;
  futureDollars: boolean;
}

interface Props {
  controls: SnapshotControls;
  onChange: (next: SnapshotControls) => void;
  onReset: () => void;
  onSave?: () => void;
  saving?: boolean;
  dirty?: boolean;
}

export function SnapshotControlBar({ controls, onChange, onReset, onSave, saving, dirty }: Props) {
  const set = (patch: Partial<SnapshotControls>) => onChange({ ...controls, ...patch });

  return (
    <Card className="sticky top-2 z-20 border-primary/30 bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/70">
      <CardContent className="p-3 md:p-4">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Live model controls</span>
          {dirty && (
            <Badge variant="outline" className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px]">
              Unsaved preview
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onReset} className="h-8">
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
            </Button>
            {onSave && (
              <Button size="sm" onClick={onSave} disabled={!dirty || saving} className="h-8">
                <Save className="h-3.5 w-3.5 mr-1" /> {saving ? 'Saving…' : 'Save as defaults'}
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 items-end">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label className="text-xs text-muted-foreground">Expected return</Label>
              <span className="text-sm font-semibold tabular-nums">{controls.returnPct.toFixed(1)}%</span>
            </div>
            <Slider
              min={4}
              max={10}
              step={0.5}
              value={[controls.returnPct]}
              onValueChange={([v]) => set({ returnPct: v })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label className="text-xs text-muted-foreground">Horizon age</Label>
              <span className="text-sm font-semibold tabular-nums">{controls.horizonAge}</span>
            </div>
            <Slider
              min={65}
              max={90}
              step={1}
              value={[controls.horizonAge]}
              onValueChange={([v]) => set({ horizonAge: v })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Dollar view</Label>
              <p className="text-sm font-medium">{controls.futureDollars ? 'Future dollars' : "Today's dollars"}</p>
            </div>
            <Switch
              checked={controls.futureDollars}
              onCheckedChange={(v) => set({ futureDollars: v })}
              aria-label="Toggle future dollars"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

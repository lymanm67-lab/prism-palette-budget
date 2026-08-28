import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { DEFAULT_SENSITIVITY, disputeCredit, type Sensitivity } from '@/lib/credit/triBureauModel';

export default function TriBureauSensitivityPanel({
  value,
  onChange,
}: {
  value: Sensitivity;
  onChange: (s: Sensitivity) => void;
}) {
  const set = (patch: Partial<Sensitivity>) => onChange({ ...value, ...patch });
  const changed = JSON.stringify(value) !== JSON.stringify(DEFAULT_SENSITIVITY);

  return (
    <Card className="glass-card border-prism-sky/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-prism-sky" /> Sensitivity Controls
            </CardTitle>
            <CardDescription>
              Change the modeling assumptions and watch every score range above move. Use this to see how much
              of your projection depends on optimistic timing.
            </CardDescription>
          </div>
          {changed && (
            <Button variant="outline" size="sm" onClick={() => onChange(DEFAULT_SENSITIVITY)} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Reset assumptions
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Utilization averaging window</Label>
          <div className="flex items-center gap-3">
            <Slider min={1} max={6} step={1} value={[value.utilWindowMonths]} onValueChange={([v]) => set({ utilWindowMonths: v })} className="flex-1" />
            <span className="text-sm font-mono w-16 text-right">{value.utilWindowMonths} cyc</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            1 cycle = the pay-down reports immediately. Higher values blend old balances in, so gains show up slower —
            the conservative view for a lender pulling a 2–3 month history.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Inquiry scoring window</Label>
          <div className="flex items-center gap-3">
            <Slider min={6} max={24} step={1} value={[value.inquiryWindowMonths]} onValueChange={([v]) => set({ inquiryWindowMonths: v })} className="flex-1" />
            <span className="text-sm font-mono w-16 text-right">{value.inquiryWindowMonths} mo</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            FICO's published window is 12 months (inquiries stay visible 24). Raise it to stress-test a
            lender-overlay view that looks back further.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Assumed dispute deletion lag</Label>
          <div className="flex items-center gap-3">
            <Slider min={0} max={6} step={1} value={[value.disputeLagMonths]} onValueChange={([v]) => set({ disputeLagMonths: v })} className="flex-1" />
            <span className="text-sm font-mono w-16 text-right">{value.disputeLagMonths} mo</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {Math.round(disputeCredit(value.disputeLagMonths) * 100)}% of the dispute benefit is credited at this
            timing. Bureaus have 30 days per round, and round 1 rarely deletes — 2+ months is realistic.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

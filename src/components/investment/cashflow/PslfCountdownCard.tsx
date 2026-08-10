import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { money } from '@/lib/retirement/investmentTracker';
import { monthLabel, type PslfStatus, type EngineConfig } from '@/lib/retirement/cashflowEngine';

interface Props {
  pslf: PslfStatus;
  config: EngineConfig;
  onPatch: (patch: Partial<EngineConfig>) => void;
}

export function PslfCountdownCard({ pslf, config, onPatch }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          Student Loan Freedom Countdown
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          {money(390)}/month IDR payment beginning January 2027 · PSLF · 65 qualifying payments at start.
          This payment is committed household cash flow, not an investment.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <Stat label="Payments completed" value={String(pslf.completed)} />
          <Stat label="Payments remaining" value={String(pslf.remaining)} />
          <Stat label="Percent complete" value={`${pslf.pctComplete.toFixed(1)}%`} />
          <Stat label="Monthly payment" value={money(pslf.monthlyPayment)} />
        </div>
        <Progress value={pslf.pctComplete} className="h-2" />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <Stat label="Estimated forgiveness month" value={monthLabel(pslf.estimatedForgivenessMonth).split(' ')[0]} />
          <Stat label="Estimated forgiveness year" value={pslf.estimatedForgivenessMonth.slice(0, 4)} />
          <Stat label="Actual forgiveness date" value={pslf.actualForgivenessMonth ? monthLabel(pslf.actualForgivenessMonth) : 'Not yet confirmed'} />
          <Stat label="Cash flow released" value={`${money(390)}/mo`} />
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium">
            <span className="rounded-md bg-card px-2 py-1 border border-border">Student loan {money(390)}/mo</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="rounded-md bg-card px-2 py-1 border border-border">PSLF forgiveness</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="rounded-md bg-card px-2 py-1 border border-border">Retirement {money(390)}/mo</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="rounded-md bg-card px-2 py-1 border border-border">Compounding</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="rounded-md bg-primary/10 px-2 py-1 border border-primary/30">Legacy</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Next destination: retirement investments. This is not lifestyle spending — it becomes permanent
            retirement investing.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Qualifying payments completed</Label>
            <Input
              type="number"
              min={0}
              max={65}
              value={config.pslfPaymentsCompleted}
              onChange={(e) => onPatch({ pslfPaymentsCompleted: Number(e.target.value) || 0 })}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Actual forgiveness month</Label>
            <Input
              type="month"
              value={config.pslfActualMonth ?? ''}
              onChange={(e) => onPatch({ pslfActualMonth: e.target.value || null })}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Forgiveness confirmed</Label>
            <div className="flex items-center gap-2 h-8">
              <Switch checked={config.pslfConfirmed} onCheckedChange={(v) => onPatch({ pslfConfirmed: v })} />
              <Badge variant={config.pslfConfirmed ? 'default' : 'outline'} className="text-[10px]">
                {config.pslfConfirmed ? 'YES — $390 redirected' : 'NO — $390 still a loan payment'}
              </Badge>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          The $390 reallocation activates only when forgiveness is confirmed — never on the projected date alone.
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums mt-0.5">{value}</p>
    </div>
  );
}

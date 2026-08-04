import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function MhNumberField({
  label, value, onCommit, suffix, step = 1,
}: {
  label: string;
  value: number | null | undefined;
  onCommit: (v: number) => void;
  suffix?: string;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          step={step}
          defaultValue={value ?? 0}
          key={String(value)}
          onBlur={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v) && v !== value) onCommit(v);
          }}
          className={cn('h-9', suffix && 'pr-9')}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function MhTextField({
  label, value, onCommit, placeholder,
}: {
  label: string;
  value: string | null | undefined;
  onCommit: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        defaultValue={value ?? ''}
        key={value ?? ''}
        placeholder={placeholder}
        onBlur={(e) => {
          if (e.target.value !== (value ?? '')) onCommit(e.target.value);
        }}
        className="h-9"
      />
    </div>
  );
}

export function MhStat({
  label, value, hint, tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'good' | 'warn' | 'bad' | 'neutral';
}) {
  const toneClass =
    tone === 'good' ? 'text-prism-teal'
      : tone === 'warn' ? 'text-prism-amber'
        : tone === 'bad' ? 'text-prism-rose'
          : 'text-foreground';
  return (
    <Card className="bg-card/60 backdrop-blur border-border/60">
      <CardContent className="p-4 space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn('text-xl font-bold tabular-nums', toneClass)}>{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

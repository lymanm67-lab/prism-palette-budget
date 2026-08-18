import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CONFIDENCE_LABEL, type Confidence } from '@/lib/blueprint/model';

export const money = (n: number) =>
  (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export const money2 = (n: number) =>
  (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
export const pct = (n: number) => `${(Number(n) || 0).toFixed(1)}%`;

export function NumField({
  value, onChange, className, step,
}: { value: number; onChange: (n: number) => void; className?: string; step?: string }) {
  const [raw, setRaw] = useState(String(value ?? 0));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setRaw(String(value ?? 0)); }, [value, focused]);
  return (
    <Input
      className={className}
      inputMode="decimal"
      step={step}
      value={raw}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); onChange(Number(String(raw).replace(/[^0-9.-]/g, '')) || 0); }}
      onChange={(e) => setRaw(e.target.value)}
    />
  );
}

export function ConfidenceBadge({ level }: { level: Confidence }) {
  const tone: Record<Confidence, string> = {
    current: 'bg-prism-teal/15 text-prism-teal border-prism-teal/30',
    estimated: 'bg-prism-amber/15 text-prism-amber border-prism-amber/30',
    projected: 'bg-primary/15 text-primary border-primary/30',
  };
  return (
    <Badge variant="outline" className={`text-[10px] tracking-wide ${tone[level]} print:border-black print:text-black print:bg-transparent`}>
      {CONFIDENCE_LABEL[level]}
    </Badge>
  );
}

export function StatCard({
  label, value, sub, level, onClick,
}: { label: string; value: string; sub?: string; level?: Confidence; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="text-left rounded-lg border border-border/60 bg-card/60 p-3 w-full transition-colors enabled:hover:border-primary/50 print:border-black print:bg-transparent"
    >
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      {level && <div className="mt-1.5"><ConfidenceBadge level={level} /></div>}
    </button>
  );
}

export function AsOfStamp({ date }: { date: string }) {
  return (
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
      As of: {date}
    </p>
  );
}

export function SectionNote({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

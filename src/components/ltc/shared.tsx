import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { GAP_LABEL, PROTECTION_LABEL, type GapBand, type ProtectionLevel } from '@/lib/ltc/model';
import { COVERAGE_LABEL, type CoverageBand } from '@/lib/ltc/location';


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

export function StatCard({
  label, value, sub, tone = 'default',
}: { label: string; value: string; sub?: string; tone?: 'default' | 'good' | 'warn' | 'risk' | 'info' }) {
  const toneClass: Record<string, string> = {
    default: 'border-border/60',
    good: 'border-prism-lime/40 bg-prism-lime/5',
    warn: 'border-prism-amber/40 bg-prism-amber/5',
    risk: 'border-destructive/40 bg-destructive/5',
    info: 'border-prism-sky/40 bg-prism-sky/5',
  };
  return (
    <div className={`rounded-lg border bg-card/60 p-3 ${toneClass[tone]} print:border-black print:bg-transparent`}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

const GAP_TONE: Record<GapBand, string> = {
  covered: 'bg-prism-lime/15 text-prism-lime border-prism-lime/30',
  small: 'bg-prism-teal/15 text-prism-teal border-prism-teal/30',
  moderate: 'bg-prism-amber/15 text-prism-amber border-prism-amber/30',
  large: 'bg-destructive/15 text-destructive border-destructive/30',
};

export function GapBadge({ band }: { band: GapBand }) {
  return <Badge variant="outline" className={`text-[10px] ${GAP_TONE[band]}`}>{GAP_LABEL[band]}</Badge>;
}

const LEVEL_TONE: Record<ProtectionLevel, string> = {
  under: 'bg-destructive/15 text-destructive border-destructive/30',
  basic: 'bg-prism-amber/15 text-prism-amber border-prism-amber/30',
  balanced: 'bg-prism-teal/15 text-prism-teal border-prism-teal/30',
  strong: 'bg-prism-lime/15 text-prism-lime border-prism-lime/30',
  over: 'bg-prism-amber/15 text-prism-amber border-prism-amber/30',
};

export function ProtectionBadge({ level }: { level: ProtectionLevel }) {
  return (
    <Badge variant="outline" className={`text-xs font-semibold px-3 py-1 ${LEVEL_TONE[level]}`}>
      {PROTECTION_LABEL[level]}
    </Badge>
  );
}

const COVERAGE_TONE: Record<CoverageBand, string> = {
  full: 'bg-prism-lime/15 text-prism-lime border-prism-lime/30',
  strong: 'bg-prism-lime/10 text-prism-lime border-prism-lime/25',
  balanced: 'bg-prism-sky/15 text-prism-sky border-prism-sky/30',
  partial: 'bg-prism-amber/15 text-prism-amber border-prism-amber/30',
  selfFund: 'bg-destructive/15 text-destructive border-destructive/30',
};

export function CoverageBadge({ band, className }: { band: CoverageBand; className?: string }) {
  return (
    <Badge variant="outline" className={`text-[10px] whitespace-nowrap ${COVERAGE_TONE[band]} ${className || ''}`}>
      {COVERAGE_LABEL[band]}
    </Badge>
  );
}

export function TextField({
  value, onChange, placeholder, className,
}: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <Input className={className} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  );
}

export function Select({
  value, onChange, options, className,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string }) {
  return (
    <select
      className={`h-10 w-full rounded-md border border-input bg-background px-2 text-sm ${className || ''}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export const hours1 = (n: number) => `${(Number(n) || 0).toFixed(1)} hrs`;

export function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 block">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}


import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCircle2, ChevronDown, ChevronUp, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import { useFinancialProfile, profileNumbers, ficoTier } from '@/hooks/use-financial-profile';

export default function FinancialProfileCard({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { profile, update, reset } = useFinancialProfile();
  const { formatCurrency } = useCurrency();
  const hasAny = Object.values(profile).some(v => v && v !== '');
  const [open, setOpen] = useState(defaultOpen || !hasAny);

  const n = profileNumbers(profile);
  const fico = ficoTier(parseInt(profile.creditScore) || 0);

  return (
    <Card className="glass-card border-prism-teal/30">
      <CardContent className="p-4 space-y-3">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-prism-teal/15 flex items-center justify-center">
              <UserCircle2 className="w-5 h-5 text-prism-teal" />
            </div>
            <div>
              <div className="font-semibold text-foreground text-sm">Your Household Financial Profile</div>
              <div className="text-xs text-muted-foreground">
                {hasAny
                  ? `Income ${formatCurrency(n.totalIncome)}/mo · Surplus ${formatCurrency(n.netSurplus)} · FICO ${profile.creditScore || '—'}`
                  : 'Enter once — all calculators use it for realistic results & qualification checks.'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasAny && (
              <Badge variant="outline" className={cn('text-[10px] uppercase', fico.color)}>{fico.label}</Badge>
            )}
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-4">
                <div className="grid md:grid-cols-3 gap-3">
                  <Field label="Credit score (middle FICO)" placeholder="720" value={profile.creditScore} onChange={v => update({ creditScore: v })} type="number" hint="580–850" />
                  <Field label="Your monthly income (gross)" placeholder="7000" value={profile.primaryIncome} onChange={v => update({ primaryIncome: v })} type="number" prefix="$" />
                  <Field label="Partner monthly income (gross)" placeholder="4000" value={profile.partnerIncome} onChange={v => update({ partnerIncome: v })} type="number" prefix="$" hint="0 if single" />
                  <Field label="Monthly debt payments" placeholder="600" value={profile.monthlyDebts} onChange={v => update({ monthlyDebts: v })} type="number" prefix="$" hint="Car, cards, student loans — mins" />
                  <Field label="Monthly living expenses" placeholder="4500" value={profile.monthlyExpenses} onChange={v => update({ monthlyExpenses: v })} type="number" prefix="$" hint="Excl. mortgage/HELOC & debts above" />
                  <Field label="Current home value" placeholder="450000" value={profile.homeValue} onChange={v => update({ homeValue: v })} type="number" prefix="$" hint="0 if renting" />
                  <Field label="Current mortgage balance" placeholder="280000" value={profile.mortgageBalance} onChange={v => update({ mortgageBalance: v })} type="number" prefix="$" hint="0 if none" />
                </div>

                {hasAny && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-border/40">
                    <Stat label="Total income" value={formatCurrency(n.totalIncome)} />
                    <Stat label="Net surplus" value={formatCurrency(n.netSurplus)} tone={n.netSurplus > 0 ? 'good' : 'bad'} />
                    <Stat label="Home equity" value={formatCurrency(n.equity)} />
                    <Stat label="LTV" value={n.homeValue > 0 ? `${n.ltv.toFixed(0)}%` : '—'} />
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-muted-foreground/70">Saved locally on this device. Never sent to a server.</p>
                  {hasAny && (
                    <Button size="sm" variant="ghost" onClick={reset} className="h-7 gap-1 text-xs">
                      <RefreshCw className="w-3 h-3" /> Clear profile
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function Field({
  label, value, onChange, placeholder, type = 'text', prefix, hint,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; prefix?: string; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
        <Input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          className={cn('h-9 text-sm', prefix && 'pl-6')}
        />
      </div>
      {hint && <p className="text-[10px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-lg bg-muted/30 border border-border/40 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn('text-sm font-semibold', tone === 'good' && 'text-prism-lime', tone === 'bad' && 'text-prism-rose')}>{value}</div>
    </div>
  );
}

// ─── Qualification badge for use inside calculators ───
export function QualificationBadge({
  verdict, reasons, dti,
}: { verdict: 'qualify' | 'borderline' | 'no'; reasons: string[]; dti: number }) {
  const cfg = {
    qualify: { icon: CheckCircle2, color: 'border-prism-lime/40 bg-prism-lime/10 text-prism-lime', label: 'Likely qualify' },
    borderline: { icon: AlertTriangle, color: 'border-prism-amber/40 bg-prism-amber/10 text-prism-amber', label: 'Borderline' },
    no: { icon: XCircle, color: 'border-prism-rose/40 bg-prism-rose/10 text-prism-rose', label: 'Unlikely to qualify' },
  }[verdict];
  const Icon = cfg.icon;
  return (
    <div className={cn('rounded-xl border p-3 flex items-start gap-3', cfg.color)}>
      <Icon className="w-5 h-5 mt-0.5 shrink-0" />
      <div className="text-sm space-y-1 flex-1">
        <div className="font-semibold flex items-center gap-2">
          {cfg.label}
          <span className="text-xs opacity-80 font-normal">· DTI {dti.toFixed(0)}%</span>
        </div>
        {reasons.length > 0 && (
          <ul className="text-xs opacity-90 space-y-0.5 list-disc pl-4">
            {reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Upload, Receipt, CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { PaystubUploader } from '@/components/PaystubUploader';
import type { StepProps } from './index';


interface Status {
  paycheck: boolean;
  bills: boolean;
  debts: boolean;
  loading: boolean;
}

export function Step01({ value, onChange }: StepProps) {
  const { household } = useHousehold();
  const [status, setStatus] = useState<Status>({ paycheck: false, bills: false, debts: false, loading: true });
  const [paystubOpen, setPaystubOpen] = useState(false);


  useEffect(() => {
    let cancel = false;
    async function check() {
      if (!household?.id) {
        setStatus({ paycheck: false, bills: false, debts: false, loading: false });
        return;
      }
      const hh = household.id;
      const sb: any = supabase;
      const [p, pd, b, d] = await Promise.all([
        sb.from('paycheck_deployments').select('id', { head: true, count: 'exact' }).eq('household_id', hh).limit(1),
        sb.from('budgets').select('id', { head: true, count: 'exact' }).eq('household_id', hh).limit(1),
        sb.from('subscriptions').select('id', { head: true, count: 'exact' }).eq('household_id', hh).limit(1),
        sb.from('debt_items').select('id, debt_plans!inner(household_id)', { head: true, count: 'exact' }).eq('debt_plans.household_id', hh).limit(1),
      ]);
      if (cancel) return;
      const next = {
        paycheck: (p.count ?? 0) > 0 || (pd.count ?? 0) > 0,
        bills: (b.count ?? 0) > 0,
        debts: (d.count ?? 0) > 0,
        loading: false,
      };
      setStatus(next);
      onChange({ ...value, ...next, loading: undefined });
    }
    check();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id]);

  const tiles = [
    {
      key: 'paycheck',
      icon: Upload,
      title: 'Paycheck',
      desc: 'Upload a recent stub so Coach knows your real take-home and deductions.',
      href: '/budgets',
      color: 'text-prism-teal',
      done: status.paycheck,
    },
    {
      key: 'bills',
      icon: Receipt,
      title: 'Bills',
      desc: 'Scan or import recurring bills so Coach can time them around payday.',
      href: '/budgets?scan=bill',
      color: 'text-prism-amber',
      done: status.bills,
    },
    {
      key: 'debts',
      icon: CreditCard,
      title: 'Debts',
      desc: 'Drop in a statement — Coach extracts APR, balance, and minimum.',
      href: '/debt-payoff?scan=debt',
      color: 'text-prism-rose',
      done: status.debts,
    },

  ];

  return (
    <div className="space-y-4">
      <Label className="text-sm font-semibold">Give Coach something to work with</Label>
      <p className="text-xs text-muted-foreground">
        Add any of these now — or skip. You can always come back. The more Coach knows, the sharper the plan.
      </p>

      {status.loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Checking what you've already added…
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {tiles.map(t => {
            const Icon = t.icon;
            return (
              <div key={t.key} className="rounded-lg border border-border/40 p-3 flex flex-col gap-2 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Icon className={`h-5 w-5 ${t.color}`} />
                  {t.done ? (
                    <Badge variant="outline" className="text-[10px] bg-prism-teal/10 border-prism-teal/30 text-prism-teal">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Found
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Not yet</Badge>
                  )}
                </div>
                <div className="text-sm font-semibold">{t.title}</div>
                <p className="text-[11px] text-muted-foreground flex-1">{t.desc}</p>
                {t.key === 'paycheck' ? (
                  <Button
                    size="sm"
                    variant={t.done ? 'ghost' : 'outline'}
                    className="h-7 text-[11px]"
                    onClick={() => setPaystubOpen(true)}
                  >
                    {t.done ? 'Upload another' : 'Upload paystub'}
                  </Button>
                ) : (
                  <div className="flex gap-1.5">
                    <Button asChild size="sm" variant={t.done ? 'ghost' : 'outline'} className="h-7 text-[11px] flex-1">
                      <Link to={t.href}>
                        {t.done ? 'Manage' : `Scan ${t.title.toLowerCase()}`}
                      </Link>
                    </Button>
                    {!t.done && (
                      <Button asChild size="sm" variant="ghost" className="h-7 text-[11px] flex-1">
                        <Link to={t.key === 'bills' ? '/budgets' : '/debt-payoff'}>
                          Add manually
                        </Link>
                      </Button>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground italic">
        Tip: Paycheck uploads happen right here. Bills & Debts open in-app — use Back to return.
      </p>

      <PaystubUploader open={paystubOpen} onOpenChange={setPaystubOpen} />
    </div>
  );
}

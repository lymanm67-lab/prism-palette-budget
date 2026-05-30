import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useUpsertInvestmentPlan, InvestmentPlan } from '@/hooks/use-investment-plan';
import { toast } from '@/hooks/use-toast';

interface Props { plan: InvestmentPlan | null; onDone?: () => void }

const STEPS = ['Current accounts','Contributions','Employer & raises','Debt → wealth','Social Security','HSA','Display','Review'];

export function InvestmentWizard({ plan, onDone }: Props) {
  const [step, setStep] = useState(0);
  const upsert = useUpsertInvestmentPlan();
  const [form, setForm] = useState({
    id: plan?.id,
    current_age: plan?.current_age ?? 58,
    retirement_age: plan?.retirement_age ?? 65,
    current_balance: plan?.current_balance ?? 0,
    target_amount: plan?.target_amount ?? 1000000,
    monthly_employee_contribution: plan?.monthly_employee_contribution ?? 0,
    monthly_employer_contribution: plan?.monthly_employer_contribution ?? 0,
    expected_return_pct: plan?.expected_return_pct ?? 7,
    annual_raise_pct: plan?.annual_raise_pct ?? 3,
    raise_redirect_pct: plan?.raise_redirect_pct ?? 100,
    current_monthly_income: plan?.current_monthly_income ?? 0,
    debt_payment_amount: plan?.debt_payment_amount ?? 0,
    debt_payoff_date: plan?.debt_payoff_date ?? '',
    additional_monthly_amount: plan?.additional_monthly_amount ?? 0,
    additional_start_date: plan?.additional_start_date ?? '',
    ss_monthly_estimate: plan?.ss_monthly_estimate ?? 0,
    ss_claiming_age: plan?.ss_claiming_age ?? 67,
    ss_invest_while_working: plan?.ss_invest_while_working ?? false,
    ss_invest_pct: plan?.ss_invest_pct ?? 0,
    hsa_balance: plan?.hsa_balance ?? 0,
    hsa_monthly_contribution: plan?.hsa_monthly_contribution ?? 0,
    hsa_employer_contribution: plan?.hsa_employer_contribution ?? 0,
    hsa_invested: plan?.hsa_invested ?? false,
    hsa_return_pct: plan?.hsa_return_pct ?? 6,
    use_future_dollars: plan?.use_future_dollars ?? true,
    inflation_pct: plan?.inflation_pct ?? 2.5,
  });

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    try {
      await upsert.mutateAsync({
        ...form,
        debt_payoff_date: form.debt_payoff_date || null,
        additional_start_date: form.additional_start_date || null,
      } as any);
      toast({ title: 'Plan saved', description: 'Your investment plan is updated.' });
      onDone?.();
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    }
  };

  const num = (k: keyof typeof form, label: string, placeholder?: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={form[k] as any ?? ''}
        placeholder={placeholder}
        onChange={(e) => set(k, e.target.value === '' ? 0 : parseFloat(e.target.value))}
      />
    </div>
  );

  const date = (k: keyof typeof form, label: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="date" value={(form[k] as string) || ''} onChange={(e) => set(k, e.target.value)} />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Setup Wizard — {STEPS[step]}</CardTitle>
          <span className="text-xs text-muted-foreground">{step + 1} / {STEPS.length}</span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 0 && (
          <div className="grid grid-cols-2 gap-3">
            {num('current_age', 'Current age')}
            {num('retirement_age', 'Target retirement age')}
            {num('current_balance', 'Current retirement balance ($)')}
            {num('target_amount', 'Target retirement amount ($)')}
          </div>
        )}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3">
            {num('monthly_employee_contribution', 'Monthly employee contribution ($)')}
            {num('current_monthly_income', 'Current monthly income ($)')}
          </div>
        )}
        {step === 2 && (
          <div className="grid grid-cols-2 gap-3">
            {num('monthly_employer_contribution', 'Monthly employer contribution ($)')}
            {num('annual_raise_pct', 'Expected annual raise (%)')}
            {num('raise_redirect_pct', 'Percent of raise to invest (%)')}
            {num('expected_return_pct', 'Expected annual return (%)')}
          </div>
        )}
        {step === 3 && (
          <div className="grid grid-cols-2 gap-3">
            {num('debt_payment_amount', 'Debt payment to redirect ($/mo)')}
            {date('debt_payoff_date', 'Debt payoff date')}
            {num('additional_monthly_amount', 'Additional monthly contribution ($)')}
            {date('additional_start_date', 'Additional start date')}
          </div>
        )}
        {step === 4 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {num('ss_monthly_estimate', 'Estimated SS monthly benefit ($)')}
              {num('ss_claiming_age', 'Claiming age')}
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm">Invest Social Security while working</Label>
                <p className="text-xs text-muted-foreground">If you claim before retiring</p>
              </div>
              <Switch checked={form.ss_invest_while_working} onCheckedChange={(v) => set('ss_invest_while_working', v)} />
            </div>
            {form.ss_invest_while_working && num('ss_invest_pct', 'Percent of SS to invest (%)')}
          </div>
        )}
        {step === 5 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {num('hsa_balance', 'HSA balance ($)')}
              {num('hsa_monthly_contribution', 'HSA monthly contribution ($)')}
              {num('hsa_employer_contribution', 'HSA employer contribution ($)')}
              {num('hsa_return_pct', 'HSA expected return (%)')}
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm">HSA invested</Label>
                <p className="text-xs text-muted-foreground">Treat HSA as long-term investment</p>
              </div>
              <Switch checked={form.hsa_invested} onCheckedChange={(v) => set('hsa_invested', v)} />
            </div>
          </div>
        )}
        {step === 6 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm">Show in future dollars</Label>
                <p className="text-xs text-muted-foreground">Off = today's dollars (inflation-adjusted)</p>
              </div>
              <Switch checked={form.use_future_dollars} onCheckedChange={(v) => set('use_future_dollars', v)} />
            </div>
            {num('inflation_pct', 'Inflation assumption (%)')}
          </div>
        )}
        {step === 7 && (
          <div className="rounded-lg bg-muted/30 p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> Ready to save
            </div>
            <p className="text-muted-foreground text-xs">
              We'll compute your projection and update the Snapshot tab using these inputs.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Button variant="ghost" size="sm" disabled={step === 0} onClick={() => setStep(step - 1)}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={() => setStep(step + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={save} disabled={upsert.isPending}>
              {upsert.isPending ? 'Saving…' : 'Save plan'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

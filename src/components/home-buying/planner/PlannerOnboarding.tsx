import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Home, ArrowRight } from 'lucide-react';
import { useCreateProject } from '@/hooks/use-hp-planner';

export default function PlannerOnboarding() {
  const create = useCreateProject();
  const in12mo = new Date();
  in12mo.setMonth(in12mo.getMonth() + 12);

  const [form, setForm] = useState({
    target_close_date: in12mo.toISOString().slice(0, 10),
    target_price: 350000,
    max_monthly_payment: 1800,
    down_payment_target: 50000,
    loan_type_preference: 'conventional',
  });

  return (
    <Card className="prism-card-shine border-border/50 max-w-2xl mx-auto">
      <CardContent className="p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-prism-teal to-prism-amber">
            <Home className="h-8 w-8 text-white" />
          </div>
          <h2 className="font-display text-2xl font-extrabold">Start Your Home Purchase Plan</h2>
          <p className="text-sm text-muted-foreground">
            Set your target closing date and personal limits. We'll build a month-by-month roadmap that fits your timeline and never violates your rules.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Target closing date</Label>
            <Input
              type="date"
              value={form.target_close_date}
              onChange={(e) => setForm({ ...form, target_close_date: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Target home price</Label>
            <Input
              type="number"
              value={form.target_price}
              onChange={(e) => setForm({ ...form, target_price: +e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Max monthly housing payment</Label>
            <Input
              type="number"
              value={form.max_monthly_payment}
              onChange={(e) => setForm({ ...form, max_monthly_payment: +e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground">This becomes your non-negotiable payment ceiling.</p>
          </div>
          <div className="space-y-1">
            <Label>Down payment target</Label>
            <Input
              type="number"
              value={form.down_payment_target}
              onChange={(e) => setForm({ ...form, down_payment_target: +e.target.value })}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Preferred loan type</Label>
            <Select value={form.loan_type_preference} onValueChange={(v) => setForm({ ...form, loan_type_preference: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conventional">Conventional</SelectItem>
                <SelectItem value="fha">FHA</SelectItem>
                <SelectItem value="va">VA</SelectItem>
                <SelectItem value="usda">USDA</SelectItem>
                <SelectItem value="undecided">Undecided</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={() => create.mutate(form)}
          disabled={create.isPending}
        >
          {create.isPending ? 'Building your roadmap…' : 'Build My Roadmap'}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
        <p className="text-[11px] text-center text-muted-foreground">
          We'll generate milestones, weekly tasks, document tracking, risk register, and default rules.
        </p>
      </CardContent>
    </Card>
  );
}

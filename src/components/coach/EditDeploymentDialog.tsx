import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { PaycheckDeployment } from '@/hooks/use-paycheck-deploy';
import { useUpdatePaycheckDeployment } from '@/hooks/use-paycheck-deploy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

type Bill = { id: string; merchant: string; amount: number; due_date: string };

const AREAS: { key: keyof PaycheckDeployment; label: string }[] = [
  { key: 'extra_debt_amount', label: 'Extra debt payoff' },
  { key: 'savings_amount', label: 'Savings goals' },
  { key: 'buffer_amount', label: 'Smart Buffer' },
  { key: 'investment_amount', label: 'Investing from take-home' },
  { key: 'safe_to_spend_amount', label: 'Safe to spend' },
];

export default function EditDeploymentDialog({ deployment }: { deployment: PaycheckDeployment }) {
  const [open, setOpen] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [areas, setAreas] = useState<Record<string, string>>({});
  const update = useUpdatePaycheckDeployment();

  useEffect(() => {
    if (!open) return;
    setBills((Array.isArray(deployment.bills_breakdown) ? deployment.bills_breakdown : []).map((b, i) => ({
      id: String(b.id || `bill-${i}`), merchant: b.merchant || '', amount: Number(b.amount) || 0, due_date: b.due_date || deployment.pay_date,
    })));
    setAreas(Object.fromEntries(AREAS.map(a => [a.key, String(Number(deployment[a.key]) || 0)])));
  }, [open, deployment]);

  const billsTotal = bills.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const setBill = (i: number, patch: Partial<Bill>) => setBills(list => list.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  const save = async () => {
    if (!deployment.id) return;
    const clean = bills.filter(b => b.merchant.trim());
    const fields: Partial<PaycheckDeployment> = {
      bills_breakdown: clean.map(b => ({ ...b, merchant: b.merchant.trim(), amount: Number(b.amount) || 0 })),
      bills_amount: Math.round(clean.reduce((s, b) => s + (Number(b.amount) || 0), 0) * 100) / 100,
      source: 'manual',
    };
    for (const a of AREAS) (fields as any)[a.key] = Math.max(0, Number(areas[a.key]) || 0);
    try {
      await update.mutateAsync({ id: deployment.id, fields });
      toast({ title: 'Plan updated', description: 'Your changes are saved.' });
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'Could not save', description: e?.message || 'Try again', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-[11px]"><Pencil className="mr-1 h-3 w-3" /> Edit plan</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit paycheck plan</DialogTitle>
          <DialogDescription>Change bills and amounts by hand. Debt minimums and business costs come from your debt list and budget.</DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bills ({bills.length})</span>
            <span className="font-mono text-sm font-semibold">Total ${billsTotal.toFixed(2)}</span>
          </div>
          {bills.map((b, i) => (
            <div key={b.id} className="grid grid-cols-[1fr_110px_140px_auto] gap-2">
              <Input aria-label="Bill name" value={b.merchant} onChange={e => setBill(i, { merchant: e.target.value })} />
              <Input aria-label="Amount" type="number" step="0.01" value={b.amount} onChange={e => setBill(i, { amount: Number(e.target.value) })} />
              <Input aria-label="Due date" type="date" value={b.due_date?.slice(0, 10)} onChange={e => setBill(i, { due_date: e.target.value })} />
              <Button size="icon" variant="ghost" aria-label={`Remove ${b.merchant}`} onClick={() => setBills(list => list.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setBills(list => [...list, { id: `manual-${Date.now()}`, merchant: '', amount: 0, due_date: deployment.pay_date }])}>
            <Plus className="mr-1 h-3 w-3" /> Add bill
          </Button>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          {AREAS.map(a => (
            <div key={a.key} className="space-y-1">
              <Label htmlFor={`area-${a.key}`}>{a.label}</Label>
              <Input id={`area-${a.key}`} type="number" step="0.01" value={areas[a.key] ?? ''} onChange={e => setAreas(s => ({ ...s, [a.key]: e.target.value }))} />
            </div>
          ))}
        </section>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

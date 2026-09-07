import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrency } from '@/hooks/use-currency';
import { Loader2, Target } from 'lucide-react';
import { toast } from 'sonner';

export interface AssignCandidate {
  id: string;
  name: string;
  planned: number;
  groupName?: string;
}

interface Props {
  /** Positive = money left to assign. Negative = over-allocated. */
  amount: number;
  /** "Personal" / "Business" / "Personal + Business" — shown so each side reads independently. */
  scopeLabel: string;
  candidates: AssignCandidate[];
  /** Writes the new planned amount for the chosen category. */
  onAssign: (categoryId: string, newPlanned: number) => Promise<void>;
  size?: 'sm' | 'default';
  className?: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function AssignRemainingDialog({
  amount,
  scopeLabel,
  candidates,
  onAssign,
  size = 'sm',
  className,
}: Props) {
  const { formatCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);

  const surplus = amount > 0;
  const magnitude = round2(Math.abs(amount));
  const chosen = candidates.find((c) => c.id === categoryId);
  const move = round2(Math.min(Number(raw || magnitude) || 0, magnitude));

  const sorted = useMemo(
    () =>
      [...candidates].sort(
        (a, b) => (a.groupName || '').localeCompare(b.groupName || '') || a.name.localeCompare(b.name),
      ),
    [candidates],
  );

  const newPlanned = chosen ? round2(surplus ? chosen.planned + move : Math.max(0, chosen.planned - move)) : 0;

  const submit = async () => {
    if (!chosen || move <= 0) return;
    setBusy(true);
    try {
      await onAssign(chosen.id, newPlanned);
      toast.success(
        surplus
          ? `${formatCurrency(move)} assigned to ${chosen.name}`
          : `${formatCurrency(move)} trimmed from ${chosen.name}`,
      );
      setOpen(false);
      setRaw('');
      setCategoryId('');
    } catch (e: any) {
      toast.error(e?.message || 'Could not save that assignment');
    } finally {
      setBusy(false);
    }
  };

  if (magnitude < 0.01) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={surplus ? 'default' : 'outline'} className={className}>
          <Target className="mr-1.5 h-3.5 w-3.5" />
          {surplus ? 'Give it a job' : 'Fix over-allocation'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {surplus ? 'Assign the remaining' : 'Trim the over-allocation'} {formatCurrency(magnitude)}
          </DialogTitle>
          <DialogDescription>
            {scopeLabel} only — this never touches the other side of your budget.{' '}
            {surplus
              ? 'Pick where this money should go and the budget lands on zero.'
              : 'Pick which planned amount to reduce so the budget lands on zero.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{surplus ? 'Give it to' : 'Take it from'}</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {sorted.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.groupName ? ` · ${c.groupName}` : ''} — {formatCurrency(c.planned)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Amount</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={magnitude}
              value={raw}
              placeholder={magnitude.toFixed(2)}
              onChange={(e) => setRaw(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the full {formatCurrency(magnitude)}.
            </p>
          </div>

          {chosen && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{chosen.name} planned</span>
                <span className="tabular-nums">
                  {formatCurrency(chosen.planned)} → <strong>{formatCurrency(newPlanned)}</strong>
                </span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Left to assign after</span>
                <span className="tabular-nums font-semibold">{formatCurrency(round2(magnitude - move))}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!chosen || move <= 0 || busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {surplus ? 'Assign' : 'Trim'} {formatCurrency(move)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

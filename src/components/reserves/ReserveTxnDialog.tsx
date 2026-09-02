import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  DIRECTION_LABEL, EMERGENCY_CATEGORIES, VEHICLE_CATEGORIES, nonEmergencyFlag,
  type ReserveDirection, type ReserveFund,
} from '@/lib/reserves/emergencyFund';
import { useReserves } from '@/hooks/use-reserves';

const DIRECTIONS: ReserveDirection[] = [
  'contribution', 'buffer_transfer', 'interest', 'withdrawal', 'gain', 'loss', 'adjustment',
];

interface Props {
  fund: ReserveFund;
  /** Pre-selected movement type. */
  defaultDirection?: ReserveDirection;
  trigger: React.ReactNode;
}

export function ReserveTxnDialog({ fund, defaultDirection = 'contribution', trigger }: Props) {
  const { addTxn } = useReserves();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<ReserveDirection>(defaultDirection);
  const [txnDate, setTxnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');

  const isWithdrawal = direction === 'withdrawal';
  const categories = fund.kind === 'vehicle' ? VEHICLE_CATEGORIES : EMERGENCY_CATEGORIES;
  const misuse = isWithdrawal && fund.kind === 'emergency'
    ? nonEmergencyFlag(`${reason} ${category} ${notes}`)
    : null;

  const availableDirections = fund.kind === 'emergency'
    ? DIRECTIONS
    : DIRECTIONS.filter((d) => d !== 'buffer_transfer');

  const reset = () => {
    setDirection(defaultDirection);
    setAmount('');
    setReason('');
    setCategory('');
    setNotes('');
  };

  const submit = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ title: 'Enter an amount greater than zero', variant: 'destructive' });
      return;
    }
    if (isWithdrawal && !reason.trim()) {
      toast({ title: 'A reason is required for every withdrawal', variant: 'destructive' });
      return;
    }
    try {
      await addTxn.mutateAsync({
        fund_id: fund.id,
        txn_date: txnDate,
        amount: Math.abs(amt),
        direction,
        reason: reason.trim() || null,
        category: category || null,
        notes: notes.trim() || null,
      });
      toast({
        title: DIRECTION_LABEL[direction],
        description: isWithdrawal
          ? 'Recorded. The fund status is now Replenishment Needed if it dropped below your goal.'
          : 'Recorded.',
      });
      reset();
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'Could not save', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{fund.name} activity</DialogTitle>
          <DialogDescription>
            {fund.kind === 'emergency'
              ? 'Buffer transfers are recorded here once — never counted as Buffer and Emergency Fund at the same time.'
              : 'Track contributions and maintenance spend for the vehicle sinking fund.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as ReserveDirection)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableDirections.map((d) => (
                  <SelectItem key={d} value={d}>{DIRECTION_LABEL[d]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rt-date">Date</Label>
              <Input id="rt-date" type="date" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rt-amount">Amount</Label>
              <Input id="rt-amount" type="number" step="0.01" min="0" placeholder="0.00"
                value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>

          {isWithdrawal && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="rt-reason">Reason (required)</Label>
                <Input id="rt-reason" placeholder="e.g. ER visit copay"
                  value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="rt-notes">Notes</Label>
            <Textarea id="rt-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {misuse && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This looks like {misuse}, not a true emergency. Planned vacations, entertainment,
                subscriptions and routine expenses should be funded from the Buffer, Vacation Fund or
                a sinking fund instead.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={addTxn.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ReserveTxnDialog;

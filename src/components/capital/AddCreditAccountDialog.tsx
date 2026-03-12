import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';

const BUREAUS = ['Equifax', 'Experian', 'TransUnion'] as const;
const ACCOUNT_TYPES = ['Revolving', 'Installment', 'Mortgage', 'Open', 'Collection', 'Other'] as const;
const ACCOUNT_STATUSES = ['Open', 'Closed', 'Frozen', 'Paid', 'Collection', 'Charge-Off', 'Foreclosure', 'Repossession'] as const;
const RESPONSIBILITIES = ['Individual', 'Joint', 'Authorized User', 'Co-signer', 'Business'] as const;

const schema = z.object({
  bureau: z.string().min(1, 'Bureau is required'),
  account_name: z.string().trim().min(1, 'Account name is required').max(200),
  account_number: z.string().max(50).optional().or(z.literal('')),
  account_type: z.string().min(1),
  account_status: z.string().min(1),
  balance: z.coerce.number().min(0, 'Balance must be 0 or greater'),
  credit_limit: z.coerce.number().min(0).optional().or(z.literal('')),
  monthly_payment: z.coerce.number().min(0).optional().or(z.literal('')),
  payment_history: z.string().max(500).optional().or(z.literal('')),
  date_opened: z.string().optional().or(z.literal('')),
  date_closed: z.string().optional().or(z.literal('')),
  date_of_first_delinquency: z.string().optional().or(z.literal('')),
  high_balance: z.coerce.number().min(0).optional().or(z.literal('')),
  terms: z.string().max(100).optional().or(z.literal('')),
  responsibility: z.string().optional(),
  remarks_codes: z.string().max(500).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSuccess: () => void;
  defaultBureau?: string;
}

export default function AddCreditAccountDialog({ onSuccess, defaultBureau }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { currentHousehold } = useHousehold();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      bureau: defaultBureau || 'Equifax',
      account_name: '',
      account_number: '',
      account_type: 'Revolving',
      account_status: 'Open',
      balance: 0,
      credit_limit: '',
      monthly_payment: '',
      payment_history: '',
      date_opened: '',
      date_closed: '',
      date_of_first_delinquency: '',
      high_balance: '',
      terms: '',
      responsibility: 'Individual',
      remarks_codes: '',
      notes: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!currentHousehold) {
      toast.error('No household selected');
      return;
    }
    setSaving(true);
    try {
      const row: Record<string, unknown> = {
        household_id: currentHousehold.id,
        bureau: values.bureau,
        account_name: values.account_name,
        account_number: values.account_number || null,
        account_type: values.account_type,
        account_status: values.account_status,
        balance: values.balance,
        credit_limit: values.credit_limit !== '' ? Number(values.credit_limit) : null,
        monthly_payment: values.monthly_payment !== '' ? Number(values.monthly_payment) : null,
        payment_history: values.payment_history || null,
        date_opened: values.date_opened || null,
        date_closed: values.date_closed || null,
        date_of_first_delinquency: values.date_of_first_delinquency || null,
        high_balance: values.high_balance !== '' ? Number(values.high_balance) : null,
        terms: values.terms || null,
        responsibility: values.responsibility || 'Individual',
        remarks_codes: values.remarks_codes || null,
        notes: values.notes || null,
      };

      const { error } = await supabase.from('credit_accounts' as any).insert(row as any);
      if (error) throw error;
      toast.success('Credit account added');
      form.reset();
      setOpen(false);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />Add Account Manually</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Credit Account</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Row 1: Bureau + Account Name */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="bureau" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bureau *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {BUREAUS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="account_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name *</FormLabel>
                  <FormControl><Input placeholder="e.g. Chase Sapphire" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Row 2: Account Number + Type + Status */}
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="account_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl><Input placeholder="Last 4 digits" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="account_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="account_status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {ACCOUNT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Row 3: Balance + Credit Limit + Monthly Payment */}
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="balance" render={({ field }) => (
                <FormItem>
                  <FormLabel>Balance *</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="credit_limit" render={({ field }) => (
                <FormItem>
                  <FormLabel>Credit Limit</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="monthly_payment" render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Payment</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Row 4: High Balance + Terms + Responsibility */}
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="high_balance" render={({ field }) => (
                <FormItem>
                  <FormLabel>High Balance</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="terms" render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms</FormLabel>
                  <FormControl><Input placeholder="e.g. 60 months" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="responsibility" render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsibility</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {RESPONSIBILITIES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Row 5: Dates */}
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="date_opened" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date Opened</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="date_closed" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date Closed</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="date_of_first_delinquency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of First Delinquency</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Row 6: Payment History */}
            <FormField control={form.control} name="payment_history" render={({ field }) => (
              <FormItem>
                <FormLabel>Payment History</FormLabel>
                <FormControl><Input placeholder="e.g. CCCCCCCCCCCC (C=Current, 1=30 days, 2=60 days)" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Row 7: Remarks + Notes */}
            <FormField control={form.control} name="remarks_codes" render={({ field }) => (
              <FormItem>
                <FormLabel>Remarks / Codes</FormLabel>
                <FormControl><Input placeholder="e.g. CLO, CBD, CLS" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea placeholder="Additional notes about this account..." rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add Account'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

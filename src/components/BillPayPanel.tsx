import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRecurringTransactions, useUpdateRecurring } from '@/hooks/use-recurring';
import { useCreateTransaction } from '@/hooks/use-finance-data';
import { useCurrency } from '@/hooks/use-currency';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { AlertTriangle, CheckCircle2, ExternalLink, Settings2, Info, Bell, Calendar as CalIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import MethodEntitySetup from './MethodEntitySetup';

const HORIZON_DAYS = 45;

export default function BillPayPanel() {
  const { data: recurring } = useRecurringTransactions();
  const updateRecurring = useUpdateRecurring();
  const createTransaction = useCreateTransaction();
  const { formatCurrency } = useCurrency();

  const [settingsTarget, setSettingsTarget] = useState<any | null>(null);
  const [settingsForm, setSettingsForm] = useState({ biller_url: '', reminder_days: 3, autopay_enabled: false });

  const upcoming = useMemo(() => {
    if (!recurring) return [];
    const today = new Date();
    return recurring
      .filter((r: any) => Number(r.amount) < 0 && r.next_due_date && r.is_active !== false)
      .map((r: any) => ({
        ...r,
        daysUntil: differenceInCalendarDays(parseISO(r.next_due_date), today),
      }))
      .filter((r: any) => r.daysUntil <= HORIZON_DAYS)
      .sort((a: any, b: any) => a.daysUntil - b.daysUntil);
  }, [recurring]);

  const dueSoonTotal = useMemo(
    () => upcoming.filter((r: any) => r.daysUntil <= 7).reduce((s: number, r: any) => s + Math.abs(Number(r.amount)), 0),
    [upcoming]
  );
  const overdueCount = upcoming.filter((r: any) => r.daysUntil < 0).length;

  const openSettings = (r: any) => {
    setSettingsTarget(r);
    setSettingsForm({
      biller_url: r.biller_url || '',
      reminder_days: r.reminder_days ?? 3,
      autopay_enabled: !!r.autopay_enabled,
    });
  };

  const saveSettings = () => {
    if (!settingsTarget) return;
    let url = settingsForm.biller_url.trim();
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    updateRecurring.mutate(
      {
        id: settingsTarget.id,
        biller_url: url || null,
        reminder_days: Math.max(0, Math.min(30, Number(settingsForm.reminder_days) || 0)),
        autopay_enabled: settingsForm.autopay_enabled,
      },
      {
        onSuccess: () => {
          toast.success('Bill settings saved');
          setSettingsTarget(null);
        },
        onError: (e: any) => toast.error(e.message || 'Failed to save'),
      }
    );
  };

  const markPaid = (r: any) => {
    createTransaction.mutate(
      {
        account_id: r.account_id,
        category_id: r.category_id || null,
        amount: Number(r.amount), // negative for expense
        merchant: r.merchant,
        description: `Bill payment: ${r.merchant}`,
        date: format(new Date(), 'yyyy-MM-dd'),
      } as any,
      {
        onSuccess: () => {
          updateRecurring.mutate({ id: r.id, last_paid_date: format(new Date(), 'yyyy-MM-dd') });
          toast.success(`Marked ${r.merchant} as paid`);
        },
        onError: (e: any) => toast.error(e.message || 'Failed to mark paid'),
      }
    );
  };

  const statusFor = (days: number) => {
    if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' };
    if (days === 0) return { label: 'Due today', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' };
    if (days <= 3) return { label: `Due in ${days}d`, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
    if (days <= 7) return { label: `Due in ${days}d`, color: 'bg-primary/10 text-primary border-primary/20' };
    return { label: format(parseISO(arguments[0] as any), 'MMM d'), color: 'bg-muted text-muted-foreground border-border' };
  };

  return (
    <div className="space-y-4">
      <MethodEntitySetup />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Reminder-based bill pay.</strong> Prism™ tracks due dates, reminds you, and lets you mark bills paid in one tap.
          We don't move money on your behalf — open the biller's site to complete payment, or set up autopay directly with each biller.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Bell className="h-4 w-4 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-muted-foreground">Due in 7 days</p>
              <p className="text-base sm:text-lg font-bold truncate">{formatCurrency(dueSoonTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-muted-foreground">Overdue</p>
              <p className="text-base sm:text-lg font-bold">{overdueCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <CalIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-muted-foreground">Upcoming bills</p>
              <p className="text-base sm:text-lg font-bold">{upcoming.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base sm:text-lg">Bills due in the next {HORIZON_DAYS} days</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">
              No upcoming bills. Add recurring expenses to start tracking them here.
            </p>
          ) : (
            <div className="divide-y">
              {upcoming.map((r: any) => {
                const days = r.daysUntil;
                const status =
                  days < 0
                    ? { label: `${Math.abs(days)}d overdue`, color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' }
                    : days === 0
                    ? { label: 'Due today', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' }
                    : days <= 3
                    ? { label: `Due in ${days}d`, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' }
                    : days <= 7
                    ? { label: `Due in ${days}d`, color: 'bg-primary/10 text-primary border-primary/20' }
                    : { label: `${format(parseISO(r.next_due_date), 'MMM d')} (${days}d)`, color: 'bg-muted text-muted-foreground border-border' };

                return (
                  <div key={r.id} className="flex flex-wrap items-center gap-2 sm:gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{r.merchant || 'Unnamed'}</p>
                        {r.autopay_enabled && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Autopay</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap mt-0.5">
                        <span className={cn('px-1.5 py-0.5 rounded border text-[10px] font-medium', status.color)}>
                          {status.label}
                        </span>
                        {r.accounts && <span className="truncate">{(r.accounts as any).name}</span>}
                        {r.reminder_days > 0 && <span>· Remind {r.reminder_days}d before</span>}
                      </div>
                    </div>
                    <p className="font-semibold text-sm tabular-nums shrink-0">{formatCurrency(Math.abs(Number(r.amount)))}</p>
                    <div className="flex gap-1 shrink-0">
                      {r.biller_url && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1"
                        >
                          <a href={r.biller_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" /> Pay
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => markPaid(r)}
                        disabled={createTransaction.isPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openSettings(r)}>
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!settingsTarget} onOpenChange={(o) => !o && setSettingsTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bill settings — {settingsTarget?.merchant}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="biller_url">Biller website (for one-tap "Pay" link)</Label>
              <Input
                id="biller_url"
                placeholder="https://billerportal.com/login"
                value={settingsForm.biller_url}
                onChange={(e) => setSettingsForm((f) => ({ ...f, biller_url: e.target.value }))}
                maxLength={500}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reminder_days">Remind me (days before due)</Label>
              <Input
                id="reminder_days"
                type="number"
                min={0}
                max={30}
                value={settingsForm.reminder_days}
                onChange={(e) => setSettingsForm((f) => ({ ...f, reminder_days: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="autopay" className="text-sm">Autopay enabled at biller</Label>
                <p className="text-[11px] text-muted-foreground">Flag bills you've set to autopay directly with the biller. Prism™ won't trigger payment.</p>
              </div>
              <Switch
                id="autopay"
                checked={settingsForm.autopay_enabled}
                onCheckedChange={(v) => setSettingsForm((f) => ({ ...f, autopay_enabled: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSettingsTarget(null)}>Cancel</Button>
            <Button onClick={saveSettings} disabled={updateRecurring.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

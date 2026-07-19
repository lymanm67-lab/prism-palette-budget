import { useMemo, useState } from 'react';
import { CalendarClock, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCreditAccounts } from '@/hooks/use-credit-accounts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Statement Close Tracker — pairs with AZEO. Balances that report to the
 * bureaus are the ones on the statement CLOSING date (not the due date).
 * Alerts fire 5 days before each card's close.
 */
function daysUntil(day: number): { date: Date; days: number } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  // Clamp day to month length
  const last = new Date(y, m + 1, 0).getDate();
  const target = new Date(y, m, Math.min(day, last));
  if (target < now) {
    const nextLast = new Date(y, m + 2, 0).getDate();
    target.setMonth(m + 1);
    target.setDate(Math.min(day, nextLast));
  }
  const ms = target.getTime() - now.getTime();
  return { date: target, days: Math.ceil(ms / (1000 * 60 * 60 * 24)) };
}

export default function StatementCloseTracker() {
  const { accounts } = useCreditAccounts();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const cards = useMemo(() => {
    return accounts
      .filter(a =>
        (a.account_type?.toLowerCase().includes('revolv') ||
         a.account_type?.toLowerCase().includes('credit card')) &&
        a.account_status !== 'closed',
      )
      .map(a => {
        const day = (a as any).statement_close_day as number | null;
        const info = day ? daysUntil(day) : null;
        return { a, day, info };
      })
      .sort((x, y) => (x.info?.days ?? 999) - (y.info?.days ?? 999));
  }, [accounts]);

  const save = async (id: string) => {
    const raw = edits[id];
    const n = Number(raw);
    if (!n || n < 1 || n > 31) return toast.error('Enter day 1–31');
    setSaving(id);
    const { error } = await (supabase as any).from('credit_accounts')
      .update({ statement_close_day: n }).eq('id', id);
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    setEdits(p => ({ ...p, [id]: '' }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          Statement Close Tracker
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Balances report to the bureaus on the <em>statement closing date</em>, not the due date.
          Pay 3–5 days before close to hit your AZEO target.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {cards.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">No revolving cards found.</p>
        )}
        {cards.map(({ a, day, info }) => {
          const alert = info && info.days <= 5;
          const util = a.credit_limit ? (Number(a.balance) / Number(a.credit_limit)) * 100 : 0;
          return (
            <div key={a.id} className="rounded-lg border p-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[180px]">
                <div className="font-medium text-sm">{a.account_name}</div>
                <div className="text-xs text-muted-foreground">
                  {a.bureau} · Util {util.toFixed(0)}%
                </div>
              </div>

              {day ? (
                <div className="flex items-center gap-2">
                  <div className="text-xs">
                    <div className="text-muted-foreground">Closes day {day}</div>
                    <div className={alert ? 'text-destructive font-semibold' : 'text-foreground'}>
                      {info!.days === 0 ? 'Today' : `in ${info!.days}d`}
                    </div>
                  </div>
                  {alert && <Badge className="bg-destructive/15 text-destructive">Pay now</Badge>}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Not set</span>
              )}

              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={31}
                  placeholder={day ? String(day) : 'Day'}
                  className="w-20 h-9"
                  value={edits[a.id] ?? ''}
                  onChange={e => setEdits(p => ({ ...p, [a.id]: e.target.value }))}
                />
                <Button size="sm" variant="outline" onClick={() => save(a.id)} disabled={saving === a.id}>
                  <Save className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
        <p className="text-[11px] text-muted-foreground pt-2">
          Tip: find the statement closing day on your last statement PDF or the card's app under "statement period".
        </p>
      </CardContent>
    </Card>
  );
}

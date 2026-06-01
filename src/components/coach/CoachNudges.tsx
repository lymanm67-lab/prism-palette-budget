import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useMoneyLeaks } from '@/hooks/use-money-leaks';
import { usePaycheckDeployments } from '@/hooks/use-paycheck-deploy';
import { usePurchaseGuardChecks } from '@/hooks/use-purchase-guard';
import { useTransactions } from '@/hooks/use-finance-data';
import { format, startOfMonth, differenceInDays, parseISO } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Droplets, CalendarClock, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

interface Nudge {
  id: string;
  priority: number; // lower = higher priority
  icon: any;
  color: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
}

/**
 * Derives in-app nudges from existing Coach data — no extra table needed.
 * Shown as a compact strip at the top of /coach.
 */
export function CoachNudges() {
  const { household } = useHousehold();
  const { data: leaks } = useMoneyLeaks('open');
  const { data: deployments } = usePaycheckDeployments(3);
  const { data: guardChecks } = usePurchaseGuardChecks(20);
  const { data: txns } = useTransactions();

  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');

  const { data: overBudget } = useQuery({
    queryKey: ['coach-nudges-overbudget', household?.id, currentMonth],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('id, planned_amount, categories(id, name)')
        .eq('household_id', household!.id)
        .eq('month', currentMonth);
      if (error) throw error;
      const monthPrefix = currentMonth.slice(0, 7);
      const byCat = new Map<string, number>();
      for (const t of (txns || [])) {
        if (t.amount >= 0 || t.is_transfer || !t.date.startsWith(monthPrefix) || !t.category_id) continue;
        byCat.set(t.category_id, (byCat.get(t.category_id) || 0) + Math.abs(t.amount));
      }
      return (data || [])
        .map((b: any) => {
          const catId = b.categories?.id;
          const spent = catId ? (byCat.get(catId) || 0) : 0;
          return { name: b.categories?.name || 'Uncategorized', overBy: spent - b.planned_amount };
        })
        .filter(c => c.overBy > 0);
    },
  });

  const nudges = useMemo<Nudge[]>(() => {
    const out: Nudge[] = [];

    // 1. Over-budget categories
    const over = overBudget || [];
    if (over.length > 0) {
      const totalOver = over.reduce((s, c) => s + c.overBy, 0);
      out.push({
        id: 'over-budget',
        priority: 1,
        icon: AlertTriangle,
        color: 'text-prism-rose',
        title: `${over.length} categor${over.length === 1 ? 'y' : 'ies'} over plan`,
        detail: `Trending ${fmt(totalOver)} above budget — Coach can build a recovery plan.`,
        href: '/coach#card-3',
        cta: 'Recover',
      });
    }

    // 2. Money leaks
    const leakList = leaks || [];
    if (leakList.length > 0) {
      const monthlyLeak = leakList.reduce((s, l) => s + Number(l.monthly_cost || 0), 0);
      out.push({
        id: 'leaks',
        priority: 2,
        icon: Droplets,
        color: 'text-prism-amber',
        title: `${leakList.length} money leak${leakList.length === 1 ? '' : 's'} detected`,
        detail: `${fmt(monthlyLeak)}/mo could be redirected to debt, savings, or investing.`,
        href: '/coach#card-6',
        cta: 'Fix',
      });
    }

    // 3. Next paycheck within 7 days, not applied
    const nextPay = (deployments || []).find(d => d.status !== 'applied' && d.status !== 'skipped');
    if (nextPay) {
      const days = differenceInDays(parseISO(nextPay.pay_date), new Date());
      if (days >= 0 && days <= 7) {
        out.push({
          id: 'paycheck',
          priority: 3,
          icon: CalendarClock,
          color: 'text-prism-sky',
          title: days === 0 ? 'Paycheck today' : `Paycheck in ${days} day${days === 1 ? '' : 's'}`,
          detail: `Plan ready: ${fmt(Number(nextPay.net_amount))} ready to deploy.`,
          href: '/coach/paycheck',
          cta: 'Review',
        });
      }
    } else if (deployments && deployments.length === 0) {
      out.push({
        id: 'no-paycheck',
        priority: 5,
        icon: CalendarClock,
        color: 'text-prism-sky',
        title: 'No paycheck plan yet',
        detail: 'Deploy your next paycheck — give every dollar a job before it lands.',
        href: '/coach/paycheck',
        cta: 'Deploy',
      });
    }

    // 4. Purchase Guard reviews due
    const reviewsDue = (guardChecks || []).filter((c: any) => {
      if (!c.decision || c.decision === 'pending' || c.decision === 'waiting') return false;
      if (c.post_review_completed_at) return false;
      const purchased = c.created_at ? new Date(c.created_at) : null;
      if (!purchased) return false;
      const days = differenceInDays(new Date(), purchased);
      return days >= 7;
    });
    if (reviewsDue.length > 0) {
      out.push({
        id: 'reviews',
        priority: 4,
        icon: ShoppingBag,
        color: 'text-prism-amber',
        title: `${reviewsDue.length} purchase review${reviewsDue.length === 1 ? '' : 's'} ready`,
        detail: 'Reflect on recent purchases to sharpen your Fit Score over time.',
        href: '/coach#card-5',
        cta: 'Reflect',
      });
    }

    return out.sort((a, b) => a.priority - b.priority).slice(0, 3);
  }, [overBudget, leaks, deployments, guardChecks]);

  if (nudges.length === 0) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {nudges.map(n => {
        const Icon = n.icon;
        return (
          <Card key={n.id} className="p-3 bg-card/60 backdrop-blur-sm border-border/60 hover:border-prism-teal/40 transition-colors">
            <div className="flex items-start gap-2 mb-2">
              <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${n.color}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{n.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.detail}</p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="h-7 w-full text-[11px]">
              <Link to={n.href}>{n.cta} <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </Card>
        );
      })}
      <div className="sm:col-span-3 flex justify-end">
        <Button asChild size="sm" variant="ghost" className="h-7 text-[11px] gap-1 text-prism-amber">
          <Link to="/coach/chat">
            <Sparkles className="h-3 w-3" /> Ask Coach a question
          </Link>
        </Button>
      </div>
    </div>
  );
}

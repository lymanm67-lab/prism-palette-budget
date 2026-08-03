import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import {
  Target, TrendingUp, ShieldCheck, Home, KeyRound, GraduationCap,
  CheckCircle2, Circle, Wallet, ClipboardList, LineChart,
} from 'lucide-react';
import homeImg from '@/assets/mortgage-command-home.jpg';

const money = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PILLARS = [
  { icon: Target, title: 'CLEAR PLAN', body: 'Know every step of your journey.' },
  { icon: TrendingUp, title: 'PAY DOWN DEBT', body: 'Stay on track and build momentum.' },
  { icon: ShieldCheck, title: 'PROTECT CREDIT', body: 'Resolve, remove and regenerate.' },
  { icon: Home, title: 'PREPARE TO BUY', body: 'Be mortgage ready with confidence.' },
  { icon: KeyRound, title: 'OWN YOUR FUTURE', body: 'Build wealth. Build legacy. Build home.' },
];

const STATUS = [
  'Payment plans in progress',
  'Settlements in progress',
  'Credit improvement on track',
  'Debt freedom in sight',
];

const MILESTONES = [
  { date: 'AUG 26, 2026', title: 'Synchrony / PayPal', note: 'Paid in Full', done: true },
  { date: 'OCT 21, 2026', title: 'Discover', note: 'Paid in Full', done: true },
  { date: 'OCT 2026', title: "Kohl's / Capital One", note: 'Estimated Paid in Full', done: false, accent: true },
  { date: 'DEC 10, 2026', title: 'Upstart / LVNV Funding', note: 'Paid in Full', done: false },
  { date: 'APR 2027', title: 'GLA Collection', note: 'Estimated Paid in Full · Deletion from Credit Reports', done: false },
  { date: 'JUNE 2027', title: 'Mortgage Pre-Approval', note: '& Home Purchase Goal', done: false, home: true },
];

const SectionCard = ({
  title, tone = 'navy', children,
}: { title: string; tone?: 'navy' | 'green' | 'amber'; children: React.ReactNode }) => {
  const head =
    tone === 'green' ? 'bg-emerald-800 text-primary-foreground'
      : tone === 'amber' ? 'bg-prism-amber text-prism-navy'
        : 'bg-prism-navy text-primary-foreground';
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-card shadow-sm flex flex-col">
      <div className={`${head} px-4 py-2 text-center text-xs sm:text-sm font-extrabold tracking-wide uppercase`}>
        {title}
      </div>
      <div className="p-4 flex-1">{children}</div>
    </div>
  );
};

export default function MortgageCommandCenter() {
  const { household } = useHousehold();

  const { data: debts = [] } = useQuery({
    queryKey: ['mcc_debts', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('debt_items')
        .select('name, current_balance, original_balance')
        .eq('household_id', household!.id)
        .is('deleted_at', null);
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const rows = (debts as any[]).map((d) => ({
      name: d.name as string,
      bal: Number(d.current_balance ?? 0),
      orig: Number(d.original_balance ?? 0),
    }));
    const active = rows.filter((r) => r.bal > 0);
    const resolved = rows.filter((r) => r.bal <= 0);
    const totalRemaining = active.reduce((s, r) => s + r.bal, 0);
    const enrolled = rows.reduce((s, r) => s + (r.orig || r.bal), 0);
    const alloc = [...active]
      .sort((a, b) => b.bal - a.bal)
      .slice(0, 5)
      .map((r) => ({ ...r, pct: totalRemaining > 0 ? (r.bal / totalRemaining) * 100 : 0 }));
    return {
      total: rows.length,
      resolvedCount: resolved.length,
      activeCount: active.length,
      totalRemaining,
      enrolled,
      resolvedAmount: Math.max(0, enrolled - totalRemaining),
      alloc,
    };
  }, [debts]);

  const donutColors = ['hsl(var(--prism-navy))', 'hsl(var(--prism-teal))', 'hsl(var(--prism-amber))', 'hsl(var(--prism-orange))', 'hsl(var(--prism-navy-light))'];

  // build conic-gradient for the donut
  let acc = 0;
  const conic = stats.alloc.length
    ? stats.alloc.map((s, i) => {
        const from = acc; acc += s.pct;
        return `${donutColors[i % donutColors.length]} ${from}% ${acc}%`;
      }).join(', ')
    : 'hsl(var(--muted)) 0% 100%';

  return (
    <div className="space-y-4">
      {/* HERO */}
      <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
        <div className="grid lg:grid-cols-[1fr_auto] items-stretch">
          <div className="grid sm:grid-cols-[190px_1fr] gap-4 p-5 sm:p-7">
            <div className="text-center sm:border-r border-border sm:pr-4 flex flex-col justify-center gap-2">
              <Target className="h-10 w-10 mx-auto text-prism-amber" strokeWidth={1.5} />
              <div className="text-xs font-bold text-muted-foreground uppercase">Goal:</div>
              <div className="font-display text-lg font-extrabold text-prism-navy dark:text-foreground">Buy a Home</div>
              <div className="h-px bg-border my-1" />
              <div className="text-xs font-bold text-muted-foreground uppercase">Target Date:</div>
              <div className="font-display text-xl font-extrabold text-prism-amber">June 2027</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] sm:text-xs font-extrabold tracking-[0.25em] text-prism-amber">
                FOCUS • PLAN • PAY • PREPARE • OWN
              </div>
              <h2 className="font-display mt-3 text-3xl sm:text-5xl font-extrabold leading-[0.95] text-prism-navy dark:text-foreground">
                MORTGAGE<br />COMMAND CENTER
              </h2>
              <div className="mt-3 text-sm sm:text-base font-extrabold text-prism-amber uppercase tracking-wide">
                Your Roadmap to Homeownership
              </div>
              <div className="mt-1 text-sm italic text-muted-foreground">
                Discipline Today. Freedom Tomorrow. Legacy Forever.
              </div>
            </div>
          </div>
          <img
            src={homeImg}
            alt="Craftsman home at dusk representing the June 2027 home purchase goal"
            loading="lazy"
            width={1024}
            height={768}
            className="hidden lg:block h-full w-[340px] object-cover"
          />
        </div>

        {/* PILLARS */}
        <div className="bg-prism-navy text-primary-foreground grid sm:grid-cols-3 xl:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-primary-foreground/15">
          {PILLARS.map((p) => (
            <div key={p.title} className="flex items-start gap-3 px-4 py-4">
              <p.icon className="h-8 w-8 shrink-0 text-prism-amber" strokeWidth={1.5} />
              <div>
                <div className="text-xs font-extrabold tracking-wide">{p.title}</div>
                <div className="text-[11px] text-primary-foreground/75 leading-snug">{p.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ROW 2 */}
      <div className="grid gap-4 lg:grid-cols-4">
        <SectionCard title="Program: Gitmeid">
          <div className="space-y-3">
            <div>
              <div className="text-[11px] font-bold uppercase text-muted-foreground">Enrolled Balance</div>
              <div className="font-display text-2xl font-extrabold text-prism-navy dark:text-foreground">{money(stats.enrolled)}</div>
            </div>
            <div className="h-px bg-border" />
            <div>
              <div className="text-[11px] font-bold uppercase text-muted-foreground">Resolved Debt (Paid/Settled)</div>
              <div className="font-display text-2xl font-extrabold text-emerald-600">{money(stats.resolvedAmount)}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase text-muted-foreground">Active Debt</div>
              <div className="font-display text-2xl font-extrabold text-destructive">{money(stats.totalRemaining)}</div>
              <div className="text-xs text-muted-foreground">(Paid by January 2027)</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Current Status" tone="green">
          <ul className="space-y-2.5">
            {STATUS.map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 text-center text-sm font-extrabold text-emerald-700 dark:text-emerald-400 uppercase">
            Target Mortgage Ready:<br />June 2027
          </div>
        </SectionCard>

        <SectionCard title="Key Milestones Timeline">
          <ol className="relative space-y-3">
            {MILESTONES.map((m, i) => (
              <li key={m.date + i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  {m.home ? (
                    <span className="h-5 w-5 rounded-full bg-emerald-600 grid place-items-center">
                      <Home className="h-3 w-3 text-primary-foreground" />
                    </span>
                  ) : m.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Circle className={`h-5 w-5 ${m.accent ? 'text-prism-amber' : 'text-prism-navy dark:text-prism-teal'}`} strokeWidth={2.5} />
                  )}
                  {i < MILESTONES.length - 1 && <span className="flex-1 w-px bg-emerald-600/40 mt-1" />}
                </div>
                <div className="grid grid-cols-[92px_1fr] gap-2 flex-1 pb-1">
                  <div className={`text-[11px] font-extrabold ${m.accent ? 'text-prism-amber' : m.done ? 'text-emerald-700 dark:text-emerald-400' : 'text-prism-navy dark:text-prism-teal'}`}>
                    {m.date}
                  </div>
                  <div>
                    <div className="text-[11px] font-bold leading-tight">{m.title}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">{m.note}</div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>

        <SectionCard title="First Time Homebuyer Education Course" tone="amber">
          <div className="flex items-start gap-3">
            <span className="h-11 w-11 shrink-0 rounded-full bg-prism-navy grid place-items-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </span>
            <div>
              <div className="font-display text-lg font-extrabold text-prism-navy dark:text-foreground">In Progress</div>
              <p className="text-xs text-muted-foreground mt-1">
                Great step! This course will help you build confidence and meet lender requirements.
              </p>
            </div>
          </div>
          <div className="h-px bg-border my-4" />
          <div className="text-center text-sm font-extrabold text-prism-amber uppercase">
            Course Completion Goal:<br />May 2027
          </div>
        </SectionCard>
      </div>

      {/* ROW 3 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Total Accounts Summary">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { icon: ClipboardList, n: stats.total, l: 'Total Accounts', c: 'bg-prism-navy' },
              { icon: CheckCircle2, n: stats.resolvedCount, l: 'Resolved (Paid/Settled)', c: 'bg-emerald-700' },
              { icon: Wallet, n: stats.activeCount, l: 'Active Accounts', c: 'bg-prism-amber' },
            ].map((s) => (
              <div key={s.l} className="space-y-1.5">
                <span className={`${s.c} h-11 w-11 mx-auto rounded-full grid place-items-center`}>
                  <s.icon className="h-5 w-5 text-primary-foreground" />
                </span>
                <div className="font-display text-2xl font-extrabold">{s.n}</div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground leading-tight">{s.l}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Balance Allocation (Current)">
          <div className="flex items-center gap-4">
            <div className="relative h-28 w-28 shrink-0 rounded-full" style={{ background: `conic-gradient(${conic})` }}>
              <div className="absolute inset-[22%] rounded-full bg-card grid place-items-center text-center">
                <div>
                  <div className="text-[11px] font-extrabold leading-none">
                    ${Math.round(stats.totalRemaining).toLocaleString()}
                  </div>
                  <div className="text-[7px] uppercase text-muted-foreground tracking-wide">Total Remaining</div>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              {stats.alloc.length === 0 && <div className="text-xs text-muted-foreground">No active debts.</div>}
              {stats.alloc.map((s, i) => (
                <div key={s.name} className="grid grid-cols-[10px_1fr_auto_44px] items-center gap-2 text-[11px]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: donutColors[i % donutColors.length] }} />
                  <span className="truncate">{s.name}</span>
                  <span className="font-semibold tabular-nums">{money(s.bal)}</span>
                  <span className="text-muted-foreground tabular-nums text-right">{s.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Key Highlights">
          <ul className="space-y-3">
            {[
              { icon: LineChart, body: <>On track to be <strong>100% debt resolved</strong> before <strong className="text-emerald-600">June 2027!</strong></> },
              { icon: ClipboardList, body: <>Maintain low credit utilization and avoid new debt.</> },
              { icon: Target, body: <>Stay focused. Stay consistent. <strong className="text-emerald-600">The finish line is near!</strong></> },
            ].map((h, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="h-9 w-9 shrink-0 rounded-full bg-prism-navy grid place-items-center">
                  <h.icon className="h-4 w-4 text-primary-foreground" />
                </span>
                <span className="text-xs leading-snug">{h.body}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* FOOTER */}
      <div className="rounded-xl bg-prism-navy text-primary-foreground px-6 py-4 text-center">
        <div className="flex items-center justify-center gap-4">
          <Home className="h-7 w-7 text-prism-amber hidden sm:block" />
          <div>
            <div className="text-xs sm:text-sm font-extrabold tracking-[0.2em] text-prism-amber uppercase">
              Your Home. Your Legacy. Your Freedom.
            </div>
            <div className="text-xs italic text-primary-foreground/80 mt-1">
              Stay focused. Stay consistent. The finish line is near!
            </div>
          </div>
          <Home className="h-7 w-7 text-prism-amber hidden sm:block" />
        </div>
      </div>
    </div>
  );
}

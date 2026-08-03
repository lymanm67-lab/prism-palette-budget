import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, LabelList,
} from 'recharts';
import {
  Target, Home, GraduationCap, CheckCircle2, Circle, ShieldCheck,
  FileText, CalendarCheck, Heart, Crosshair,
} from 'lucide-react';

const money = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ---------------- data (from the Mortgage Command Center binder, 7/17/26) ---------------- */

const AS_OF = 'Aug 3, 2026';
const PROGRAM = { enrolled: 26762.25, resolved: 23020.99, remaining: 3741.26, pctResolved: 86.02 };
const ACCOUNT_COUNTS = { total: 13, resolved: 10, active: 4 };

const ACCOUNTS = [
  { name: 'Upstart / LVNV Funding (1838-224)', status: 'Resolved — Payments Pending', kind: 'plan', balance: 1487.80, payment: '$371.95', remaining: '4', payoff: 'Dec 10, 2026' },
  { name: 'GLA Collection (INTEG Health System PC)', status: 'Payment Plan In Progress', kind: 'plan', balance: 1566.18, payment: '$250.00', remaining: '7 (Est.)', payoff: 'Feb 2027 Final Pmt ~$66.18' },
  { name: 'Discover', status: 'Payment Plan In Progress', kind: 'plan', balance: 208.28, payment: '$100.00 (9/21)\n$108.28 (10/21)', remaining: '2', payoff: 'Oct 21, 2026' },
  { name: "Kohl's / Capital One", status: 'Settlement In Progress', kind: 'settle', balance: 479.00, payment: '$100.00', remaining: '5', payoff: 'Dec 2026' },
];
const TOTAL_REMAINING = 3741.26;

const DECLINE = [
  { m: 'AUG 2026', v: 3741 }, { m: 'SEP 2026', v: 3391 }, { m: 'OCT 2026', v: 2569 },
  { m: 'NOV 2026', v: 1739 }, { m: 'DEC 2026', v: 1017 }, { m: 'JAN 2027', v: 316 },
  { m: 'FEB 2027', v: 66 }, { m: 'MAR 2027', v: 0 },
];

const ALLOC = [
  { name: 'Upstart / LVNV', amt: 1487.80, pct: 39.8, color: 'hsl(var(--prism-navy))' },
  { name: 'GLA Collection', amt: 1566.18, pct: 41.9, color: 'hsl(216 90% 45%)' },
  { name: 'Discover', amt: 208.28, pct: 5.6, color: 'hsl(var(--prism-amber))' },
  { name: "Kohl's / Capital One", amt: 479.00, pct: 12.8, color: 'hsl(190 65% 45%)' },
];

const ARCHIVED = [
  { name: 'Capital One (5178)', note: 'Removed from Report' },
  { name: 'NetCredit', note: 'Removed from Report' },
  { name: 'USAA', note: 'Removed from Report' },
  { name: 'Capital One (4802)', note: 'Removed from Report' },
  { name: 'Synchrony / PayPal (SYNCB/PPC)', note: 'Paid in Full — Balance $0.00', badge: 'NEW' },
  { name: 'FEB-RETA / DNF Associates', note: 'Deletion Agreed — Email Confirmation Pending', badge: 'NEW' },
];

const CAL_MONTHS = ['JUL 2026', 'AUG 2026', 'SEP 2026', 'OCT 2026', 'NOV 2026', 'DEC 2026', 'JAN 2027', 'FEB 2027', 'MAR 2027', 'APR 2027'];
const CAL_ROWS: { name: string; color: string; vals: (string)[] }[] = [
  { name: 'Upstart / LVNV', color: 'hsl(var(--prism-navy))', vals: ['–', '–', '$372', '$372', '$372', '$372', '–', '–', '–', '–'] },
  { name: 'GLA Collection*', color: 'hsl(152 60% 38%)', vals: ['$250', '$250', '$250', '$250', '$250', '$250', '$250', '$66', '–', '–'] },
  { name: 'Discover', color: 'hsl(var(--prism-orange))', vals: ['–', '–', '$100', '$108', '–', '–', '–', '–', '–', '–'] },
  { name: "Kohl's / Capital One", color: 'hsl(var(--prism-amber))', vals: ['$100', '$100', '$100', '$100', '$100', '$79', '–', '–', '–', '–'] },
];
const CAL_TOTALS = ['$350', '$350', '$822', '$830', '$722', '$701', '$250', '$66', '–', '–'];



const MILESTONES = [
  { date: 'AUG 26, 2026', title: 'Synchrony / PayPal', note: 'Paid in Full', done: true },
  { date: 'OCT 21, 2026', title: 'Discover', note: 'Paid in Full', done: true },
  { date: 'DEC 2026', title: "Kohl's / Capital One", note: 'Estimated Paid in Full', accent: true },
  { date: 'DEC 10, 2026', title: 'Upstart / LVNV Funding', note: 'Paid in Full' },
  { date: 'FEB 2027', title: 'GLA Collection', note: 'Estimated Paid in Full · Deletion from Credit Reports Agreed After Payoff' },
  { date: 'JUNE 2027', title: 'Mortgage Pre-Approval', note: '& Home Purchase Goal', home: true },
];

const CHECKLIST = [
  { label: 'Pay all accounts as agreed', done: true },
  { label: 'GLA payoff & deletion verification (Feb–Mar 2027)', done: true },
  { label: 'Confirm all accounts show $0 balance', done: false },
  { label: 'Pull all 3 credit reports (May 2027)', done: false },
  { label: 'Ensure all negative items removed / updated', done: false },
  { label: 'Maintain low credit utilization', done: true },
  { label: 'Avoid new debt / inquiries', done: true },
  { label: 'Save for down payment & closing costs', done: true },
  { label: 'Get mortgage pre-approval', done: false },
];

const NOTES = [
  { icon: Crosshair, body: 'Stay disciplined. Every payment gets you closer to homeownership.' },
  { icon: FileText, body: 'Document everything — confirmations, receipts, letters.' },
  { icon: CalendarCheck, body: 'Review your plan monthly and update as needed.' },
  { icon: Heart, body: <span className="font-bold text-emerald-600">You&apos;ve come a long way. The finish line is near!</span> },
];

/* ---------------- shell ---------------- */

const Panel = ({
  title, tone = 'navy', className = '', children,
}: { title: string; tone?: 'navy' | 'green' | 'purple'; className?: string; children: React.ReactNode }) => {
  const head = tone === 'green' ? 'bg-emerald-800' : tone === 'purple' ? 'bg-violet-800' : 'bg-prism-navy';
  return (
    <div className={`rounded-xl overflow-hidden border border-border bg-card shadow-sm flex flex-col ${className}`}>
      <div className={`${head} text-primary-foreground px-3 py-2 text-center text-[11px] sm:text-xs font-extrabold tracking-wide uppercase`}>
        {title}
      </div>
      <div className="p-3 sm:p-4 flex-1">{children}</div>
    </div>
  );
};

export default function MortgageCommandCenter() {
  const conic = useMemo(() => {
    let acc = 0;
    return ALLOC.map((a) => {
      const from = acc; acc += a.pct;
      return `${a.color} ${from}% ${acc}%`;
    }).join(', ');
  }, []);

  const ringStyle = { background: `conic-gradient(hsl(152 60% 32%) 0% ${PROGRAM.pctResolved}%, hsl(var(--muted)) ${PROGRAM.pctResolved}% 100%)` };

  return (
    <div className="space-y-3">
      {/* HEADER */}
      <div className="rounded-xl bg-prism-navy text-primary-foreground px-4 py-4 grid lg:grid-cols-[1fr_auto] items-center gap-4">
        <div className="text-center">
          <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight">MORTGAGE COMMAND CENTER</h2>
          <div className="text-xs sm:text-sm font-extrabold text-prism-amber mt-1 uppercase">
            Your Roadmap to Homeownership — Target Date: June 2027
          </div>
          <div className="text-[11px] font-semibold text-primary-foreground/80 mt-1">
            Remaining debt {money(PROGRAM.remaining)} as of {AS_OF}
          </div>

        </div>
        <div className="mx-auto rounded-lg border-2 border-prism-amber/70 px-4 py-2 flex items-center gap-3">
          <Target className="h-8 w-8 text-primary-foreground shrink-0" strokeWidth={1.5} />
          <div>
            <div className="text-sm font-extrabold uppercase">Goal: Buy a Home</div>
            <div className="text-xs font-extrabold text-emerald-400 uppercase">Target Date: June 2027</div>
          </div>
        </div>
      </div>

      {/* 1 — WHERE I STAND */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Program Overview — Gitmeid">
          <div className="text-center space-y-1">
            <div className="text-[11px] font-bold uppercase text-muted-foreground">Total Enrolled Balance</div>
            <div className="font-display text-2xl font-extrabold text-prism-navy dark:text-foreground">{money(PROGRAM.enrolled)}</div>
            <div className="h-px bg-border my-2" />
            <div className="text-[11px] font-bold uppercase text-muted-foreground">Total Resolved (Paid/Settled)</div>
            <div className="font-display text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">{money(PROGRAM.resolved)}</div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className="relative h-24 w-24 shrink-0 rounded-full" style={ringStyle}>
              <div className="absolute inset-[18%] rounded-full bg-card grid place-items-center">
                <span className="font-display text-base font-extrabold text-emerald-700 dark:text-emerald-400">{PROGRAM.pctResolved}%</span>
              </div>
            </div>
            <div className="text-xs">
              <div className="font-bold uppercase text-muted-foreground leading-tight">Of enrolled<br />debt resolved</div>
              <div className="mt-2 font-semibold">{money(PROGRAM.remaining)} remaining</div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border">
            <div className="text-center text-[10px] font-extrabold uppercase text-prism-navy dark:text-prism-teal">Accounts</div>
            <div className="grid grid-cols-3 text-center mt-1 divide-x divide-border">
              {[['Total', ACCOUNT_COUNTS.total], ['Resolved', ACCOUNT_COUNTS.resolved], ['Active', ACCOUNT_COUNTS.active]].map(([l, v]) => (
                <div key={l as string}>
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">{l}</div>
                  <div className="font-display text-xl font-extrabold">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Progress to Goal">
          <div className="grid grid-cols-2 gap-6 items-end h-44">
            <div className="text-center">
              <div className="text-[11px] font-extrabold mb-1">{money(PROGRAM.resolved)}</div>
              <div className="mx-auto w-full bg-emerald-700 rounded-t-md grid place-items-center" style={{ height: '150px' }}>
                <span className="text-primary-foreground font-extrabold text-sm">{PROGRAM.pctResolved}%</span>
              </div>
              <div className="text-[10px] font-bold uppercase text-muted-foreground mt-1 leading-tight">Resolved<br />(Paid / Settled)</div>
            </div>
            <div className="text-center">
              <div className="text-[11px] font-extrabold mb-1">{money(PROGRAM.remaining)}</div>
              <div className="mx-auto w-full bg-sky-500 rounded-t-md grid place-items-center" style={{ height: '48px' }}>
                <span className="text-primary-foreground font-extrabold text-xs">13.98%</span>
              </div>
              <div className="text-[10px] font-bold uppercase text-muted-foreground mt-1 leading-tight">Remaining<br />Balance</div>
            </div>
          </div>
        </Panel>

        <Panel title="Balance Allocation">
          <div className="flex items-center gap-4">
            <div className="relative h-28 w-28 shrink-0 rounded-full" style={{ background: `conic-gradient(${conic})` }}>
              <div className="absolute inset-[24%] rounded-full bg-card grid place-items-center text-center">
                <div>
                  <div className="text-[11px] font-extrabold leading-none">{money(TOTAL_REMAINING)}</div>
                  <div className="text-[7px] uppercase text-muted-foreground tracking-wide">Total Remaining</div>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              {ALLOC.map((a) => (
                <div key={a.name} className="grid grid-cols-[10px_1fr_auto_40px] items-center gap-2 text-[10px]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                  <span className="truncate">{a.name}</span>
                  <span className="font-semibold tabular-nums">{money(a.amt)}</span>
                  <span className="text-muted-foreground tabular-nums text-right">{a.pct}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-[11px]">You&apos;re in the final stretch! Stay focused and finish strong.</span>
          </div>
        </Panel>
      </div>

      {/* 2 — WHAT I STILL OWE */}
      <div className="grid gap-3">
        <Panel title="Account Status Summary">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-muted/60 text-[10px] uppercase font-extrabold text-muted-foreground">
                  {['Account', 'Status', 'Balance Owed', 'Monthly Payment', 'Pmts Left', 'Est. Payoff'].map((h) => (
                    <th key={h} className="border border-border px-2 py-1.5 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ACCOUNTS.map((a) => (
                  <tr key={a.name} className={a.kind === 'settle' ? 'bg-prism-amber/10' : undefined}>
                    <td className="border border-border px-2 py-2 font-bold">{a.name}</td>
                    <td className={`border border-border px-2 py-2 font-bold ${a.kind === 'settle' ? 'text-prism-orange' : 'text-prism-navy dark:text-prism-teal'}`}>
                      {a.status}
                    </td>
                    <td className="border border-border px-2 py-2 text-center tabular-nums">{money(a.balance)}</td>
                    <td className="border border-border px-2 py-2 text-center tabular-nums whitespace-pre-line">{a.payment}</td>
                    <td className="border border-border px-2 py-2 text-center">{a.remaining}</td>
                    <td className="border border-border px-2 py-2 text-center font-semibold text-prism-navy dark:text-prism-teal">{a.payoff}</td>
                  </tr>
                ))}
                <tr className="bg-muted/60 font-extrabold">
                  <td className="border border-border px-2 py-2 text-right" colSpan={2}>Total Remaining Balance</td>
                  <td className="border border-border px-2 py-2 text-center tabular-nums">{money(TOTAL_REMAINING)}</td>
                  <td className="border border-border px-2 py-2 text-right" colSpan={2}>Weighted Avg. Payoff</td>
                  <td className="border border-border px-2 py-2 text-center">Feb 2027</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* 3 — WHAT I PAY EACH MONTH */}
      <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Monthly Payment Calendar">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="bg-muted/60 uppercase font-extrabold text-muted-foreground">
                  <th className="border border-border px-2 py-1 text-left">Account</th>
                  {CAL_MONTHS.map((m) => (
                    <th key={m} className="border border-border px-1 py-1 text-center whitespace-pre-line">{m.replace(' ', '\n')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAL_ROWS.map((r) => (
                  <tr key={r.name}>
                    <td className="border border-border px-2 py-1.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
                        <span className="font-semibold">{r.name}</span>
                      </span>
                    </td>
                    {r.vals.map((v, i) => (
                      <td key={i} className="border border-border px-1 py-1.5 text-center tabular-nums">{v}</td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-muted/60 font-extrabold">
                  <td className="border border-border px-2 py-1.5">Total Paid</td>
                  {CAL_TOTALS.map((v, i) => (
                    <td key={i} className="border border-border px-1 py-1.5 text-center tabular-nums">{v}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="text-[9px] text-muted-foreground mt-2">
            *GLA Collection (INTEG Health System PC · Acct Ref 25028855 · DOS 07/19/23): $250.00/month. Final pmt ~ $66.18 in Feb 2027.
          </div>
        </Panel>

        <Panel title="Total Balance Decline (All Active Accounts)">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DECLINE} margin={{ top: 18, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="m" tick={{ fontSize: 9 }} interval={0} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v: number) => money(v)} contentStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="v" stroke="hsl(216 90% 45%)" strokeWidth={2} dot={{ r: 3 }}>
                  <LabelList dataKey="v" position="top" formatter={(v: number) => `$${v.toLocaleString()}`} style={{ fontSize: 9, fill: 'hsl(var(--foreground))' }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center text-xs font-extrabold italic text-prism-navy dark:text-prism-teal mt-2">
            On track to be 100% debt resolved before June 2027!
          </div>
        </Panel>
      </div>

      {/* 4 — WHERE I AM GOING */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Key Milestones Timeline">
          <ol className="space-y-3">
            {MILESTONES.map((m, i) => (
              <li key={m.date} className="flex gap-2.5">
                <div className="flex flex-col items-center">
                  {m.home ? (
                    <span className="h-5 w-5 rounded-full bg-emerald-700 grid place-items-center"><Home className="h-3 w-3 text-primary-foreground" /></span>
                  ) : m.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Circle className={`h-5 w-5 ${m.accent ? 'text-prism-amber' : 'text-prism-navy dark:text-prism-teal'}`} strokeWidth={2.5} />
                  )}
                  {i < MILESTONES.length - 1 && <span className="flex-1 w-px bg-emerald-600/40 mt-1" />}
                </div>
                <div className="grid grid-cols-[86px_1fr] gap-2 flex-1 pb-1">
                  <div className={`text-[10px] font-extrabold ${m.accent ? 'text-prism-amber' : m.done ? 'text-emerald-700 dark:text-emerald-400' : 'text-prism-navy dark:text-prism-teal'}`}>{m.date}</div>
                  <div>
                    <div className="text-[10px] font-bold leading-tight">{m.title}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">{m.note}</div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="Mortgage Readiness Checklist" tone="green">
          <ul className="space-y-1.5">
            {CHECKLIST.map((c) => (
              <li key={c.label} className="flex items-start gap-2 text-[11px]">
                {c.done
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  : <span className="h-3.5 w-3.5 mt-0.5 shrink-0 rounded-sm border-2 border-muted-foreground/50" />}
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase">
            Target: Pre-Approval by June 2027
          </div>
        </Panel>

        <Panel title="Mortgage Education Progress" tone="purple">
          <div className="flex items-start gap-3">
            <span className="h-10 w-10 shrink-0 rounded-full bg-violet-800 grid place-items-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </span>
            <div>
              <div className="text-[11px] font-extrabold text-violet-700 dark:text-violet-300 uppercase">First Time Homebuyer Education Course</div>
              <div className="text-[11px] font-bold mt-0.5">Status: <span className="text-prism-orange">In Progress</span></div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Great step! This course will help you build confidence and meet lender requirements.
              </p>
              <div className="text-[11px] font-extrabold text-violet-700 dark:text-violet-300 mt-2">
                Course Completion Goal: May 2027
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* 5 — PROOF & REMINDERS */}
      <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Completed & Settled Accounts (Archived)" tone="green">
          <ul className="space-y-2">
            {ARCHIVED.map((a) => (
              <li key={a.name} className="grid grid-cols-[16px_1fr] gap-2 items-start border-b border-border/50 pb-2 last:border-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate">{a.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    Settled &amp; Paid · $0.00 · {a.note}
                    {a.badge && (
                      <span className="ml-1 rounded bg-emerald-700 px-1 py-0.5 text-[8px] font-extrabold text-primary-foreground align-middle">{a.badge}</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 text-[10px] font-bold italic text-emerald-700 dark:text-emerald-400">
            Keep all settlement letters and confirmations in your documentation binder.
          </div>
        </Panel>

        <Panel title="Key Notes">
          <ul className="space-y-2">
            {NOTES.map((n, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px]">
                <n.icon className="h-4 w-4 text-prism-navy dark:text-prism-teal shrink-0 mt-0.5" />
                <span>{n.body}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

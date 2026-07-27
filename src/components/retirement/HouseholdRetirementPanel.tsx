import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, User, TrendingUp, PiggyBank, Save, RotateCcw } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";

/**
 * Household retirement view: Lyman, Kateri, and Combined.
 * Figures are seeded from the household's verified payroll data and are editable.
 */

export interface SpouseRetirementInputs {
  name: string;
  currentAge: number;
  retirementAge: number;
  monthlyGross: number;
  /** Contribution-eligible W-2 salary (excludes 1099/consulting income). */
  employerBaseMonthly?: number;
  employeeMonthly: number;
  employerMonthly: number;
  deferredCompMonthly: number;
  currentBalance: number;
  expectedReturnPct: number;
}

const DEFAULTS: Record<"lyman" | "kateri", SpouseRetirementInputs> = {
  // Lyman: IU advice 07/31/2026 — W-2 $70,940.04/yr ($5,911.67/mo) + consulting $641.67/mo.
  // Employer Base Retirement Plan $532.05/mo = 9% non-elective on W-2 salary (no match).
  // Employee pre-tax: TDA $100 + IU 457(b) $75 + HSA $116.66 = $291.66/mo.
  // Deferred comp (Roth): Roth TDA $85 + Roth 457(b) $75 = $160/mo.
  lyman: {
    name: "Lyman",
    currentAge: 59,
    retirementAge: 75,
    monthlyGross: 6553.34,
    employerBaseMonthly: 5911.67,
    employeeMonthly: 291.66,
    employerMonthly: 532.05,
    deferredCompMonthly: 160,

    currentBalance: 176512.76,
    expectedReturnPct: 7,
  },
  // Kateri: State of Ohio biweekly advice 07/24/2026 annualized at 26 pays.
  // Gross $4,317.60/pay, OPERS employee $431.76/pay, employer $604.46/pay, Ohio DC $25/pay.
  // Balance = OPERS $328,948.74 + Ohio Deferred Compensation $35,447.45.
  kateri: {
    name: "Kateri",
    currentAge: 57,
    retirementAge: 67,
    monthlyGross: 9354.8,
    employeeMonthly: 935.48,
    employerMonthly: 1309.66,
    deferredCompMonthly: 54.17,
    currentBalance: 364396.19,
    expectedReturnPct: 7,
  },
};

const LS_KEY = "household-retirement-panel-v4";


const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const money2 = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function futureValue(i: SpouseRetirementInputs) {
  const years = Math.max(0, i.retirementAge - i.currentAge);
  const months = years * 12;
  const r = i.expectedReturnPct / 100 / 12;
  const pmt = i.employeeMonthly + i.employerMonthly + i.deferredCompMonthly;
  if (r === 0) return i.currentBalance + pmt * months;
  const growth = Math.pow(1 + r, months);
  return i.currentBalance * growth + pmt * ((growth - 1) / r);
}

function totals(i: SpouseRetirementInputs) {
  const monthlyTotal = i.employeeMonthly + i.employerMonthly + i.deferredCompMonthly;
  const employerBase = i.employerBaseMonthly || i.monthlyGross;
  return {
    monthlyTotal,
    annualTotal: monthlyTotal * 12,
    annualGross: i.monthlyGross * 12,
    savingsRate: i.monthlyGross > 0 ? (monthlyTotal / i.monthlyGross) * 100 : 0,
    employerPct: employerBase > 0 ? (i.employerMonthly / employerBase) * 100 : 0,
    projected: futureValue(i),
    yearsToRetire: Math.max(0, i.retirementAge - i.currentAge),
  };
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border bg-card/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-base font-bold tabular-nums ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function EditRow({
  data, onChange,
}: { data: SpouseRetirementInputs; onChange: (patch: Partial<SpouseRetirementInputs>) => void }) {
  const num = (v: string) => (v === "" ? 0 : Number(v));
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div><Label className="text-xs">Current age</Label><Input type="number" value={data.currentAge} onChange={(e) => onChange({ currentAge: num(e.target.value) })} /></div>
      <div><Label className="text-xs">Retirement age</Label><Input type="number" value={data.retirementAge} onChange={(e) => onChange({ retirementAge: num(e.target.value) })} /></div>
      <div><Label className="text-xs">Monthly gross ($)</Label><Input type="number" value={data.monthlyGross} onChange={(e) => onChange({ monthlyGross: num(e.target.value) })} /></div>
      <div><Label className="text-xs">Current balance ($)</Label><Input type="number" value={data.currentBalance} onChange={(e) => onChange({ currentBalance: num(e.target.value) })} /></div>
      <div><Label className="text-xs">Employee /mo ($)</Label><Input type="number" value={data.employeeMonthly} onChange={(e) => onChange({ employeeMonthly: num(e.target.value) })} /></div>
      <div><Label className="text-xs">Employer /mo ($)</Label><Input type="number" value={data.employerMonthly} onChange={(e) => onChange({ employerMonthly: num(e.target.value) })} /></div>
      <div><Label className="text-xs">Deferred comp /mo ($)</Label><Input type="number" value={data.deferredCompMonthly} onChange={(e) => onChange({ deferredCompMonthly: num(e.target.value) })} /></div>
      <div><Label className="text-xs">Expected return %</Label><Input type="number" value={data.expectedReturnPct} onChange={(e) => onChange({ expectedReturnPct: num(e.target.value) })} /></div>
    </div>
  );
}

export default function HouseholdRetirementPanel() {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          lyman: { ...DEFAULTS.lyman, ...parsed.lyman },
          kateri: { ...DEFAULTS.kateri, ...parsed.kateri },
        };
      }
    } catch { /* ignore */ }
    return DEFAULTS;
  });
  const [view, setView] = useState<"combined" | "lyman" | "kateri">("combined");

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const patch = (who: "lyman" | "kateri") => (p: Partial<SpouseRetirementInputs>) =>
    setState((s) => ({ ...s, [who]: { ...s[who], ...p } }));

  const L = useMemo(() => totals(state.lyman), [state.lyman]);
  const K = useMemo(() => totals(state.kateri), [state.kateri]);

  const combined = useMemo(() => {
    const monthlyTotal = L.monthlyTotal + K.monthlyTotal;
    const gross = state.lyman.monthlyGross + state.kateri.monthlyGross;
    return {
      monthlyTotal,
      annualTotal: monthlyTotal * 12,
      annualGross: gross * 12,
      savingsRate: gross > 0 ? (monthlyTotal / gross) * 100 : 0,
      employerPct: (() => {
        const base = (state.lyman.employerBaseMonthly || state.lyman.monthlyGross)
          + (state.kateri.employerBaseMonthly || state.kateri.monthlyGross);
        return base > 0 ? ((state.lyman.employerMonthly + state.kateri.employerMonthly) / base) * 100 : 0;
      })(),
      projected: L.projected + K.projected,
      balance: state.lyman.currentBalance + state.kateri.currentBalance,
    };
  }, [L, K, state]);

  const active = view === "lyman" ? L : view === "kateri" ? K : combined;
  const activeInputs = view === "kateri" ? state.kateri : state.lyman;

  const chartData = [
    {
      name: "Lyman",
      Employee: Math.round(state.lyman.employeeMonthly),
      Employer: Math.round(state.lyman.employerMonthly),
      "Deferred comp": Math.round(state.lyman.deferredCompMonthly),
    },
    {
      name: "Kateri",
      Employee: Math.round(state.kateri.employeeMonthly),
      Employer: Math.round(state.kateri.employerMonthly),
      "Deferred comp": Math.round(state.kateri.deferredCompMonthly),
    },
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Household Retirement — Lyman &amp; Kateri
          </span>
          <span className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              Combined {combined.savingsRate.toFixed(1)}% of gross
            </Badge>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={handleReset}>
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
            <Button size="sm" className="h-7 gap-1 text-xs" onClick={handleSave}>
              <Save className="h-3 w-3" /> Save
            </Button>
          </span>

        </CardTitle>
        <CardDescription className="text-xs">
          Individual and combined retirement funding. Seeded from verified payroll; edit any figure to re-model.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList className="grid grid-cols-3 w-full md:w-[380px]">
            <TabsTrigger value="combined"><Users className="h-3.5 w-3.5 mr-1.5" /> Combined</TabsTrigger>
            <TabsTrigger value="lyman"><User className="h-3.5 w-3.5 mr-1.5" /> Lyman</TabsTrigger>
            <TabsTrigger value="kateri"><User className="h-3.5 w-3.5 mr-1.5" /> Kateri</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Annual gross" value={money(active.annualGross)} />
          <Stat label="Total contributions /mo" value={money2(active.monthlyTotal)} accent />
          <Stat label="Savings rate" value={`${active.savingsRate.toFixed(1)}%`} />
          <Stat label="Projected at retirement" value={money(active.projected)} accent />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-medium flex items-center gap-1">
              <PiggyBank className="h-3.5 w-3.5 text-emerald-500" /> Savings rate vs 20% target
            </span>
            <span className={active.savingsRate >= 20 ? "font-bold text-emerald-600 dark:text-emerald-400" : "font-bold text-amber-600 dark:text-amber-400"}>
              {active.savingsRate.toFixed(1)}%
            </span>
          </div>
          <Progress value={Math.min(active.savingsRate, 100)} className="h-2" />
        </div>

        {/* Side-by-side reconciliation */}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-2 font-semibold">Line</th>
                <th className="p-2 text-right font-semibold">Lyman</th>
                <th className="p-2 text-right font-semibold">Kateri</th>
                <th className="p-2 text-right font-semibold">Combined</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[
                ["Monthly gross", state.lyman.monthlyGross, state.kateri.monthlyGross],
                ["Employee contribution", state.lyman.employeeMonthly, state.kateri.employeeMonthly],
                ["Employer contribution", state.lyman.employerMonthly, state.kateri.employerMonthly],
                ["Deferred comp", state.lyman.deferredCompMonthly, state.kateri.deferredCompMonthly],
                ["Total monthly funding", L.monthlyTotal, K.monthlyTotal],
                ["Current balance", state.lyman.currentBalance, state.kateri.currentBalance],
                ["Projected at retirement", L.projected, K.projected],
              ].map(([label, l, k], idx) => (
                <tr key={label as string} className={idx % 2 ? "bg-muted/20" : ""}>
                  <td className="p-2">{label as string}</td>
                  <td className="p-2 text-right">{money2(l as number)}</td>
                  <td className="p-2 text-right">{money2(k as number)}</td>
                  <td className="p-2 text-right font-semibold">{money2((l as number) + (k as number))}</td>
                </tr>
              ))}
              <tr className="border-t bg-primary/5">
                <td className="p-2 font-semibold">Employer % of gross</td>
                <td className="p-2 text-right">{L.employerPct.toFixed(1)}%</td>
                <td className="p-2 text-right">{K.employerPct.toFixed(1)}%</td>
                <td className="p-2 text-right font-semibold">{combined.employerPct.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Contribution mix chart */}
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(v: number) => money2(v)}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "hsl(var(--popover-foreground))",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Employee" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Employer" stackId="a" fill="hsl(var(--chart-2, var(--primary)))" fillOpacity={0.65} />
              <Bar dataKey="Deferred comp" stackId="a" fill="hsl(var(--muted-foreground))" fillOpacity={0.5} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Editors */}
        {view === "combined" ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-primary" /> Lyman</p>
              <EditRow data={state.lyman} onChange={patch("lyman")} />
            </div>
            <div>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-primary" /> Kateri</p>
              <EditRow data={state.kateri} onChange={patch("kateri")} />
            </div>
          </div>
        ) : (
          <EditRow data={activeInputs} onChange={patch(view)} />
        )}

        <p className="text-[11px] text-muted-foreground italic">
          Projections assume level contributions and the stated return, compounded monthly. Verify pension survivor
          options and Social Security spousal benefits with a qualified advisor.
        </p>
      </CardContent>
    </Card>
  );
}

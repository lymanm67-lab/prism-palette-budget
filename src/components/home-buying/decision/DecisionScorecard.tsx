import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, HelpCircle, AlertTriangle, ShieldAlert, Printer } from 'lucide-react';
import { fmt$ } from '@/lib/home-buying/mortgage-math';
import { computeDecision, STATUS_META, type DecisionInputs } from '@/lib/home-buying/decision/decision-engine';
import { loadPreferences } from '@/lib/home-buying/decision/preferences';
import {
  loadWalk, loadNbhd, loadPrefChecks, savePrefChecks, saveDecision,
  type PropertyProfile,
} from '@/lib/home-buying/decision/walkthrough-store';
import { loadProfile } from '@/lib/home-buying/search-profile';
import { INSPECTOR_QUESTIONS } from '@/lib/home-buying/decision/walkthrough-defs';
import { toast } from 'sonner';

interface Props { property: PropertyProfile; }

export default function DecisionScorecard({ property }: Props) {
  const searchProfile = loadProfile();
  const prefs = loadPreferences();

  const [prefChecks, setPrefChecks] = useState<Record<string, boolean>>(() => loadPrefChecks(property.id));
  const [maxMonthly, setMaxMonthly] = useState(searchProfile.maxMonthlyPayment);
  const [savings, setSavings] = useState(30000);
  const [cashToClose, setCashToClose] = useState(Math.round(property.price * (searchProfile.downPct / 100 + 0.03)));
  const [minReserve, setMinReserve] = useState(5000);

  useEffect(() => { savePrefChecks(property.id, prefChecks); }, [prefChecks, property.id]);
  useEffect(() => { setPrefChecks(loadPrefChecks(property.id)); }, [property.id]);

  const result = useMemo(() => {
    const inp: DecisionInputs = {
      property, preferences: prefs, prefChecks,
      walk: loadWalk(property.id),
      nbhd: loadNbhd(property.id),
      maxMonthlyPayment: maxMonthly,
      minReserveAfterClose: minReserve,
      currentSavings: savings,
      cashToClose,
      downPct: searchProfile.downPct,
      ratePct: searchProfile.ratePct,
      termYears: searchProfile.termYears,
    };
    return computeDecision(inp);
  }, [property, prefs, prefChecks, maxMonthly, savings, cashToClose, minReserve, searchProfile]);

  useEffect(() => { saveDecision(property.id, { status: result.status }); }, [result.status, property.id]);

  const setPref = (id: string, val: boolean | undefined) =>
    setPrefChecks(prev => {
      const next = { ...prev };
      if (val === undefined) delete next[id]; else next[id] = val;
      return next;
    });

  const meta = STATUS_META[result.status];

  return (
    <div className="space-y-4">
      <Card className={`border-2 ${meta.tone}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">{property.address}</CardTitle>
              <p className="text-xs text-muted-foreground">${property.price.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl font-bold">{result.score}</div>
              <div className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded inline-block ${meta.tone}`}>{meta.label}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {result.dealBreaker && (
            <div className="rounded border-2 border-red-500/50 bg-red-500/10 p-2 flex items-center gap-2 text-red-300">
              <ShieldAlert className="h-4 w-4" /> Deal-Breaker Alert — {result.mustMissing} Must-Have(s) missing
            </div>
          )}
          {result.reasons.length > 0 && (
            <ul className="text-xs list-disc list-inside text-muted-foreground space-y-0.5">
              {result.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Must-Haves met" value={`${result.mustMet}`} tone="emerald" icon={CheckCircle2} />
        <Metric label="Must-Haves missing" value={`${result.mustMissing}`} tone="red" icon={XCircle} />
        <Metric label="Unknowns" value={`${result.unknownItems.length}`} tone="amber" icon={HelpCircle} />
        <Metric label="Critical risks" value={`${result.criticalRisks.length}`} tone="red" icon={ShieldAlert} />
        <Metric label="High risks" value={`${result.highRisks.length}`} tone="amber" icon={AlertTriangle} />
        <Metric label="Immediate repairs" value={fmt$(result.immediateRepair)} tone="amber" />
        <Metric label="Effective price" value={fmt$(result.effectivePrice)} tone="teal" />
        <Metric label="All-in monthly" value={fmt$(result.allInMonthly)} tone={result.overBudget ? 'red' : 'emerald'} />
      </div>

      {/* Financial inputs */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Financial context</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label className="text-xs">Max monthly payment</Label><Input type="number" value={maxMonthly} onChange={(e) => setMaxMonthly(+e.target.value)} /></div>
          <div><Label className="text-xs">Current savings</Label><Input type="number" value={savings} onChange={(e) => setSavings(+e.target.value)} /></div>
          <div><Label className="text-xs">Cash to close (est.)</Label><Input type="number" value={cashToClose} onChange={(e) => setCashToClose(+e.target.value)} /></div>
          <div><Label className="text-xs">Min reserve after close</Label><Input type="number" value={minReserve} onChange={(e) => setMinReserve(+e.target.value)} /></div>
          <div className="col-span-full text-xs text-muted-foreground">
            Reserve after close: <span className={result.reserveBreach ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{fmt$(result.reserveAfterClose)}</span>
            {result.reserveBreach && <span className="ml-2 text-red-400">— below your minimum</span>}
          </div>
        </CardContent>
      </Card>

      {/* Preference confirmations for this property */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Confirm preferences for this property</CardTitle>
          <p className="text-xs text-muted-foreground">Mark each preference as present, missing, or leave blank if unknown.</p>
        </CardHeader>
        <CardContent className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {prefs.filter(p => p.checked).map(p => {
            const val = prefChecks[p.id];
            return (
              <div key={p.id} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/30">
                <div className="min-w-0">
                  <span className="font-medium">{p.name}</span>
                  <span className={`ml-2 text-[10px] uppercase ${p.tier === 'must' ? 'text-red-400' : p.tier === 'like' ? 'text-amber-400' : 'text-emerald-400'}`}>{p.tier}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant={val === true ? 'default' : 'outline'} className="h-6 px-2 text-[10px]" onClick={() => setPref(p.id, val === true ? undefined : true)}>Present</Button>
                  <Button size="sm" variant={val === false ? 'destructive' : 'outline'} className="h-6 px-2 text-[10px]" onClick={() => setPref(p.id, val === false ? undefined : false)}>Missing</Button>
                </div>
              </div>
            );
          })}
          {prefs.filter(p => p.checked).length === 0 && (
            <p className="text-xs text-muted-foreground italic py-4 text-center">Check preferences in the Must-Haves tab to score this property.</p>
          )}
        </CardContent>
      </Card>

      {/* Risks & follow-ups */}
      {(result.criticalRisks.length + result.highRisks.length + result.unknownItems.length) > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Findings</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <FindingList title="Critical risks" items={result.criticalRisks} tone="text-red-400" />
            <FindingList title="High risks" items={result.highRisks} tone="text-orange-400" />
            <FindingList title="Unknown (needs verification)" items={result.unknownItems} tone="text-amber-400" />
          </CardContent>
        </Card>
      )}

      {/* Inspector Q's */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Questions for the Home Inspector</CardTitle>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => window.print()}><Printer className="h-3 w-3"/>Print</Button>
        </CardHeader>
        <CardContent>
          <ul className="text-xs list-decimal list-inside space-y-0.5 text-muted-foreground">
            {INSPECTOR_QUESTIONS.map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, tone, icon: Icon }: { label: string; value: string; tone: 'red'|'amber'|'emerald'|'teal'; icon?: any }) {
  const toneCls = {
    red: 'border-red-500/40 bg-red-500/5 text-red-300',
    amber: 'border-amber-500/40 bg-amber-500/5 text-amber-300',
    emerald: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-300',
    teal: 'border-prism-teal/40 bg-prism-teal/5 text-prism-teal',
  }[tone];
  return (
    <div className={`rounded border-2 p-2 ${toneCls}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-80 flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </div>
      <div className="font-display text-lg font-bold mt-0.5">{value}</div>
    </div>
  );
}

function FindingList({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div>
      <div className={`text-xs font-bold mb-1 ${tone}`}>{title} ({items.length})</div>
      {items.length === 0 ? (
        <p className="text-muted-foreground italic">None</p>
      ) : (
        <ul className="list-disc list-inside space-y-0.5 text-muted-foreground max-h-40 overflow-y-auto">
          {items.map((i, k) => <li key={k}>{i}</li>)}
        </ul>
      )}
    </div>
  );
}

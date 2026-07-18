import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, HelpCircle, AlertTriangle, ShieldAlert, Search } from 'lucide-react';
import { fmt$ } from '@/lib/home-buying/mortgage-math';
import { computeDecision, STATUS_META, type DecisionInputs } from '@/lib/home-buying/decision/decision-engine';
import { loadPreferences } from '@/lib/home-buying/decision/preferences';
import { loadWalk, loadNbhd, loadPrefChecks, type PropertyProfile } from '@/lib/home-buying/decision/walkthrough-store';
import { loadProfile } from '@/lib/home-buying/search-profile';

export default function DecisionComparison({ properties }: { properties: PropertyProfile[] }) {
  const searchProfile = loadProfile();
  const prefs = loadPreferences();

  const rows = useMemo(() => properties.map(p => {
    const inp: DecisionInputs = {
      property: p, preferences: prefs, prefChecks: loadPrefChecks(p.id),
      walk: loadWalk(p.id), nbhd: loadNbhd(p.id),
      maxMonthlyPayment: searchProfile.maxMonthlyPayment,
      minReserveAfterClose: 5000, currentSavings: 30000,
      cashToClose: Math.round(p.price * (searchProfile.downPct / 100 + 0.03)),
      downPct: searchProfile.downPct, ratePct: searchProfile.ratePct, termYears: searchProfile.termYears,
    };
    return { property: p, result: computeDecision(inp) };
  }), [properties, prefs, searchProfile]);

  if (properties.length === 0) {
    return (
      <Card><CardContent className="p-8 text-center space-y-3">
        <Search className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm">Add at least one property in the Property picker to compare.</p>
      </CardContent></Card>
    );
  }

  const factors: Array<{ label: string; get: (r: typeof rows[number]) => React.ReactNode }> = [
    { label: 'Purchase price', get: r => fmt$(r.property.price) },
    { label: 'All-in monthly', get: r => <span className={r.result.overBudget ? 'text-red-400 font-bold' : 'text-emerald-400'}>{fmt$(r.result.allInMonthly)}</span> },
    { label: 'Bedrooms', get: r => r.property.bedrooms ?? '—' },
    { label: 'Bathrooms', get: r => r.property.bathrooms ?? '—' },
    { label: 'Garage', get: r => r.property.garage ?? '—' },
    { label: 'Must-Haves met', get: r => <span className="text-emerald-400"><CheckCircle2 className="inline h-3 w-3" /> {r.result.mustMet}</span> },
    { label: 'Must-Haves missing', get: r => r.result.mustMissing > 0 ? <span className="text-red-400"><XCircle className="inline h-3 w-3" /> {r.result.mustMissing}</span> : '0' },
    { label: 'Like-to-Haves found', get: r => r.result.likeMet },
    { label: 'Wish List matches', get: r => r.result.wishMet },
    { label: 'Critical risks', get: r => r.result.criticalRisks.length > 0 ? <span className="text-red-400"><ShieldAlert className="inline h-3 w-3" /> {r.result.criticalRisks.length}</span> : '0' },
    { label: 'High risks', get: r => r.result.highRisks.length > 0 ? <span className="text-orange-400"><AlertTriangle className="inline h-3 w-3" /> {r.result.highRisks.length}</span> : '0' },
    { label: 'Unknowns', get: r => r.result.unknownItems.length > 0 ? <span className="text-amber-400"><HelpCircle className="inline h-3 w-3" /> {r.result.unknownItems.length}</span> : '0' },
    { label: 'Immediate repairs', get: r => fmt$(r.result.immediateRepair) },
    { label: 'Effective price', get: r => fmt$(r.result.effectivePrice) },
    { label: 'Reserve after close', get: r => <span className={r.result.reserveBreach ? 'text-red-400' : 'text-emerald-400'}>{fmt$(r.result.reserveAfterClose)}</span> },
  ];

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Property Comparison ({properties.length})</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-border/40">
              <th className="text-left p-2 w-40 font-normal text-muted-foreground">Factor</th>
              {rows.map(r => (
                <th key={r.property.id} className="text-left p-2 min-w-[160px]">
                  <div className="font-medium line-clamp-2">{r.property.address}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {factors.map(f => (
              <tr key={f.label} className="border-b border-border/20">
                <td className="p-2 text-muted-foreground">{f.label}</td>
                {rows.map(r => <td key={r.property.id} className="p-2 font-mono">{f.get(r)}</td>)}
              </tr>
            ))}
            <tr className="bg-prism-teal/5 border-b border-border/20">
              <td className="p-2 font-bold">Recommendation</td>
              {rows.map(r => {
                const m = STATUS_META[r.result.status];
                return <td key={r.property.id} className="p-2"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${m.tone}`}>{m.label}</span></td>;
              })}
            </tr>
            <tr className="bg-prism-amber/5">
              <td className="p-2 font-bold">Total score</td>
              {rows.map(r => <td key={r.property.id} className="p-2 font-display text-lg font-bold prism-gradient-text">{r.result.score}</td>)}
            </tr>
          </tbody>
        </table>

        {/* Mobile cards */}
        <div className="md:hidden mt-4 grid gap-2">
          {rows.map(r => {
            const m = STATUS_META[r.result.status];
            return (
              <div key={r.property.id} className={`rounded border-2 p-2 ${m.tone}`}>
                <div className="font-medium">{r.property.address}</div>
                <div className="text-xs mt-1">Score: <span className="font-bold">{r.result.score}</span> · {m.label}</div>
                <div className="text-xs">Monthly: {fmt$(r.result.allInMonthly)} · Repairs: {fmt$(r.result.immediateRepair)}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

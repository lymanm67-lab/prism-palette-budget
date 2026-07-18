import { useState } from 'react';
import { Gauge, Info, Car, Home, CreditCard as CardIcon, Building2, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const STORAGE_KEY = 'prism.multiModelScores.v1';

// Bureau order matches the rest of the app
const BUREAUS = ['Equifax', 'Experian', 'TransUnion'] as const;
type Bureau = typeof BUREAUS[number];

// Models most consumers see, grouped by family. Only bureaus that publish that
// model are shown as an input column (e.g. FICO 2 = Experian only).
type Model = {
  key: string;
  label: string;
  family: 'FICO' | 'VantageScore';
  bureaus: Bureau[];
  note: string;
};

const MODELS: Model[] = [
  { key: 'fico8', label: 'FICO® Score 8', family: 'FICO', bureaus: [...BUREAUS], note: 'Most widely used general-purpose score (credit cards, personal loans).' },
  { key: 'fico9', label: 'FICO® Score 9', family: 'FICO', bureaus: [...BUREAUS], note: 'Treats paid collections & medical debt more leniently. Growing adoption.' },
  { key: 'fico10', label: 'FICO® Score 10 / 10T', family: 'FICO', bureaus: [...BUREAUS], note: 'Newer model. 10T uses "trended data" (24-mo balance history).' },
  { key: 'ficoAuto8', label: 'FICO® Auto Score 8', family: 'FICO', bureaus: [...BUREAUS], note: 'Weighted for auto-loan risk. Range 250–900.' },
  { key: 'ficoBankcard8', label: 'FICO® Bankcard Score 8', family: 'FICO', bureaus: [...BUREAUS], note: 'Weighted for credit-card risk. Range 250–900.' },
  { key: 'ficoMortgage', label: 'Mortgage FICO (2/4/5)', family: 'FICO', bureaus: [...BUREAUS], note: 'FICO 2 (Experian), FICO 5 (Equifax), FICO 4 (TransUnion). Required by Fannie/Freddie today.' },
  { key: 'vs3', label: 'VantageScore® 3.0', family: 'VantageScore', bureaus: [...BUREAUS], note: 'Shown by most free apps (Credit Karma, Credit Sesame, bank dashboards).' },
  { key: 'vs4', label: 'VantageScore® 4.0', family: 'VantageScore', bureaus: [...BUREAUS], note: 'Newer model. Fannie/Freddie will accept alongside FICO 10T by 2025+.' },
];

type Scores = Record<string, Partial<Record<Bureau, number>>>;

const load = (): Scores => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
};

const INDUSTRY_USAGE = [
  { icon: Home, label: 'Mortgage', model: 'Mortgage FICO 2 / 4 / 5', bureaus: 'All 3 (middle score used)', note: 'Fannie Mae & Freddie Mac still require the "classic" FICO models. Lenders pull a tri-merge and use the middle score of primary borrower.' },
  { icon: Car, label: 'Auto Loan', model: 'FICO Auto Score 8 / 9', bureaus: 'Usually Equifax or Experian', note: 'Dealers pull an auto-enhanced score (range 250–900). Payment history on prior auto loans is weighted more heavily.' },
  { icon: CardIcon, label: 'Credit Card', model: 'FICO Bankcard 8 or FICO 8', bureaus: 'Varies by issuer', note: 'Amex & Chase often pull Experian; Capital One typically pulls all 3; Citi often TransUnion. Bankcard model weights card-utilization more heavily.' },
  { icon: Landmark, label: 'Personal Loan', model: 'FICO 8 or VantageScore 3.0', bureaus: 'Varies', note: 'Online lenders (SoFi, LendingClub, Upstart) frequently use VantageScore 3.0 or FICO 8. Some also use alternative data.' },
  { icon: Building2, label: 'Apartment / Rental', model: 'VantageScore 3.0 or FICO 9', bureaus: 'Usually Experian or TransUnion', note: 'Landlords pull through screening services (RentGrow, TransUnion SmartMove). FICO 9 counts on-time rent when reported.' },
  { icon: Gauge, label: 'Insurance (Auto/Home)', model: 'Insurance Score (LexisNexis)', bureaus: 'Not a FICO/VantageScore', note: 'A separate credit-based insurance score is used in most states. Freezing LexisNexis blocks it.' },
];

export default function MultiModelScores() {
  const [scores, setScoresState] = useState<Scores>(load);
  const [asOf, setAsOf] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY + '.asOf') || ''; } catch { return ''; }
  });
  const [editing, setEditing] = useState(false);

  const setScores = (s: Scores) => {
    setScoresState(s);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  };
  const saveAsOf = (d: string) => {
    setAsOf(d);
    localStorage.setItem(STORAGE_KEY + '.asOf', d);
  };

  const updateScore = (model: string, bureau: Bureau, value: string) => {
    const v = parseInt(value);
    const next = { ...scores, [model]: { ...(scores[model] || {}) } };
    if (isNaN(v)) delete next[model][bureau];
    else next[model][bureau] = v;
    setScores(next);
  };

  const hasAny = Object.values(scores).some(m => Object.values(m || {}).some(v => typeof v === 'number'));

  const bandFor = (score: number) => {
    if (score >= 800) return { label: 'Exceptional', color: 'text-accent' };
    if (score >= 740) return { label: 'Very Good', color: 'text-accent' };
    if (score >= 670) return { label: 'Good', color: 'text-primary' };
    if (score >= 580) return { label: 'Fair', color: 'text-yellow-500' };
    return { label: 'Poor', color: 'text-destructive' };
  };

  return (
    <div className="space-y-4">
      {/* Multi-model score matrix */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" />
                Your Credit Scores — All Models
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Your score is <strong>not one number</strong>. Every lender pulls a different model + bureau. Track them all in one place.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {asOf && <Badge variant="outline" className="text-[10px]">As of {asOf}</Badge>}
              <Button size="sm" variant={editing ? 'default' : 'outline'} className="text-xs" onClick={() => setEditing(!editing)}>
                {editing ? 'Done' : hasAny ? 'Update scores' : 'Enter my scores'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {editing && (
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <label className="text-xs text-muted-foreground">Scores as of:</label>
              <input
                type="date"
                value={asOf}
                onChange={(e) => saveAsOf(e.target.value)}
                className="h-7 px-2 rounded-md border bg-background text-xs"
              />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 text-left text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Model</th>
                  {BUREAUS.map(b => (
                    <th key={b} className="py-2 px-2 font-medium text-center w-24">{b}</th>
                  ))}
                  <th className="py-2 pl-2 font-medium text-center w-20">Avg</th>
                </tr>
              </thead>
              <tbody>
                {MODELS.map(m => {
                  const row = scores[m.key] || {};
                  const vals = BUREAUS.map(b => row[b]).filter((v): v is number => typeof v === 'number');
                  const avg = vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
                  const band = avg ? bandFor(avg) : null;
                  return (
                    <tr key={m.key} className="border-b border-border/30 last:border-0 hover:bg-muted/30">
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{m.label}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0">{m.family}</Badge>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                              <TooltipContent className="max-w-xs text-xs">{m.note}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                      {BUREAUS.map(b => (
                        <td key={b} className="py-1 px-2 text-center">
                          {editing ? (
                            <input
                              type="number" min={300} max={900}
                              defaultValue={row[b] ?? ''}
                              placeholder="—"
                              className="w-full h-7 px-1 rounded border bg-background text-center text-xs"
                              onChange={(e) => updateScore(m.key, b, e.target.value)}
                            />
                          ) : (
                            <span className={row[b] ? 'font-mono font-semibold' : 'text-muted-foreground'}>
                              {row[b] ?? '—'}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="py-2 pl-2 text-center">
                        {avg ? (
                          <span className={`font-mono font-semibold ${band!.color}`}>{avg}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-md p-2 flex gap-2">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
            <p>
              <strong>Why the numbers differ:</strong> each bureau sees different accounts, and each model weighs factors differently.
              A 30–80 point spread across models is normal. Ranges: FICO/VantageScore 300–850; FICO Auto & Bankcard 250–900.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Industry usage reference */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Which Score Does Each Industry Use?
          </CardTitle>
          <p className="text-xs text-muted-foreground">Know which model matters before you apply — pulling the wrong score wastes time.</p>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {INDUSTRY_USAGE.map(row => {
            const Icon = row.icon;
            return (
              <div key={row.label} className="flex items-start gap-3 p-3 rounded-lg border bg-background/50">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{row.label}</span>
                    <Badge variant="secondary" className="text-[10px]">{row.model}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground"><strong>Bureau:</strong> {row.bureaus}</p>
                  <p className="text-[11px] text-muted-foreground">{row.note}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

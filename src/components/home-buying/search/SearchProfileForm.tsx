import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings2, RotateCcw } from 'lucide-react';
import { STYLE_OPTIONS, type HomeSearchProfile } from '@/lib/home-buying/search-profile';

interface Props {
  profile: HomeSearchProfile;
  update: <K extends keyof HomeSearchProfile>(key: K, value: HomeSearchProfile[K]) => void;
  reset: () => void;
}

export default function SearchProfileForm({ profile, update, reset }: Props) {
  const toggleStyle = (s: string) => {
    const next = profile.preferredStyles.includes(s)
      ? profile.preferredStyles.filter((x) => x !== s)
      : [...profile.preferredStyles, s];
    update('preferredStyles', next);
  };

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 font-display">
          <Settings2 className="h-5 w-5 text-prism-teal" />
          Search Profile & Personal Rules
        </CardTitle>
        <Button size="sm" variant="ghost" onClick={reset} className="gap-1.5 h-8">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Search Mode</Label>
            <Select value={profile.metroMode} onValueChange={(v) => update('metroMode', v as 'akron' | 'generic')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="akron">Akron, OH (curated tiers)</SelectItem>
                <SelectItem value="generic">Generic (any metro)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {profile.metroMode === 'generic' && (
            <div>
              <Label className="text-xs">Metro / City</Label>
              <Input value={profile.genericMetro} onChange={(e) => update('genericMetro', e.target.value)} placeholder="Austin, TX" />
            </div>
          )}
          <div>
            <Label className="text-xs">Purchase Timeline</Label>
            <Input value={profile.purchaseTimeline} onChange={(e) => update('purchaseTimeline', e.target.value)} placeholder="July 2027" />
          </div>
          <div>
            <Label className="text-xs">Max Purchase Price</Label>
            <Input type="number" value={profile.maxPrice} onChange={(e) => update('maxPrice', +e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Max Monthly Payment</Label>
            <Input type="number" value={profile.maxMonthlyPayment} onChange={(e) => update('maxMonthlyPayment', +e.target.value)} />
          </div>
        </div>

        <div>
          <Label className="text-xs mb-2 block">Preferred Home Styles (pick any)</Label>
          <div className="flex flex-wrap gap-1.5">
            {STYLE_OPTIONS.map((s) => {
              const active = profile.preferredStyles.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStyle(s)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    active
                      ? 'bg-prism-teal/20 border-prism-teal/50 text-prism-teal'
                      : 'bg-card/40 border-border/40 text-muted-foreground hover:border-border'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label className="text-xs">Min Beds</Label><Input type="number" value={profile.minBeds} onChange={(e) => update('minBeds', +e.target.value)} /></div>
          <div><Label className="text-xs">Min Baths</Label><Input type="number" value={profile.minBaths} onChange={(e) => update('minBaths', +e.target.value)} /></div>
          <div><Label className="text-xs">Min Sqft</Label><Input type="number" value={profile.minSqft} onChange={(e) => update('minSqft', +e.target.value)} /></div>
          <div><Label className="text-xs">Min Lot (acres)</Label><Input type="number" step="0.05" value={profile.minLotAcres} onChange={(e) => update('minLotAcres', +e.target.value)} /></div>
          <div>
            <Label className="text-xs">Garage</Label>
            <Select value={profile.garage} onValueChange={(v) => update('garage', v as 'required' | 'preferred' | 'none')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="required">Required</SelectItem>
                <SelectItem value="preferred">Preferred</SelectItem>
                <SelectItem value="none">Not needed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Year Built Min</Label><Input type="number" value={profile.yearBuiltMin} onChange={(e) => update('yearBuiltMin', +e.target.value)} /></div>
          <div><Label className="text-xs">Year Built Max</Label><Input type="number" value={profile.yearBuiltMax} onChange={(e) => update('yearBuiltMax', +e.target.value)} /></div>
          <div>
            <Label className="text-xs">Condition</Label>
            <Select value={profile.condition} onValueChange={(v) => update('condition', v as HomeSearchProfile['condition'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="move_in">Move-In Ready only</SelectItem>
                <SelectItem value="cosmetic_ok">Cosmetic updates OK</SelectItem>
                <SelectItem value="any">Any</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Max HOA / mo</Label><Input type="number" value={profile.maxHoa} onChange={(e) => update('maxHoa', +e.target.value)} /></div>
          <div><Label className="text-xs">Max Commute (min)</Label><Input type="number" value={profile.maxCommuteMin} onChange={(e) => update('maxCommuteMin', +e.target.value)} /></div>
          <div><Label className="text-xs">Down %</Label><Input type="number" step="0.5" value={profile.downPct} onChange={(e) => update('downPct', +e.target.value)} /></div>
          <div><Label className="text-xs">Rate %</Label><Input type="number" step="0.05" value={profile.ratePct} onChange={(e) => update('ratePct', +e.target.value)} /></div>
        </div>

        <div>
          <Label className="text-xs mb-2 block">Auto-Exclude</Label>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={profile.excludeFloodRisk} onChange={(e) => update('excludeFloodRisk', e.target.checked)} />
              High Flood Risk
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={profile.excludeHighCrime} onChange={(e) => update('excludeHighCrime', e.target.checked)} />
              High Crime Areas
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={profile.excludeMajorRepairs} onChange={(e) => update('excludeMajorRepairs', e.target.checked)} />
              Major Structural Repairs
            </label>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Rules save automatically to your browser. They power the Property Scorecard, Neighborhood ranking, Smart Alerts, and Wealth Impact estimates below.
        </p>
      </CardContent>
    </Card>
  );
}

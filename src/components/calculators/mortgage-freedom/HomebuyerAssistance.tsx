import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Search, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Program {
  name: string;
  scope: 'federal' | 'state';
  state?: string;
  audience: string;
  benefit: string;
  url: string;
  eligibility: string;
}

const FEDERAL_PROGRAMS: Program[] = [
  {
    name: 'FHA Loan',
    scope: 'federal',
    audience: 'First-time or credit-challenged buyers',
    benefit: '3.5% down with 580+ FICO. Softer DTI limits.',
    url: 'https://www.hud.gov/buying/loans',
    eligibility: 'FICO 580+, DTI up to 45%, primary residence',
  },
  {
    name: 'VA Loan',
    scope: 'federal',
    audience: 'Veterans, active duty, surviving spouses',
    benefit: '0% down, no PMI, capped closing costs.',
    url: 'https://www.va.gov/housing-assistance/home-loans/',
    eligibility: 'COE required, sufficient residual income',
  },
  {
    name: 'USDA Rural Housing',
    scope: 'federal',
    audience: 'Buyers in eligible rural / suburban areas',
    benefit: '0% down, subsidized rates for low-mod income.',
    url: 'https://www.rd.usda.gov/programs-services/single-family-housing-programs',
    eligibility: 'Income ≤ 115% area median, USDA-eligible zone',
  },
  {
    name: 'HomeReady (Fannie Mae)',
    scope: 'federal',
    audience: 'Low-mod income buyers',
    benefit: '3% down, reduced PMI, income boarder-friendly.',
    url: 'https://singlefamily.fanniemae.com/originating-underwriting/mortgage-products/homeready-mortgage',
    eligibility: 'Income ≤ 80% AMI, FICO 620+',
  },
  {
    name: 'Home Possible (Freddie Mac)',
    scope: 'federal',
    audience: 'Low-mod income buyers',
    benefit: '3% down, flexible sources for down payment.',
    url: 'https://sf.freddiemac.com/working-with-us/origination-underwriting/mortgage-products/home-possible',
    eligibility: 'Income ≤ 80% AMI, FICO 660+',
  },
  {
    name: 'Good Neighbor Next Door',
    scope: 'federal',
    audience: 'Teachers, cops, firefighters, EMTs',
    benefit: '50% off HUD-owned home price in revitalization areas.',
    url: 'https://www.hud.gov/program_offices/housing/sfh/reo/goodn/gnndabot',
    eligibility: '3-year owner-occupancy commitment',
  },
  {
    name: 'Section 184 (Native American)',
    scope: 'federal',
    audience: 'Tribal members and enrolled Native Americans',
    benefit: '2.25% down, low fees, flexible underwriting.',
    url: 'https://www.hud.gov/section184',
    eligibility: 'Enrolled tribal member, primary residence',
  },
];

// A tiny curated set — this list should not pretend to be exhaustive.
const STATE_DPA: Program[] = [
  { name: 'CalHFA MyHome Assistance', scope: 'state', state: 'CA', audience: 'CA first-time buyers', benefit: 'Deferred 2nd for down/closing up to 3.5%.', url: 'https://www.calhfa.ca.gov/homebuyer/programs/myhome.htm', eligibility: 'Income limits, homebuyer education' },
  { name: 'TSAHC Home Sweet Texas', scope: 'state', state: 'TX', audience: 'TX buyers', benefit: 'Down payment grant up to 5% of loan.', url: 'https://www.tsahc.org/homebuyers-renters/home-sweet-texas-home-loan-program', eligibility: 'Income & purchase-price limits' },
  { name: 'SONYMA Achieving the Dream', scope: 'state', state: 'NY', audience: 'NY buyers', benefit: 'Below-market rate + down payment aid.', url: 'https://hcr.ny.gov/achieving-the-dream', eligibility: 'FTHB, income limits by county' },
  { name: 'Florida Assist', scope: 'state', state: 'FL', audience: 'FL first-time buyers', benefit: '0% deferred loan up to $10K for down/closing.', url: 'https://www.floridahousing.org/programs/homebuyer-overview-page', eligibility: 'FTHB, income & purchase-price limits' },
  { name: 'Illinois Access Mortgage', scope: 'state', state: 'IL', audience: 'IL buyers', benefit: 'Up to $10K down payment assistance.', url: 'https://www.ihda.org/homebuyers/', eligibility: 'IHDA income limits' },
  { name: 'PHFA Keystone Advantage', scope: 'state', state: 'PA', audience: 'PA buyers', benefit: '$6K second mortgage at 0%.', url: 'https://www.phfa.org/', eligibility: 'FTHB in most counties' },
];

const ALL = [...FEDERAL_PROGRAMS, ...STATE_DPA];

export default function HomebuyerAssistance() {
  const [state, setState] = useState('');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const st = state.trim().toUpperCase();
    return ALL.filter(p => {
      if (p.scope === 'state' && st && p.state !== st) return false;
      if (q && !`${p.name} ${p.audience} ${p.benefit}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, state]);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-primary" /> Homebuyer Assistance
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Federal loan programs + curated state down payment assistance. Not exhaustive — always confirm current eligibility on the program site.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-2">
          <div className="md:col-span-2 space-y-1">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Veteran, low income, teacher, rural..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8 h-9" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">State (for DPA)</Label>
            <Input placeholder="e.g. CA, TX, NY" maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase())} className="h-9 uppercase" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map(p => (
            <div key={p.name} className={cn(
              'rounded-xl border p-3 space-y-1.5',
              p.scope === 'federal' ? 'border-primary/30 bg-primary/5' : 'border-emerald-500/30 bg-emerald-500/5'
            )}>
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-sm">{p.name}</div>
                <Badge variant={p.scope === 'federal' ? 'default' : 'secondary'} className="text-[10px]">
                  {p.scope === 'federal' ? 'Federal' : p.state}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">{p.audience}</div>
              <div className="text-xs"><span className="text-muted-foreground">Benefit:</span> {p.benefit}</div>
              <div className="text-[11px] text-muted-foreground italic">Eligibility: {p.eligibility}</div>
              <Button asChild size="sm" variant="ghost" className="h-7 px-2 -ml-2 gap-1 text-xs">
                <a href={p.url} target="_blank" rel="noopener noreferrer">
                  Learn more <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="md:col-span-2 rounded-lg border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
              No programs match. Clear filters or check your state housing finance agency directly.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

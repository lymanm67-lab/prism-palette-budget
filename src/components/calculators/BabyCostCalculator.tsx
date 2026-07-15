import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Baby, Settings2, PiggyBank, Receipt } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import AnimatedNumber from '@/components/AnimatedNumber';
import CalculatorActions from '@/components/CalculatorActions';
import CalculatorGuide from '@/components/CalculatorGuide';
import CalculatorScenariosAndPitfalls from '@/components/CalculatorScenariosAndPitfalls';
import CollapsibleSection from '@/components/CollapsibleSection';
import { STATE_DATA } from '@/lib/state-data';

// 2026-refreshed monthly costs (BLS / Care.com / USDA baselines)
const CHILDCARE_OPTIONS = [
  { id: 'none', label: 'Stay-at-Home Parent', monthly: 0 },
  { id: 'family', label: 'Family / Informal', monthly: 500 },
  { id: 'home', label: 'Home Daycare', monthly: 1100 },
  { id: 'center', label: 'Daycare Center', monthly: 1700 },
  { id: 'nanny', label: 'Nanny / Au Pair', monthly: 3200 },
  { id: 'nannyshare', label: 'Nanny Share', monthly: 1800 },
];

const COST_CATEGORIES = [
  { label: 'Diapers & Wipes', monthly: 95 },
  { label: 'Formula / Food', monthly: 180 },
  { label: 'Clothing', monthly: 70 },
  { label: 'Health / Insurance Add-on', monthly: 260 },
  { label: 'Gear & Nursery (amortized)', monthly: 120 },
  { label: 'Miscellaneous', monthly: 90 },
];

// One-time first-year costs (2026 refreshed)
const ONE_TIME_BASE = 4200; // crib, car seat, stroller, monitor, initial gear
const BIRTH_COST_INSURED = 3000; // avg out-of-pocket with insurance (deductible + coinsurance)
const BIRTH_COST_UNINSURED = 15000; // avg uninsured vaginal delivery

export default function BabyCostCalculator() {
  const { formatCurrency } = useCurrency();
  const [childcare, setChildcare] = useState('center');
  const [state, setState] = useState('');
  const [monthsUntilBirth, setMonthsUntilBirth] = useState('6');

  // Tax / assistance
  const [taxBracket, setTaxBracket] = useState('22');
  const [fsaContribution, setFsaContribution] = useState('5000'); // Dependent Care FSA max = $5,000
  const [claimCDCTC, setClaimCDCTC] = useState(true);
  const [insured, setInsured] = useState(true);
  const [hasCTC, setHasCTC] = useState(true);

  const result = useMemo(() => {
    const cc = CHILDCARE_OPTIONS.find(c => c.id === childcare)!;
    const stateData = STATE_DATA[state];
    const costFactor = stateData ? (1 + (stateData.stateTax / 100) * 0.3) : 1;

    const baseCosts = COST_CATEGORIES.map(c => ({ ...c, adjusted: Math.round(c.monthly * costFactor) }));
    const monthlyBasics = baseCosts.reduce((s, c) => s + c.adjusted, 0);
    const monthlyChildcare = Math.round(cc.monthly * costFactor);
    const totalMonthly = monthlyBasics + monthlyChildcare;
    const yearOneOngoing = totalMonthly * 12;
    const oneTimeGear = Math.round(ONE_TIME_BASE * costFactor);
    const birthCost = insured ? BIRTH_COST_INSURED : BIRTH_COST_UNINSURED;
    const grossFirstYear = yearOneOngoing + oneTimeGear + birthCost;

    // ─── Tax savings ────────────────────────────────
    const bracket = (parseFloat(taxBracket) || 0) / 100;
    // Dependent Care FSA: pre-tax up to $5,000 for childcare expenses.
    // Savings = min(FSA, actual childcare cost) × marginal tax rate (+ ~7.65% FICA)
    const fsaTarget = Math.min(parseFloat(fsaContribution) || 0, 5000);
    const annualChildcare = monthlyChildcare * 12;
    const fsaUsed = Math.min(fsaTarget, annualChildcare);
    const fsaSavings = fsaUsed * (bracket + 0.0765);

    // Child & Dependent Care Tax Credit: up to $3,000 childcare / 1 child × 20–35% credit.
    // Applies to childcare NOT covered by FSA. Assume 20% (income > $43k) as conservative default.
    let cdctcSavings = 0;
    if (claimCDCTC) {
      const remaining = Math.max(0, annualChildcare - fsaUsed);
      const eligible = Math.min(remaining, 3000);
      cdctcSavings = eligible * 0.20;
    }

    // Child Tax Credit: $2,000/child federal (2026 baseline). Fully refundable up to $1,700.
    const ctcSavings = hasCTC ? 2000 : 0;

    const totalTaxSavings = fsaSavings + cdctcSavings + ctcSavings;
    const netFirstYear = Math.max(0, grossFirstYear - totalTaxSavings);

    const months = parseInt(monthsUntilBirth) || 1;
    const monthlySavings = netFirstYear / months;

    return {
      baseCosts, monthlyChildcare, monthlyBasics, totalMonthly,
      yearOneOngoing, oneTimeGear, birthCost, grossFirstYear,
      fsaSavings, cdctcSavings, ctcSavings, totalTaxSavings, netFirstYear,
      monthlySavings, months,
    };
  }, [childcare, state, monthsUntilBirth, taxBracket, fsaContribution, claimCDCTC, insured, hasCTC]);

  return (
    <div className="space-y-6">
      <CalculatorGuide
        title="Baby Cost Estimator"
        icon={Baby}
        iconColor="text-prism-sky"
        ttsScript="Estimate first-year baby costs including tax credits and FSA savings."
        instructions={[
          'Pick childcare plan and state — costs adjust automatically',
          'Enter your tax bracket to model Dependent Care FSA + CDCTC savings',
          'See both gross cost and net-of-tax-savings first-year total',
        ]}
      />

      {/* ─── Basic inputs ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label>State</Label>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>{Object.entries(STATE_DATA).filter(([k]) => k).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Childcare Plan</Label>
          <Select value={childcare} onValueChange={setChildcare}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CHILDCARE_OPTIONS.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Months Until Birth</Label>
          <Input type="number" min="1" value={monthsUntilBirth} onChange={e => setMonthsUntilBirth(e.target.value)} />
        </div>
      </div>

      {/* ─── Tax savings & assistance ─── */}
      <CollapsibleSection
        title="Tax savings & assistance"
        subtitle={`Dependent Care FSA + CDCTC + CTC — could save ${formatCurrency(result.totalTaxSavings)}`}
        icon={Receipt}
        accent
        defaultOpen
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Marginal tax bracket (%)</Label>
            <Input type="number" min="0" max="50" step="1" value={taxBracket} onChange={e => setTaxBracket(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Dependent Care FSA ($/yr, max $5k)</Label>
            <Input type="number" min="0" max="5000" step="100" value={fsaContribution} onChange={e => setFsaContribution(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Insurance coverage</Label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setInsured(true)}
                className={cn('flex-1 h-10 rounded-md border text-sm font-medium', insured ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 hover:bg-muted/40')}>Insured</button>
              <button type="button" onClick={() => setInsured(false)}
                className={cn('flex-1 h-10 rounded-md border text-sm font-medium', !insured ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 hover:bg-muted/40')}>Uninsured</button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm rounded-lg border border-border/40 bg-muted/20 px-3 py-2 cursor-pointer">
            <input type="checkbox" checked={claimCDCTC} onChange={e => setClaimCDCTC(e.target.checked)} />
            Claim CDCTC (Child & Dependent Care Credit)
          </label>
          <label className="flex items-center gap-2 text-sm rounded-lg border border-border/40 bg-muted/20 px-3 py-2 cursor-pointer">
            <input type="checkbox" checked={hasCTC} onChange={e => setHasCTC(e.target.checked)} />
            Claim Child Tax Credit ($2,000)
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 mt-3">
          <SavingsBox label="Dependent Care FSA" value={result.fsaSavings} note="Pre-tax childcare, incl. FICA" formatCurrency={formatCurrency} />
          <SavingsBox label="CDCTC" value={result.cdctcSavings} note="20% × childcare above FSA (max $3k eligible)" formatCurrency={formatCurrency} />
          <SavingsBox label="Child Tax Credit" value={result.ctcSavings} note="Federal $2,000/child" formatCurrency={formatCurrency} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 italic">
          FSA saves federal + state + FICA (7.65%). CDCTC and FSA can't cover the same dollars — this model applies FSA first, then CDCTC to remaining childcare. Consult a tax pro for your situation.
        </p>
      </CollapsibleSection>

      {/* ─── Result ─── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: 'Monthly Total', val: result.totalMonthly, accent: true },
            { label: 'Gross Year One', val: result.grossFirstYear },
            { label: 'Tax Savings', val: -result.totalTaxSavings, formatFn: (v: number) => `-${formatCurrency(Math.abs(v))}` },
            { label: 'Net Year One', val: result.netFirstYear, accent: true },
          ].map((r: any) => (
            <Card key={r.label} className={cn('border', r.accent && 'border-primary/30 bg-primary/5')}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{r.label}</p>
                <p className={cn('text-lg font-bold', r.accent && 'text-primary', r.val < 0 && 'text-emerald-600')}>
                  {r.formatFn ? r.formatFn(r.val) : <AnimatedNumber value={r.val} formatFn={formatCurrency} />}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <strong>Save {formatCurrency(result.monthlySavings)}/month</strong> for {result.months} months to cover the net first-year cost of {formatCurrency(result.netFirstYear)}.
        </div>

        {/* ─── Monthly breakdown ─── */}
        <CollapsibleSection title="Monthly cost breakdown" subtitle="Category-by-category" icon={PiggyBank}>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <span className="text-sm font-semibold">Childcare</span>
              <span className="font-bold text-sm text-primary">{formatCurrency(result.monthlyChildcare)}</span>
            </div>
            {result.baseCosts.map(c => (
              <div key={c.label} className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
                <span className="text-sm">{c.label}</span>
                <span className="font-semibold text-sm">{formatCurrency(c.adjusted)}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* ─── One-time costs breakdown ─── */}
        <CollapsibleSection title="One-time costs" subtitle={`Gear + birth = ${formatCurrency(result.oneTimeGear + result.birthCost)}`} icon={Settings2}>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
              <span className="text-sm">Nursery & gear (crib, seat, stroller…)</span>
              <span className="font-semibold text-sm">{formatCurrency(result.oneTimeGear)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
              <span className="text-sm">Birth / delivery out-of-pocket</span>
              <span className="font-semibold text-sm">{formatCurrency(result.birthCost)}</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 italic">
            Insured average $3,000 (deductible + coinsurance). Uninsured vaginal delivery avg $15,000, C-section $22,000+. NICU adds $5k–$50k+.
          </p>
        </CollapsibleSection>

        {/* ─── Scenarios ─── */}
        <CollapsibleSection title="Scenarios, pitfalls & tips" icon={Baby}>
          <CalculatorScenariosAndPitfalls
            scenarios={[
              { title: 'Stay-at-Home Parent', description: 'Eliminating childcare saves $20k+/yr but you lose one salary. Do the math net of taxes + commuting — sometimes staying home wins financially.' },
              { title: 'Daycare Center', description: 'National average $1,700/mo (2026). MA, DC, CA infant care runs $2,400–$3,000/mo. Waitlists are 6–12 months — apply during pregnancy.' },
              { title: 'Nanny Share', description: 'Splitting a nanny cuts costs 40–50% while keeping 1:1 attention. A $3,200/mo nanny becomes $1,800/family.' },
            ]}
            pitfalls={[
              { title: 'Skipping the FSA Election', description: 'You can only elect the Dependent Care FSA during open enrollment or a qualifying life event (birth). Miss it and you lose ~$1,500 in tax savings.' },
              { title: 'Buying Everything New', description: 'Babies outgrow clothes in weeks. Buying used cribs (except drop-side), strollers, and clothes saves 60–80%.' },
              { title: 'Ignoring Insurance Changes', description: 'Adding a baby to your plan costs $200–500/mo. Confirm employer rates before delivery.' },
              { title: 'No Emergency Buffer', description: 'Unexpected NICU, formula switches, or losing childcare happens. Keep 3 months of baby expenses in reserve.' },
            ]}
            tips={[
              { title: 'Max the Dependent Care FSA', description: 'Elect $5,000/yr pre-tax. At a 22% bracket + 7.65% FICA, that\'s ~$1,480 in guaranteed savings.' },
              { title: 'Stack CDCTC on Top of FSA', description: 'FSA covers first $5k; CDCTC gives 20% back on the next $3k of childcare — up to $600 additional credit.' },
              { title: 'Bulk Diapers + Amazon Family', description: 'Subscribe-and-save 15% + coupons cuts diapers 30–40%. Babies go through 8–10/day.' },
              { title: 'Hand-Me-Down Aggressively', description: 'Post in local parent groups. Most parents are desperate to offload gear — save $2,000+ in year one.' },
            ]}
          />
        </CollapsibleSection>

        <CalculatorActions
          calculatorType="baby"
          inputs={{ childcare, state, monthsUntilBirth, taxBracket, fsaContribution, claimCDCTC, insured, hasCTC }}
          results={result}
          hasResults={true}
          summaryText={`Baby: gross ${formatCurrency(result.grossFirstYear)} first year, ${formatCurrency(result.totalTaxSavings)} tax savings, net ${formatCurrency(result.netFirstYear)}.`}
        />
      </motion.div>
    </div>
  );
}

function SavingsBox({ label, value, note, formatCurrency }: { label: string; value: number; note: string; formatCurrency: (n: number) => string }) {
  return (
    <div className={cn('rounded-lg border p-3', value > 0 ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border/40 bg-muted/20')}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn('text-lg font-bold', value > 0 && 'text-emerald-600 dark:text-emerald-400')}>{formatCurrency(value)}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{note}</div>
    </div>
  );
}

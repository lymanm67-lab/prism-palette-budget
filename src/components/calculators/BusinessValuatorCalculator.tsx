import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Building2, Brain, TrendingUp, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrency } from '@/hooks/use-currency';
import AnimatedNumber from '@/components/AnimatedNumber';
import CalculatorScenariosAndPitfalls from '@/components/CalculatorScenariosAndPitfalls';

const num = (v: string) => (isFinite(parseFloat(v)) ? parseFloat(v) : 0);

export default function BusinessValuatorCalculator() {
  const { formatCurrency } = useCurrency();

  // Financials
  const [revenue, setRevenue] = useState('500000');
  const [sde, setSde] = useState('120000'); // Seller's Discretionary Earnings
  const [ebitda, setEbitda] = useState('90000');
  const [growth, setGrowth] = useState('12'); // % YoY
  const [industryMultiple, setIndustryMultiple] = useState('3.0'); // EBITDA multiple
  const [ownerEstimate, setOwnerEstimate] = useState('850000'); // Owner's own valuation

  // Tangible assets
  const [equipment, setEquipment] = useState('25000');
  const [inventory, setInventory] = useState('10000');
  const [cashAr, setCashAr] = useState('40000');
  const [realEstate, setRealEstate] = useState('0');
  const [liabilities, setLiabilities] = useState('50000');

  // Intangible / IP
  const [brand, setBrand] = useState('30000');
  const [customerList, setCustomerList] = useState('20000');
  const [domainWebsite, setDomainWebsite] = useState('5000');
  const [trademarksPatents, setTrademarksPatents] = useState('15000');
  const [proprietarySoftware, setProprietarySoftware] = useState('40000');
  const [contentLibrary, setContentLibrary] = useState('10000');
  const [contractsRecurring, setContractsRecurring] = useState('60000'); // MRR × 12 style
  const [goodwill, setGoodwill] = useState('25000');

  // Discounted Cash Flow
  const [discountRate, setDiscountRate] = useState('15'); // %
  const [years, setYears] = useState('5');

  const results = useMemo(() => {
    const rev = num(revenue);
    const sdeVal = num(sde);
    const ebitdaVal = num(ebitda);
    const g = num(growth) / 100;
    const mult = num(industryMultiple);

    // 1. Asset-based (Adjusted Book Value)
    const tangible =
      num(equipment) + num(inventory) + num(cashAr) + num(realEstate);
    const intangible =
      num(brand) +
      num(customerList) +
      num(domainWebsite) +
      num(trademarksPatents) +
      num(proprietarySoftware) +
      num(contentLibrary) +
      num(contractsRecurring) +
      num(goodwill);
    const assetBased = tangible + intangible - num(liabilities);

    // 2. Market-based (SDE / EBITDA multiple)
    const sdeValue = sdeVal * 2.5; // typical small-biz SDE multiple
    const ebitdaValue = ebitdaVal * mult;
    const marketBased = (sdeValue + ebitdaValue) / 2;

    // 3. Revenue multiple sanity check
    const revenueValue = rev * 1.0; // 1× rev baseline

    // 4. DCF (simplified)
    const dr = num(discountRate) / 100;
    const n = Math.max(1, Math.min(20, Math.floor(num(years))));
    let dcf = 0;
    let cf = ebitdaVal;
    for (let t = 1; t <= n; t++) {
      cf = cf * (1 + g);
      dcf += cf / Math.pow(1 + dr, t);
    }
    // Terminal value (Gordon growth, capped)
    const terminalGrowth = Math.min(0.03, g / 2);
    const terminalCF = cf * (1 + terminalGrowth);
    const terminal =
      dr > terminalGrowth ? terminalCF / (dr - terminalGrowth) : 0;
    const dcfValue = dcf + terminal / Math.pow(1 + dr, n);

    // Weighted estimate (blend)
    const blended =
      assetBased * 0.25 +
      marketBased * 0.35 +
      revenueValue * 0.1 +
      dcfValue * 0.3;

    const low = Math.min(assetBased, marketBased, dcfValue, revenueValue);
    const high = Math.max(assetBased, marketBased, dcfValue, revenueValue);

    return {
      tangible,
      intangible,
      assetBased,
      sdeValue,
      ebitdaValue,
      marketBased,
      revenueValue,
      dcfValue,
      blended,
      low,
      high,
    };
  }, [
    revenue,
    sde,
    ebitda,
    growth,
    industryMultiple,
    equipment,
    inventory,
    cashAr,
    realEstate,
    liabilities,
    brand,
    customerList,
    domainWebsite,
    trademarksPatents,
    proprietarySoftware,
    contentLibrary,
    contractsRecurring,
    goodwill,
    discountRate,
    years,
  ]);

  const Field = ({
    label,
    value,
    onChange,
    hint,
    suffix,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    hint?: string;
    suffix?: string;
  }) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-[10px] text-muted-foreground/70">{hint}</p>}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-prism-teal/15 text-prism-teal">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Business & IP Valuator</h2>
          <p className="text-xs text-muted-foreground">
            Blend asset-based, market-multiple, and DCF methods — including
            intangible & intellectual-property assets.
          </p>
        </div>
      </div>

      {/* Headline result */}
      <Card className="glass-card border-prism-teal/30">
        <CardContent className="p-6 grid md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Estimated value (blended)</p>
            <p className="text-3xl font-bold text-prism-teal">
              <AnimatedNumber value={results.blended} formatFn={formatCurrency} />
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Reasonable range</p>
            <p className="text-lg font-semibold">
              {formatCurrency(results.low)} — {formatCurrency(results.high)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Intangible / IP assets</p>
            <p className="text-lg font-semibold text-prism-violet">
              {formatCurrency(results.intangible)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="financials">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="tangible">Tangible</TabsTrigger>
          <TabsTrigger value="intangible">IP & Intangibles</TabsTrigger>
          <TabsTrigger value="dcf">DCF</TabsTrigger>
        </TabsList>

        <TabsContent value="financials" className="mt-4">
          <Card className="glass-card">
            <CardContent className="p-5 grid md:grid-cols-2 gap-4">
              <Field label="Annual revenue" value={revenue} onChange={setRevenue} suffix="$" />
              <Field
                label="SDE (owner earnings + add-backs)"
                value={sde}
                onChange={setSde}
                suffix="$"
                hint="Net profit + owner salary + discretionary expenses"
              />
              <Field label="EBITDA" value={ebitda} onChange={setEbitda} suffix="$" />
              <Field label="YoY growth" value={growth} onChange={setGrowth} suffix="%" />
              <Field
                label="Industry EBITDA multiple"
                value={industryMultiple}
                onChange={setIndustryMultiple}
                suffix="×"
                hint="Typical: services 2–4×, SaaS 5–10×, e-com 2.5–4×"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tangible" className="mt-4">
          <Card className="glass-card">
            <CardContent className="p-5 grid md:grid-cols-2 gap-4">
              <Field label="Equipment & vehicles" value={equipment} onChange={setEquipment} suffix="$" />
              <Field label="Inventory" value={inventory} onChange={setInventory} suffix="$" />
              <Field label="Cash + A/R" value={cashAr} onChange={setCashAr} suffix="$" />
              <Field label="Real estate (owned by biz)" value={realEstate} onChange={setRealEstate} suffix="$" />
              <Field label="Total liabilities / debt" value={liabilities} onChange={setLiabilities} suffix="$" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intangible" className="mt-4">
          <Card className="glass-card border-prism-violet/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4 text-prism-violet" />
                Intellectual & Intangible Assets
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-2 grid md:grid-cols-2 gap-4">
              <Field label="Brand equity / reputation" value={brand} onChange={setBrand} suffix="$" hint="What a competitor would pay for your name" />
              <Field label="Customer list / email list" value={customerList} onChange={setCustomerList} suffix="$" hint="~$1–5 per active contact" />
              <Field label="Domains & website" value={domainWebsite} onChange={setDomainWebsite} suffix="$" />
              <Field label="Trademarks & patents" value={trademarksPatents} onChange={setTrademarksPatents} suffix="$" />
              <Field label="Proprietary software / code" value={proprietarySoftware} onChange={setProprietarySoftware} suffix="$" hint="Rebuild cost or license value" />
              <Field label="Content library (courses, books, media)" value={contentLibrary} onChange={setContentLibrary} suffix="$" />
              <Field label="Contracts & recurring revenue" value={contractsRecurring} onChange={setContractsRecurring} suffix="$" hint="MRR × 12–36 for locked-in contracts" />
              <Field label="Goodwill (reviews, SEO, community)" value={goodwill} onChange={setGoodwill} suffix="$" />
              <div className="md:col-span-2 mt-2 p-3 rounded-lg bg-prism-violet/10 border border-prism-violet/20 text-xs text-muted-foreground flex gap-2">
                <Info className="h-4 w-4 text-prism-violet shrink-0 mt-0.5" />
                <span>
                  Total intangible value: <strong className="text-prism-violet">{formatCurrency(results.intangible)}</strong>.
                  In most service and digital businesses, intangibles account for 60–80% of true enterprise value.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dcf" className="mt-4">
          <Card className="glass-card">
            <CardContent className="p-5 grid md:grid-cols-2 gap-4">
              <Field label="Discount rate (WACC)" value={discountRate} onChange={setDiscountRate} suffix="%" hint="Small biz: 15–25%. Riskier = higher." />
              <Field label="Projection years" value={years} onChange={setYears} hint="Typically 5" />
              <div className="md:col-span-2 p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground">
                Projects EBITDA at your growth rate, discounts back to today, and adds a terminal value (Gordon growth).
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Method comparison */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-prism-teal" />
            Valuation by method
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-2 space-y-3">
          {[
            { label: 'Asset-based (tangible + IP − debt)', value: results.assetBased },
            { label: 'Market multiple (SDE 2.5× & EBITDA × industry)', value: results.marketBased },
            { label: 'Revenue (1× annual)', value: results.revenueValue },
            { label: 'Discounted Cash Flow', value: results.dcfValue },
          ].map((r) => {
            const max = Math.max(results.assetBased, results.marketBased, results.revenueValue, results.dcfValue, 1);
            const pct = Math.max(4, (r.value / max) * 100);
            return (
              <div key={r.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-semibold">{formatCurrency(r.value)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-prism-teal to-prism-violet"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <CalculatorScenariosAndPitfalls
        scenarios={[
          { title: 'Service / Consulting', description: 'Weight SDE multiple higher — buyers pay for owner earnings. Typical multiple: 2–3×.' },
          { title: 'SaaS / Digital Product', description: 'Recurring revenue and proprietary code dominate. Use 4–8× EBITDA and full contract value.' },
          { title: 'E-commerce', description: 'Inventory + brand + email list matter most. Multiple: 2.5–4× SDE.' },
          { title: 'Local / Brick-and-mortar', description: 'Equipment, lease, and goodwill drive value. Multiple: 2–3× SDE.' },
        ]}
        pitfalls={[
          { title: 'Ignoring intangibles', description: 'Brand, customer list, and IP often outweigh equipment. Don\'t leave them at $0.' },
          { title: 'Using revenue only', description: 'A $1M revenue business losing money is worth far less than one earning $200k SDE.' },
          { title: 'Overstating goodwill', description: 'Goodwill only counts if it\'s transferable — reviews tied to your personal name may not transfer.' },
          { title: 'Wrong multiple', description: 'Multiples vary massively by industry, size, and risk. Check BizBuySell or industry reports before trusting one number.' },
        ]}
        tips={[
          { title: 'Blend the methods', description: 'No single method is right. The blended estimate weighted toward market + DCF is usually closest to a buyer\'s offer.' },
          { title: 'Document your IP', description: 'Registered trademarks, filed patents, and written processes command premiums vs. undocumented know-how.' },
          { title: 'Recurring beats one-time', description: 'Converting one-time sales to subscriptions can 3–5× your valuation multiple.' },
        ]}
      />
    </motion.div>
  );
}

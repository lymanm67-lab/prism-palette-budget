import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, AlertTriangle, CheckCircle2, TrendingUp, Package, Users, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import AnimatedNumber from '@/components/AnimatedNumber';
import CalculatorActions from '@/components/CalculatorActions';
import CalculatorGuide from '@/components/CalculatorGuide';

type OfferType = 'product' | 'service' | 'bundle';

const OFFER_TYPES: { id: OfferType; label: string; icon: typeof Package; description: string }[] = [
  { id: 'product', label: 'Physical Product', icon: Package, description: 'Goods with material & shipping costs' },
  { id: 'service', label: 'Service', icon: Users, description: 'Coaching, consulting, freelance' },
  { id: 'bundle', label: 'Bundle', icon: Layers, description: 'Service + products combined' },
];

export default function PricingCalculator() {
  const { formatCurrency } = useCurrency();
  const [offerType, setOfferType] = useState<OfferType>('service');

  // Product inputs
  const [materialCost, setMaterialCost] = useState('15');
  const [shippingCost, setShippingCost] = useState('5');
  const [packagingCost, setPackagingCost] = useState('2');

  // Service inputs
  const [hourlyRate, setHourlyRate] = useState('50');
  const [hoursPerClient, setHoursPerClient] = useState('4');
  const [prepHours, setPrepHours] = useState('1');

  // Bundle inputs
  const [productCostInBundle, setProductCostInBundle] = useState('25');
  const [serviceHoursInBundle, setServiceHoursInBundle] = useState('3');
  const [bundleHourlyRate, setBundleHourlyRate] = useState('50');

  // Shared inputs
  const [monthlyOverhead, setMonthlyOverhead] = useState('500');
  const [unitsPerMonth, setUnitsPerMonth] = useState('20');
  const [taxRate, setTaxRate] = useState('25');
  const [desiredMargin, setDesiredMargin] = useState('40');

  const result = useMemo(() => {
    const overhead = parseFloat(monthlyOverhead) || 0;
    const units = Math.max(1, parseFloat(unitsPerMonth) || 1);
    const tax = (parseFloat(taxRate) || 0) / 100;
    const margin = (parseFloat(desiredMargin) || 0) / 100;
    const overheadPerUnit = overhead / units;

    let directCost = 0;
    let laborValue = 0;
    let totalHours = 0;

    if (offerType === 'product') {
      directCost = (parseFloat(materialCost) || 0) + (parseFloat(shippingCost) || 0) + (parseFloat(packagingCost) || 0);
    } else if (offerType === 'service') {
      const rate = parseFloat(hourlyRate) || 0;
      const clientHrs = parseFloat(hoursPerClient) || 0;
      const prep = parseFloat(prepHours) || 0;
      totalHours = clientHrs + prep;
      laborValue = rate * totalHours;
      directCost = laborValue;
    } else {
      const prodCost = parseFloat(productCostInBundle) || 0;
      const svcHrs = parseFloat(serviceHoursInBundle) || 0;
      const rate = parseFloat(bundleHourlyRate) || 0;
      totalHours = svcHrs;
      laborValue = rate * svcHrs;
      directCost = prodCost + laborValue;
    }

    const totalCost = directCost + overheadPerUnit;
    const preTaxPrice = totalCost / (1 - margin);
    const taxAmount = preTaxPrice * tax;

    // Three price points
    const minPrice = totalCost * 1.05; // 5% above cost — danger zone
    const competitivePrice = preTaxPrice;
    const premiumPrice = preTaxPrice * 1.35;

    // Breakeven
    const breakeven = overhead > 0 ? Math.ceil(overhead / (competitivePrice - directCost)) : 0;

    // Effective hourly rate (for services/bundles)
    const effectiveHourly = totalHours > 0 ? (competitivePrice - (directCost - laborValue) - overheadPerUnit) / totalHours : 0;

    // Pricing zone assessment
    const profitPerUnit = competitivePrice - totalCost;
    const profitMarginActual = competitivePrice > 0 ? (profitPerUnit / competitivePrice) * 100 : 0;

    return {
      directCost, overheadPerUnit, totalCost, taxAmount,
      minPrice, competitivePrice, premiumPrice,
      breakeven, effectiveHourly, totalHours,
      profitPerUnit, profitMarginActual, laborValue,
    };
  }, [offerType, materialCost, shippingCost, packagingCost, hourlyRate, hoursPerClient, prepHours, productCostInBundle, serviceHoursInBundle, bundleHourlyRate, monthlyOverhead, unitsPerMonth, taxRate, desiredMargin]);

  const zoneColor = result.profitMarginActual < 15 ? 'text-destructive' : result.profitMarginActual < 30 ? 'text-amber-500' : 'text-green-500';
  const zoneLabel = result.profitMarginActual < 15 ? 'Danger Zone — Too Low' : result.profitMarginActual < 30 ? 'Competitive — Watch Margins' : 'Healthy Margin';
  const ZoneIcon = result.profitMarginActual < 15 ? AlertTriangle : result.profitMarginActual < 30 ? TrendingUp : CheckCircle2;

  return (
    <div className="space-y-6">
      <CalculatorGuide title="Pricing Calculator" icon={DollarSign} iconColor="text-prism-lime"
        ttsScript="Know exactly what to charge so you never undervalue your work."
        instructions={['Choose your offer type', 'Enter your costs and desired margin', 'See minimum, competitive, and premium price points']} />

      {/* Offer type selector */}
      <div className="grid grid-cols-3 gap-2">
        {OFFER_TYPES.map(t => (
          <button key={t.id} onClick={() => setOfferType(t.id)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all text-center',
              offerType === t.id
                ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25'
                : 'bg-gradient-to-br from-muted/60 to-muted/30 border-border/40 hover:border-primary/40'
            )}>
            <t.icon className={cn('h-5 w-5', offerType === t.id ? 'text-primary-foreground' : 'text-muted-foreground')} />
            <span className="text-xs font-semibold">{t.label}</span>
            <span className={cn('text-[10px] leading-tight', offerType === t.id ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{t.description}</span>
          </button>
        ))}
      </div>

      {/* Dynamic inputs based on offer type */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offerType === 'product' && (
          <>
            <div className="space-y-2"><Label>Material Cost per Unit</Label><Input type="number" min="0" value={materialCost} onChange={e => setMaterialCost(e.target.value)} /></div>
            <div className="space-y-2"><Label>Shipping Cost per Unit</Label><Input type="number" min="0" value={shippingCost} onChange={e => setShippingCost(e.target.value)} /></div>
            <div className="space-y-2"><Label>Packaging Cost per Unit</Label><Input type="number" min="0" value={packagingCost} onChange={e => setPackagingCost(e.target.value)} /></div>
          </>
        )}
        {offerType === 'service' && (
          <>
            <div className="space-y-2"><Label>Your Hourly Rate</Label><Input type="number" min="0" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} /></div>
            <div className="space-y-2"><Label>Hours per Client/Session</Label><Input type="number" min="0" step="0.5" value={hoursPerClient} onChange={e => setHoursPerClient(e.target.value)} /></div>
            <div className="space-y-2"><Label>Prep/Admin Hours</Label><Input type="number" min="0" step="0.5" value={prepHours} onChange={e => setPrepHours(e.target.value)} /></div>
          </>
        )}
        {offerType === 'bundle' && (
          <>
            <div className="space-y-2"><Label>Product/Material Cost</Label><Input type="number" min="0" value={productCostInBundle} onChange={e => setProductCostInBundle(e.target.value)} /></div>
            <div className="space-y-2"><Label>Service Hours Included</Label><Input type="number" min="0" step="0.5" value={serviceHoursInBundle} onChange={e => setServiceHoursInBundle(e.target.value)} /></div>
            <div className="space-y-2"><Label>Your Hourly Rate</Label><Input type="number" min="0" value={bundleHourlyRate} onChange={e => setBundleHourlyRate(e.target.value)} /></div>
          </>
        )}

        <div className="space-y-2"><Label>Monthly Overhead</Label><Input type="number" min="0" value={monthlyOverhead} onChange={e => setMonthlyOverhead(e.target.value)} /></div>
        <div className="space-y-2"><Label>Expected Sales / Month</Label><Input type="number" min="1" value={unitsPerMonth} onChange={e => setUnitsPerMonth(e.target.value)} /></div>
        <div className="space-y-2"><Label>Tax Rate (%)</Label><Input type="number" min="0" max="50" value={taxRate} onChange={e => setTaxRate(e.target.value)} /></div>
        <div className="space-y-2"><Label>Desired Profit Margin (%)</Label><Input type="number" min="0" max="90" value={desiredMargin} onChange={e => setDesiredMargin(e.target.value)} /></div>
      </div>

      {/* Results */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        {/* Zone indicator */}
        <div className={cn('rounded-xl p-4 border text-center',
          result.profitMarginActual < 15 ? 'bg-destructive/10 border-destructive/30' :
          result.profitMarginActual < 30 ? 'bg-amber-500/10 border-amber-500/30' :
          'bg-green-500/10 border-green-500/30')}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <ZoneIcon className={cn('h-5 w-5', zoneColor)} />
            <span className={cn('font-bold text-lg', zoneColor)}>{zoneLabel}</span>
          </div>
          <p className="text-sm text-muted-foreground">Profit margin: {result.profitMarginActual.toFixed(1)}%</p>
        </div>

        {/* Three price tiers */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Minimum</p>
              <p className="text-xl font-bold text-destructive"><AnimatedNumber value={result.minPrice} formatFn={formatCurrency} /></p>
              <p className="text-[11px] text-muted-foreground mt-1">Barely covers costs — avoid</p>
            </CardContent>
          </Card>
          <Card className="border-primary/30 bg-primary/5 ring-2 ring-primary/20">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-primary uppercase tracking-wider font-semibold mb-1">Recommended</p>
              <p className="text-2xl font-bold text-primary"><AnimatedNumber value={result.competitivePrice} formatFn={formatCurrency} /></p>
              <p className="text-[11px] text-muted-foreground mt-1">{formatCurrency(result.profitPerUnit)} profit per sale</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Premium</p>
              <p className="text-xl font-bold text-green-600"><AnimatedNumber value={result.premiumPrice} formatFn={formatCurrency} /></p>
              <p className="text-[11px] text-muted-foreground mt-1">For high-value positioning</p>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: 'Direct Cost', val: result.directCost },
            { label: 'Overhead / Unit', val: result.overheadPerUnit },
            { label: 'Total Cost', val: result.totalCost },
            { label: 'Breakeven Units', val: result.breakeven, fmt: (n: number) => `${n} / mo` },
            ...(result.totalHours > 0 ? [{ label: 'Effective $/hr', val: result.effectiveHourly, accent: true }] : []),
            ...(result.laborValue > 0 ? [{ label: 'Labor Value', val: result.laborValue }] : []),
          ].map(r => (
            <Card key={r.label} className={cn('border', (r as any).accent && 'border-primary/30 bg-primary/5')}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{r.label}</p>
                <p className={cn('text-lg font-bold', (r as any).accent && 'text-primary')}>
                  {(r as any).fmt ? (r as any).fmt(r.val) : <AnimatedNumber value={r.val} formatFn={formatCurrency} />}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <CalculatorActions calculatorType="pricing" inputs={{ offerType, desiredMargin, monthlyOverhead, unitsPerMonth }}
          results={result} hasResults={true}
          summaryText={`Pricing (${offerType}): Recommended ${formatCurrency(result.competitivePrice)}, min ${formatCurrency(result.minPrice)}, premium ${formatCurrency(result.premiumPrice)}. Margin: ${result.profitMarginActual.toFixed(1)}%.`} />
      </motion.div>
    </div>
  );
}

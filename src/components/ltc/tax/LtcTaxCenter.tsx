import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaxAdvantageTab } from './TaxAdvantageTab';
import { HsaFundingTab } from './HsaFundingTab';
import { BenefitTaxabilityTab } from './BenefitTaxabilityTab';
import { IrsLimitsPanel } from './IrsLimitsPanel';
import { LtcExportBar } from '../LtcExportBar';
import { resolveExportInputs, type LtcExportOptions } from '@/lib/ltc/exports';
import { buildLtcTaxShareUrl } from '@/lib/ltc/share';
import type { PremiumDeductionInputs, HsaFundingInputs, BenefitTaxInputs } from '@/lib/ltc/tax';

const SUB_TABS = [
  { key: 'deduction', label: 'Premium Deduction' },
  { key: 'hsa', label: 'HSA vs Cash' },
  { key: 'benefits', label: 'Benefit Taxability' },
  { key: 'limits', label: 'IRS Limits & Docs' },
];

export function LtcTaxCenter() {
  const defaults = useMemo(() => resolveExportInputs(), []);
  const [deduction, setDeduction] = useState<PremiumDeductionInputs>(defaults.deduction);
  const [hsa, setHsa] = useState<HsaFundingInputs>(defaults.hsa);
  const [benefit, setBenefit] = useState<BenefitTaxInputs>(defaults.benefit);

  const opts: LtcExportOptions = { deduction, hsa, benefit };

  const onShare = async () => {
    const url = buildLtcTaxShareUrl(opts, 'LTC Tax Report');
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Read-only share link copied', { description: 'Anyone with the link sees a locked report with exports.' });
    } catch {
      window.prompt('Copy this read-only report link', url);
    }
  };

  return (
    <Tabs defaultValue="deduction" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList className="flex flex-wrap h-auto justify-start print:hidden">
          {SUB_TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="text-xs">{t.label}</TabsTrigger>
          ))}
        </TabsList>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button size="sm" variant="outline" onClick={onShare}>
            <Link2 className="h-3.5 w-3.5 mr-1" /> Share read-only report
          </Button>
          <LtcExportBar opts={opts} />
        </div>
      </div>
      <TabsContent value="deduction"><TaxAdvantageTab inputs={deduction} onChange={setDeduction} /></TabsContent>
      <TabsContent value="hsa"><HsaFundingTab inputs={hsa} onChange={setHsa} /></TabsContent>
      <TabsContent value="benefits"><BenefitTaxabilityTab inputs={benefit} onChange={setBenefit} /></TabsContent>
      <TabsContent value="limits"><IrsLimitsPanel /></TabsContent>
    </Tabs>
  );
}

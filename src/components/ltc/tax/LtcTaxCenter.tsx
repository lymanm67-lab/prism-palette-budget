import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaxAdvantageTab } from './TaxAdvantageTab';
import { HsaFundingTab } from './HsaFundingTab';
import { BenefitTaxabilityTab } from './BenefitTaxabilityTab';
import { IrsLimitsPanel } from './IrsLimitsPanel';

const SUB_TABS = [
  { key: 'deduction', label: 'Premium Deduction' },
  { key: 'hsa', label: 'HSA vs Cash' },
  { key: 'benefits', label: 'Benefit Taxability' },
  { key: 'limits', label: 'IRS Limits & Docs' },
];

export function LtcTaxCenter() {
  return (
    <Tabs defaultValue="deduction" className="space-y-4">
      <TabsList className="flex w-full flex-wrap h-auto justify-start print:hidden">
        {SUB_TABS.map((t) => (
          <TabsTrigger key={t.key} value={t.key} className="text-xs">{t.label}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="deduction"><TaxAdvantageTab /></TabsContent>
      <TabsContent value="hsa"><HsaFundingTab /></TabsContent>
      <TabsContent value="benefits"><BenefitTaxabilityTab /></TabsContent>
      <TabsContent value="limits"><IrsLimitsPanel /></TabsContent>
    </Tabs>
  );
}

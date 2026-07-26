import { useState } from 'react';
import { Info } from 'lucide-react';
import DownPaymentPlanner from './DownPaymentPlanner';
import ClosingCostEstimator from './ClosingCostEstimator';
import HousingBudgetPlanner from './HousingBudgetPlanner';
import HiddenCostBudget from './HiddenCostBudget';
import CreditDebtImpact from './CreditDebtImpact';
import SharedCreditReports from './SharedCreditReports';
import SharedVerificationDocs from './SharedVerificationDocs';

export default function HomeBuyingCalculators() {
  const [price, setPrice] = useState(185000);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 border border-border/50 rounded-md px-3 py-2">
        <Info className="h-3.5 w-3.5 text-prism-teal" />
        Home Price is shared across all calculators — change it once and it updates everywhere.
      </div>
      <HousingBudgetPlanner price={price} onPriceChange={setPrice} />
      <CreditDebtImpact price={price} onPriceChange={setPrice} />
      <DownPaymentPlanner price={price} onPriceChange={setPrice} />
      <ClosingCostEstimator price={price} onPriceChange={setPrice} />
      <HiddenCostBudget price={price} onPriceChange={setPrice} />
      <SharedCreditReports />
      <SharedVerificationDocs />

    </div>
  );
}

import DownPaymentPlanner from './DownPaymentPlanner';
import ClosingCostEstimator from './ClosingCostEstimator';
import HiddenCostBudget from './HiddenCostBudget';
import CreditDebtImpact from './CreditDebtImpact';

export default function HomeBuyingCalculators() {
  return (
    <div className="space-y-4">
      <DownPaymentPlanner />
      <ClosingCostEstimator />
      <HiddenCostBudget />
      <CreditDebtImpact />
    </div>
  );
}

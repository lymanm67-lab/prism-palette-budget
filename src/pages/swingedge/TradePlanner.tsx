import PhasePlaceholder from '@/components/swingedge/PhasePlaceholder';
import { useTradingTitle } from '@/hooks/use-swingedge';

export default function TradePlanner() {
  useTradingTitle('Trade Planner');
  return (
    <PhasePlaceholder
      title="Trade Planner"
      phase="Phase 3"
      purpose="Turn an estimate into a decision: your own entry, stop and target, with the share count and dollar risk worked out for you."
      willInclude={[
        'Planned entry, planned stop and planned target that you set — not the scanner estimate.',
        'Share count from your risk per trade, plus the exact dollar risk and reward-to-risk of the plan.',
        'A refusal to save the plan when it would push your total open risk past your portfolio limit.',
        'A written reason to take the trade and a written reason it would be wrong.',
      ]}
      gate={[
        'A $5,000 account risking 1% with a $2.00 stop distance sizes to 25 shares and $50 of risk.',
        'Planned numbers are labelled differently from scanner estimates everywhere they appear.',
        'A plan that breaks the portfolio risk limit is blocked with a plain-language explanation.',
      ]}
    />
  );
}

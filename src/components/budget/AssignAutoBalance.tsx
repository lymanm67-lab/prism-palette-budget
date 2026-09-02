import AutoAssignCard from '@/components/budget/AutoAssignCard';
import { useMoneyPurposeSnapshot } from '@/hooks/use-money-purpose';

/**
 * Thin wrapper so the Assign step of /budgets can run Layer A auto-balancing
 * directly, without opening the Money Blueprint cash-flow tab.
 */
export default function AssignAutoBalance({ month }: { month: string }) {
  const snap = useMoneyPurposeSnapshot(month, 1);
  return <AutoAssignCard reconciliation={snap.blueprint.reconciliation} month={month} />;
}

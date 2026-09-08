import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import {
  Wallet,
  Receipt,
  PiggyBank,
  ListChecks,
  Scale,
  Coins,
} from 'lucide-react';
import AssignRemainingDialog, {
  type AssignCandidate,
} from './AssignRemainingDialog';

interface Props {
  totalIncomeBudget: number;
  totalIncomeActual: number;
  totalExpenseBudget: number;
  totalExpenseActual: number;
  plannedSurplus: number;
  actualSurplus: number;
  safeToSpendMonthly: number;
  safeToSpendBuffer: number;
  unallocated: number;
  ownerContribution: number;
  budgetType: 'personal' | 'business' | 'all';
  totalExpenseRemaining: number;
  nextIncome: { amount: number; next_due_date: string } | null;
  daysToNextIncome: number | null;
  payrollDeductionBudget: number;
  grossIncomeBudget: number;
  typicalLeftOver: number;
  assignScopeLabel: string;
  assignCandidates: AssignCandidate[];
  onAssign: (categoryId: string, newPlanned: number) => Promise<void>;
}

type Tone = 'teal' | 'sky' | 'rose' | 'amber' | 'violet';

const toneClasses: Record<Tone, { text: string; bg: string; border: string }> = {
  teal: { text: 'text-prism-teal', bg: 'bg-prism-teal/10', border: 'border-l-prism-teal' },
  sky: { text: 'text-prism-sky', bg: 'bg-prism-sky/10', border: 'border-l-prism-sky' },
  rose: { text: 'text-prism-rose', bg: 'bg-prism-rose/10', border: 'border-l-prism-rose' },
  amber: { text: 'text-prism-amber', bg: 'bg-prism-amber/10', border: 'border-l-prism-amber' },
  violet: { text: 'text-prism-violet', bg: 'bg-prism-violet/10', border: 'border-l-prism-violet' },
};

export default function BudgetSummaryTiles({
  totalIncomeBudget,
  totalIncomeActual,
  totalExpenseBudget,
  totalExpenseActual,
  plannedSurplus,
  actualSurplus,
  safeToSpendMonthly,
  safeToSpendBuffer,
  unallocated,
  ownerContribution,
  budgetType,
  totalExpenseRemaining,
  nextIncome,
  daysToNextIncome,
  payrollDeductionBudget,
  grossIncomeBudget,
  typicalLeftOver,
  assignScopeLabel,
  assignCandidates,
  onAssign,
}: Props) {
  const { formatCurrency } = useCurrency();
  const scopeName =
    budgetType === 'all' ? 'Combined' : budgetType === 'business' ? 'Business' : 'Personal';

  const underOverTone: Tone = totalExpenseRemaining < 0 ? 'rose' : 'teal';
  const unallocatedTone: Tone = unallocated < 0 ? 'amber' : unallocated === 0 ? 'teal' : 'sky';
  const surplusTone: Tone = plannedSurplus < 0 ? 'rose' : 'teal';

  const incomeTooltip = (
    <div className="space-y-1">
      <p className="font-semibold">Net income: {formatCurrency(totalIncomeBudget)}</p>
      {payrollDeductionBudget > 0 && (
        <p className="text-muted-foreground">
          {formatCurrency(grossIncomeBudget)} gross − {formatCurrency(payrollDeductionBudget)} deductions
        </p>
      )}
      <p className="text-muted-foreground">{formatCurrency(totalIncomeActual)} received so far</p>
      {totalIncomeActual === 0 && totalIncomeBudget > 0 && (
        <p className="text-prism-amber">No paycheck has landed yet this month.</p>
      )}
    </div>
  );

  const expenseTooltip = (
    <div className="space-y-1">
      <p className="font-semibold">Expense plan: {formatCurrency(totalExpenseBudget)}</p>
      <p className="text-muted-foreground">{formatCurrency(totalExpenseActual)} spent so far</p>
      <p className="text-xs text-muted-foreground">
        {totalExpenseRemaining < 0
          ? `${formatCurrency(Math.abs(totalExpenseRemaining))} over budget`
          : `${formatCurrency(totalExpenseRemaining)} under budget`}
      </p>
    </div>
  );

  const surplusTooltip = (
    <div className="space-y-1.5">
      <p className="font-semibold">
        {formatCurrency(totalIncomeBudget)} income − {formatCurrency(totalExpenseBudget)} expenses
      </p>
      <p className="text-muted-foreground">
        So far: {formatCurrency(totalIncomeActual)} received − {formatCurrency(totalExpenseActual)} spent ={' '}
        {formatCurrency(actualSurplus)}
      </p>
      {totalIncomeActual === 0 && totalExpenseActual > 0 && (
        <p className="text-prism-amber">
          No income has landed yet, so the “so far” figure looks negative.
        </p>
      )}
      <p className="text-muted-foreground">Typical month leftover: {formatCurrency(typicalLeftOver)}</p>
      <p className="text-prism-teal font-medium">
        Safe to spend: {formatCurrency(safeToSpendMonthly)}
      </p>
      <p className="text-xs text-muted-foreground">
        Planned surplus − savings − investing − {safeToSpendBuffer}% buffer = safe to spend.
        Matches Dashboard when both show {scopeName}.
      </p>
    </div>
  );

  const unallocatedTooltip = (
    <div className="space-y-1">
      <p className="font-semibold">
        {unallocated < 0 ? 'Over-allocated' : unallocated === 0 ? 'Fully allocated' : 'Unallocated'}:{' '}
        {formatCurrency(Math.abs(unallocated))}
      </p>
      {ownerContribution > 0 && budgetType !== 'all' && (
        <p className="text-prism-sky">
          {budgetType === 'business' ? '+' : '−'}
          {formatCurrency(ownerContribution)} owner contribution
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {unallocated > 0
          ? 'Money left to assign. Click the button to give it a job.'
          : unallocated < 0
          ? 'Expenses exceed income. Trim a planned amount to land on zero.'
          : 'Every dollar of income is assigned to a category.'}
      </p>
    </div>
  );

  const underOverTooltip = (
    <div className="space-y-1">
      <p className="font-semibold">
        {totalExpenseRemaining < 0 ? 'Over budget' : 'Under budget'} by{' '}
        {formatCurrency(Math.abs(totalExpenseRemaining))}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatCurrency(totalExpenseActual)} actual − {formatCurrency(totalExpenseBudget)} planned
      </p>
    </div>
  );

  const expectedIncomeTooltip = (
    <div className="space-y-1">
      <p className="font-semibold">
        Expected: {nextIncome ? formatCurrency(nextIncome.amount) : formatCurrency(totalIncomeBudget)}
      </p>
      {nextIncome && (
        <p className="text-muted-foreground">
          Due {new Date(nextIncome.next_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {daysToNextIncome !== null && (
            <span> — {daysToNextIncome === 0 ? 'today' : `${daysToNextIncome} day${daysToNextIncome === 1 ? '' : 's'} away`}</span>
          )}
        </p>
      )}
      {totalIncomeActual === 0 && totalIncomeBudget > 0 && (
        <p className="text-prism-amber">No paycheck has landed yet — that’s why surplus looks negative right now.</p>
      )}
    </div>
  );

  const tiles = [
    {
      key: 'income',
      label: 'Income',
      icon: Wallet,
      tone: 'teal' as Tone,
      value: totalIncomeBudget,
      sub: `${formatCurrency(totalIncomeActual)} received`,
      tooltip: incomeTooltip,
    },
    {
      key: 'expenses',
      label: 'Expenses',
      icon: Receipt,
      tone: 'sky' as Tone,
      value: totalExpenseBudget,
      sub: `${formatCurrency(totalExpenseActual)} spent`,
      tooltip: expenseTooltip,
    },
    {
      key: 'surplus',
      label: 'Planned surplus',
      icon: PiggyBank,
      tone: surplusTone,
      value: plannedSurplus,
      sub: `safe to spend ${formatCurrency(safeToSpendMonthly)}`,
      tooltip: surplusTooltip,
    },
    {
      key: 'unallocated',
      label: 'Unallocated',
      icon: ListChecks,
      tone: unallocatedTone,
      value: Math.abs(unallocated),
      sub: unallocated < 0 ? 'over-allocated' : unallocated === 0 ? 'fully allocated' : 'to assign',
      tooltip: unallocatedTooltip,
      extra:
        Math.abs(unallocated) > 0.01 ? (
          <AssignRemainingDialog
            amount={unallocated}
            scopeLabel={assignScopeLabel}
            candidates={assignCandidates}
            onAssign={onAssign}
            size="sm"
            className="h-7 w-full text-[10px] mt-1"
          />
        ) : null,
    },
    {
      key: 'underover',
      label: 'Under / Over',
      icon: Scale,
      tone: underOverTone,
      value: Math.abs(totalExpenseRemaining),
      sub: totalExpenseRemaining < 0 ? 'over budget' : 'under budget',
      tooltip: underOverTooltip,
    },
    {
      key: 'expected',
      label: 'Expected income',
      icon: Coins,
      tone: 'violet' as Tone,
      value: nextIncome ? nextIncome.amount : totalIncomeBudget,
      sub: nextIncome
        ? `due ${new Date(nextIncome.next_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : 'budgeted income',
      tooltip: expectedIncomeTooltip,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
      {tiles.map((tile) => {
        const { text, bg, border } = toneClasses[tile.tone];
        const Icon = tile.icon;
        return (
          <Card
            key={tile.key}
            className={cn(
              'border-l-4 overflow-hidden transition-shadow hover:shadow-md',
              border
            )}
          >
            <CardContent className="p-2">
              <div className="flex items-start gap-2">
                <div className={cn('mt-0.5 rounded-md p-1 shrink-0', bg, text)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate cursor-help">
                        {tile.label}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      {tile.tooltip}
                    </TooltipContent>
                  </Tooltip>
                  <p
                    className={cn(
                      'text-base sm:text-lg font-bold font-display tabular-nums leading-tight truncate',
                      tile.tone === 'rose' ? text : 'text-foreground'
                    )}
                  >
                    {formatCurrency(tile.value)}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 truncate pl-[calc(1.25rem+0.5rem)]">
                {tile.sub}
              </p>
              {tile.extra && (
                <div className="pl-[calc(1.25rem+0.5rem)]">{tile.extra}</div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

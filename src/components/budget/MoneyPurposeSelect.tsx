import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUpdateCategory } from '@/hooks/use-finance-data';
import { PURPOSE_META, type MoneyPurpose } from '@/lib/budgeting/moneyPurpose';
import { cn } from '@/lib/utils';

const ALL: MoneyPurpose[] = [

const ALL: MoneyPurpose[] = [
  'live',
  'enjoy',
  'build_wealth',
  'eliminate_debt',
  'business',
  'payroll_deduction',
  'employer_contribution',
];

interface Props {
  categoryId: string;
  /** resolved purpose (stored override or smart mapping) */
  value: MoneyPurpose | null;
  /** true when the value came from a stored override rather than smart mapping */
  isOverride?: boolean;
  className?: string;
}

/**
 * Per-category Money Purpose override. When untouched the badge shows the
 * smart-mapped value with an "auto" hint; picking a value stores an override.
 */
export default function MoneyPurposeSelect({ categoryId, value, isOverride, className }: Props) {
  const updateCategory = useUpdateCategory();
  const meta = value ? PURPOSE_META[value] : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('inline-flex', className)}>
          <Select
            value={value || ''}
            onValueChange={(v) => updateCategory.mutate({ id: categoryId, money_purpose: v } as any)}
          >
            <SelectTrigger
              className={cn(
                'h-6 w-auto gap-1 border-dashed px-2 text-[10px] font-medium uppercase tracking-wide',
                meta?.token,
                !isOverride && 'opacity-70',
              )}
            >
              <SelectValue placeholder="Set purpose" />
            </SelectTrigger>
            <SelectContent>
              {ALL.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">
                  {PURPOSE_META[p].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {meta ? meta.tooltip : 'Income has no Money Purpose — it is the denominator.'}
        <div className="mt-1 text-[10px] text-muted-foreground">
          {isOverride ? 'Manual override' : 'Auto-mapped — pick a value to override'}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

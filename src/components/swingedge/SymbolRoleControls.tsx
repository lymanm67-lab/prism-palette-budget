import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  PORTFOLIO_ROLES,
  TRADING_STATUSES,
  roleMeta,
  statusMeta,
  type PortfolioRole,
  type TradingStatus,
} from '@/lib/swingedge/roles';

/** Read-only role badge. */
export function RoleBadge({ role }: { role: string }) {
  const meta = roleMeta(role);
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn('font-semibold', meta.tone)}>
          {meta.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{meta.job}</TooltipContent>
    </Tooltip>
  );
}

/** Read-only status badge. */
export function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta(status);
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn('font-semibold', meta.tone)}>
          {meta.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{meta.meaning}</TooltipContent>
    </Tooltip>
  );
}

export function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: PortfolioRole;
  onChange: (v: PortfolioRole) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PortfolioRole)} disabled={disabled}>
      <SelectTrigger className="h-8 w-[140px] text-xs" aria-label="Portfolio role">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PORTFOLIO_ROLES.map((r) => (
          <SelectItem key={r.value} value={r.value} className="text-xs">
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function StatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: TradingStatus;
  onChange: (v: TradingStatus) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TradingStatus)} disabled={disabled}>
      <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Trading status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TRADING_STATUSES.map((s) => (
          <SelectItem key={s.value} value={s.value} className="text-xs">
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; icon: any; className: string }> = {
  active: { label: 'Active', icon: CheckCircle2, className: 'bg-prism-teal/10 text-prism-teal border-prism-teal/30' },
  suspected_unused: { label: 'Suspected Unused', icon: AlertTriangle, className: 'bg-prism-orange/10 text-prism-orange border-prism-orange/30' },
  renewal_approaching: { label: 'Renewal Soon', icon: Clock, className: 'bg-prism-violet/10 text-prism-violet border-prism-violet/30' },
  recently_increased: { label: 'Price Increased', icon: TrendingUp, className: 'bg-prism-rose/10 text-prism-rose border-prism-rose/30' },
};

const OVERRIDE_CONFIG: Record<string, { label: string; className: string }> = {
  still_using: { label: 'Still Using', className: 'bg-prism-teal/10 text-prism-teal border-prism-teal/30' },
  no_longer_using: { label: 'Not Using', className: 'bg-prism-rose/10 text-prism-rose border-prism-rose/30' },
  unsure: { label: 'Unsure', className: 'bg-prism-orange/10 text-prism-orange border-prism-orange/30' },
};

const CANCEL_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  not_started: { label: '', className: '' },
  requested: { label: 'Requested', className: 'bg-prism-sky/10 text-prism-sky border-prism-sky/30' },
  pending: { label: 'Pending', className: 'bg-prism-orange/10 text-prism-orange border-prism-orange/30' },
  canceled: { label: 'Canceled', className: 'bg-prism-teal/10 text-prism-teal border-prism-teal/30' },
  still_active: { label: 'Still Active', className: 'bg-prism-rose/10 text-prism-rose border-prism-rose/30' },
};

export function UsageStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export function UserOverrideBadge({ override }: { override: string | null }) {
  if (!override) return null;
  const config = OVERRIDE_CONFIG[override];
  if (!config) return null;
  return (
    <Badge variant="outline" className={`text-[10px] h-5 ${config.className}`}>
      {config.label}
    </Badge>
  );
}

export function CancellationStatusBadge({ status }: { status: string }) {
  const config = CANCEL_STATUS_CONFIG[status];
  if (!config || !config.label) return null;
  return (
    <Badge variant="outline" className={`text-[10px] h-5 ${config.className}`}>
      {config.label}
    </Badge>
  );
}

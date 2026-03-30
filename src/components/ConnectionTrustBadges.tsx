import { Shield, Eye, Lock, FileCheck, BadgeCheck } from 'lucide-react';

const TRUST_ITEMS = [
  { icon: Lock, label: '256-bit SSL Encryption', color: 'text-prism-teal' },
  { icon: Eye, label: 'Read-Only Access', color: 'text-prism-sky' },
  { icon: Shield, label: 'We Never Store Credentials', color: 'text-prism-lime' },
  { icon: FileCheck, label: 'SOC 2 Compliant Partners', color: 'text-prism-indigo' },
  { icon: BadgeCheck, label: 'Bank-Level Security', color: 'text-prism-amber' },
];

export default function ConnectionTrustBadges() {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">
        Your security is our priority
      </p>
      <div className="flex flex-wrap gap-2">
        {TRUST_ITEMS.map((item) => (
          <div
            key={item.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/80 px-3 py-1.5 text-[11px] font-medium text-muted-foreground"
          >
            <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
            {item.label}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/40">
        Connections are powered by Plaid, MX, and SnapTrade — industry-leading aggregators used by thousands of financial apps.
      </p>
    </div>
  );
}

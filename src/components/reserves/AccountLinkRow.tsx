import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link2, Unlink } from 'lucide-react';
import type { LinkableAccount, LinkedAccountInfo } from '@/lib/reserves/emergencyFund';

const money2 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

interface Props {
  /** Accounts the fund may follow. */
  accounts: LinkableAccount[];
  link: LinkedAccountInfo | null;
  onLink: (accountId: string | null) => void;
  disabled?: boolean;
  hint?: string;
}

/**
 * Links a reserve fund to a real institution account so its balance follows the
 * live feed instead of a manually typed number.
 */
export function AccountLinkRow({ accounts, link, onLink, disabled, hint }: Props) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-3.5 w-3.5 text-prism-teal" /> Linked account
          </p>
          <p className="text-xs text-muted-foreground">
            {hint || 'Pick the real account this reserve is held in. Its balance drives the card.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={link?.id || 'none'}
            disabled={disabled}
            onValueChange={(v) => onLink(v === 'none' ? null : v)}
          >
            <SelectTrigger className="w-[260px]"><SelectValue placeholder="Not linked" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not linked — track manually</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {(a.institution || '—')} · {a.name} ({money2(Number(a.balance || 0))})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {link && (
            <Button size="sm" variant="ghost" onClick={() => onLink(null)} disabled={disabled}>
              <Unlink className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {link && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            {link.institution} · {money2(link.balance)}
          </Badge>
          {link.providerType && link.providerType !== 'manual' ? (
            <span>
              {link.stale ? 'Feed stale — ' : 'Synced '}
              {link.syncedAt ? new Date(link.syncedAt).toLocaleString() : 'never'}
            </span>
          ) : (
            <span>Manual balance — update it on the Accounts page or here.</span>
          )}
        </div>
      )}
    </div>
  );
}

export default AccountLinkRow;

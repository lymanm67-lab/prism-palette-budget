// Missing-data checklist + reliability gating for the tri-bureau simulator.
//
// The simulator is only as good as the tradeline data on file. This module states
// exactly which fields each bureau needs, and which simulator inputs must be blocked
// because the underlying data can't support them.

import { BUREAUS, DEROGATORY_STATUSES, type Bureau, type Tradeline } from './triBureauModel';
import type { MortgageFico } from '@/lib/home-buying/mortgage-fico';

export type Severity = 'blocking' | 'degrades' | 'ok';

export interface ChecklistItem {
  field: string;
  requirement: string;
  severity: Severity;
  /** Human summary of what is missing, e.g. "2 of 5 cards have no limit". */
  detail: string;
  /** Account names that need the field filled in. */
  accounts: string[];
}

export interface BureauChecklist {
  bureau: Bureau;
  tradelineCount: number;
  /** true when the file can support a trustworthy simulation. */
  reliable: boolean;
  items: ChecklistItem[];
}

export interface ReliabilityGate {
  /** Account ids that must not be used as pay-down / limit-increase inputs. */
  blockedAccountIds: Set<string>;
  /** Reason keyed by account id. */
  blockReasons: Record<string, string>;
  /** Action kinds that are unreliable across the board. */
  blockedKinds: { kind: string; reason: string }[];
}

const names = (lines: Tradeline[]) => lines.map(l => l.account_name);

export function buildChecklists(
  tradelines: Tradeline[],
  inquiriesByBureau: Record<string, number[]>,
  reportedScores: MortgageFico,
): BureauChecklist[] {
  return BUREAUS.map<BureauChecklist>(bureau => {
    const lines = tradelines.filter(t => t.bureau === bureau);
    const revolvingish = lines.filter(
      l => /card|revolv|line of credit|heloc/i.test(l.account_type) || Number(l.credit_limit) > 0,
    );
    const noLimit = revolvingish.filter(l => !(Number(l.credit_limit) > 0));
    const noBalance = lines.filter(l => l.balance == null || Number.isNaN(Number(l.balance)));
    const noDate = lines.filter(l => !l.date_opened);
    const inq = inquiriesByBureau[bureau] || [];
    const anchor = reportedScores?.[bureau] ?? null;
    const derogs = lines.filter(l => DEROGATORY_STATUSES.includes(l.account_status));

    const items: ChecklistItem[] = [
      {
        field: 'Tradelines imported',
        requirement: 'At least 3 accounts for this bureau',
        severity: lines.length === 0 ? 'blocking' : lines.length < 3 ? 'degrades' : 'ok',
        detail:
          lines.length === 0
            ? 'No accounts on file for this bureau — nothing to score'
            : `${lines.length} account${lines.length === 1 ? '' : 's'} on file`,
        accounts: [],
      },
      {
        field: 'Credit limit / high balance',
        requirement: 'Required on every revolving account to compute utilization',
        severity: revolvingish.length === 0 ? 'degrades' : noLimit.length > 0 ? 'blocking' : 'ok',
        detail:
          revolvingish.length === 0
            ? 'No revolving accounts on file — utilization cannot be modeled'
            : noLimit.length > 0
              ? `${noLimit.length} of ${revolvingish.length} revolving accounts have no limit`
              : `All ${revolvingish.length} revolving accounts have limits`,
        accounts: names(noLimit),
      },
      {
        field: 'Current balance',
        requirement: 'Required on every account',
        severity: noBalance.length > 0 ? 'blocking' : 'ok',
        detail: noBalance.length > 0 ? `${noBalance.length} accounts missing a balance` : 'All balances present',
        accounts: names(noBalance),
      },
      {
        field: 'Date opened',
        requirement: 'Needed for average age of accounts (15% of the score)',
        severity: noDate.length === lines.length && lines.length > 0 ? 'blocking' : noDate.length > 0 ? 'degrades' : 'ok',
        detail: noDate.length > 0 ? `${noDate.length} of ${lines.length} accounts missing an open date` : 'All open dates present',
        accounts: names(noDate),
      },
      {
        field: 'Account status',
        requirement: 'Open / Closed / Collection / Charge-Off so negatives are counted',
        severity: lines.some(l => !l.account_status) ? 'degrades' : 'ok',
        detail: `${derogs.length} derogatory item${derogs.length === 1 ? '' : 's'} detected on this bureau`,
        accounts: names(lines.filter(l => !l.account_status)),
      },
      {
        field: 'Hard inquiries',
        requirement: 'Inquiry dates for this bureau',
        severity: inq.length === 0 ? 'degrades' : 'ok',
        detail: inq.length === 0 ? 'None logged — inquiry timing scenarios are estimates only' : `${inq.length} logged`,
        accounts: [],
      },
      {
        field: 'Reported score anchor',
        requirement: 'A real bureau score to anchor the projection to',
        severity: anchor == null ? 'degrades' : 'ok',
        detail: anchor == null ? 'No reported score — absolute level is modeled, range widens' : `Anchored to ${anchor}`,
        accounts: [],
      },
    ];

    return {
      bureau,
      tradelineCount: lines.length,
      reliable: !items.some(i => i.severity === 'blocking'),
      items,
    };
  });
}

/** Which specific inputs must be blocked because the data can't support them. */
export function buildGate(tradelines: Tradeline[], inquiriesByBureau: Record<string, number[]>): ReliabilityGate {
  const blockedAccountIds = new Set<string>();
  const blockReasons: Record<string, string> = {};

  for (const t of tradelines) {
    const revolvingish = /card|revolv|line of credit|heloc/i.test(t.account_type) || Number(t.credit_limit) > 0;
    if (revolvingish && !(Number(t.credit_limit) > 0)) {
      blockedAccountIds.add(t.id);
      blockReasons[t.id] = 'No credit limit on file — utilization change cannot be modeled. Add the limit first.';
    }
    if (t.balance == null || Number.isNaN(Number(t.balance))) {
      blockedAccountIds.add(t.id);
      blockReasons[t.id] = 'No balance on file.';
    }
  }

  const blockedKinds: { kind: string; reason: string }[] = [];
  const totalInq = Object.values(inquiriesByBureau).reduce((s, a) => s + a.length, 0);
  if (totalInq === 0) {
    blockedKinds.push({
      kind: 'ageInquiries',
      reason: 'No hard inquiries logged, so waiting to apply cannot remove anything. Log inquiries to enable.',
    });
  }
  return { blockedAccountIds, blockReasons, blockedKinds };
}

export function checklistSummary(lists: BureauChecklist[]) {
  const blocking = lists.flatMap(l => l.items.filter(i => i.severity === 'blocking').map(i => ({ bureau: l.bureau, ...i })));
  const degrades = lists.flatMap(l => l.items.filter(i => i.severity === 'degrades').map(i => ({ bureau: l.bureau, ...i })));
  return { blocking, degrades, allReliable: blocking.length === 0 };
}

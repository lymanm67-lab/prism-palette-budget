import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import type { MoneyPurposeSnapshot } from '@/hooks/use-money-purpose';
import { printInfographic, renderInfographic, money, pct, type InfographicSpec } from '@/lib/reports/infographic';
import { PHASE_LABEL } from '@/lib/budgeting/moneyPurpose';
import { buildSettlementPlan } from '@/lib/budgeting/settlementStepDown';

function monthLabel(month: string) {
  return new Date(`${month}-02T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function buildBlueprintSpec(snap: MoneyPurposeSnapshot, month: string): InfographicSpec {
  const bp = snap.blueprint;
  const cards = bp.cards;
  const find = (k: string) => cards.find((c) => c.key === k)!;
  const settlement = buildSettlementPlan(month);

  return {
    title: 'Money Blueprint',
    period: monthLabel(month),
    tagline: '50 / 10 / 20 / 20 — every dollar has a purpose',
    glance: [
      { label: 'Phase', value: PHASE_LABEL[bp.phase].split('—')[0].trim(), tone: 'purple' },
      { label: 'Alignment', value: `${bp.alignmentScore}/100`, tone: 'green' },
      { label: 'Take-Home', value: money(snap.netIncome), tone: 'blue' },
    ],
    kpis: cards.map((c) => ({
      title: c.label,
      value: `${c.actualPct.toFixed(1)}%`,
      sub: `${money(c.actualAmount)} of ${money(c.targetAmount)} (${c.targetPct}%)`,
      tone: c.key === 'live' ? 'navy' : c.key === 'enjoy' ? 'purple' : c.key === 'build_wealth' ? 'green' : 'orange',
    })),
    donut: {
      title: 'Actual Allocation of Take-Home Pay',
      totalLabel: 'Allocated',
      slices: cards.map((c) => ({ label: c.label, value: Math.max(0, c.actualAmount), color: c.color })),
      footerNote: 'Dollar figures include payroll wealth credit — do NOT sum against deposited net pay.',
    },
    tables: [
      {
        title: 'Wealth Building',
        tone: 'green',
        columns: [{ label: 'Source', align: 'left' }, { label: 'Amount', align: 'right' }],
        rows: [
          ['Employee payroll (TDA/457/Roth/HSA)', money(bp.wealth.employeePayroll)],
          ['Investing from take-home', money(bp.wealth.fromTakeHome)],
          ['Employer Wealth Boost (memo)', money(bp.wealth.employerBoost)],
        ],
        totalRow: ['Combined monthly wealth funding', money(bp.wealth.combinedTotal)],
        footerNote: `Employee wealth rate ${pct(bp.wealth.employeeWealthRate)} · total funding ${pct(bp.wealth.totalWealthFundingRate)} of take-home`,
      },
      {
        title: 'Every-Dollar Reconciliation',
        tone: 'blue',
        columns: [{ label: 'Flow', align: 'left' }, { label: 'Amount', align: 'right' }],
        rows: [
          ['Net take-home', money(bp.reconciliation.netIncome)],
          ['− Live', money(bp.reconciliation.live)],
          ['− Enjoy', money(bp.reconciliation.enjoy)],
          ['− Build Wealth (take-home)', money(bp.reconciliation.buildWealthFromTakeHome)],
          ['− Eliminate Debt', money(bp.reconciliation.eliminateDebt)],
        ],
        totalRow: ['Unallocated', money(bp.reconciliation.unallocated)],
      },
      {
        title: 'Debt Cash-Flow Release',
        tone: 'orange',
        columns: [{ label: 'Item', align: 'left' }, { label: 'Value', align: 'right' }],
        rows: [
          ['Settlement payment (baseline $888)', money(settlement.current.regularPayment)],
          ['Cash flow released to date', money(settlement.current.cashFlowReleased)],
          ['Reserved for future fees', money(settlement.current.reserveContribution)],
          ['New obligations (PSLF)', money(settlement.current.newObligations)],
          ['Net redirectable this month', money(settlement.current.netRedirectable)],
        ],
        footerNote: settlement.current.settlementFullyComplete
          ? 'Settlement fully complete'
          : `Next fee ${settlement.nextFee ? `${money(settlement.nextFee.amount)} due ${settlement.nextFee.date}` : '—'} · final fee ${settlement.finalFeeDate}`,
      },
    ],
    panels: [
      {
        title: 'Assumptions',
        tone: 'grey',
        items: [
          'Net pay $4,250.02 is AFTER taxes, benefits and payroll wealth contributions',
          `Payroll wealth (${money(bp.wealth.employeePayroll)}) counts toward the BUILD WEALTH target without being re-charged to net pay`,
          `Employer contributions (${money(bp.wealth.employerBoost)}) boost wealth analytics only — never spendable income`,
          'ENJOY is a ceiling, not a spending requirement — unused money redirects to debt or wealth',
          'Student loan: $0/mo through Dec 2026, then $390/mo PSLF from Jan 2027 (ELIMINATE DEBT, not LIVE)',
          'Settlement steps down $888 → $632 (Sep 26) → $583 (Oct 26) → $0 (Jan 27); fees Feb–Apr 2027 prefunded by reserve',
          'Targets are goals, not caps on necessities — LIVE above target reads "Above Target"',
        ],
      },
    ],
    commitment: {
      label: 'CORE RULE',
      text: 'Raises build wealth. Debt payoffs build wealth. Lower expenses build wealth. Unused Enjoy money can build wealth. Lifestyle inflation requires an intentional decision.',
    },
    disclaimer: 'For personal financial planning only · PrismMoney™ Money Blueprint',
    zoom: 0.66,
  };
}

export default function BlueprintExportButton({ snap, month }: { snap: MoneyPurposeSnapshot; month: string }) {
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null);

  const onPdf = () => {
    setBusy('pdf');
    try {
      const ok = printInfographic(buildBlueprintSpec(snap, month));
      if (!ok) toast.error('Popup blocked — allow popups to export the PDF');
      else toast.success('One-page PDF opened — choose "Save as PDF"');
    } finally {
      setBusy(null);
    }
  };

  const onPng = async () => {
    setBusy('png');
    let host: HTMLDivElement | null = null;
    try {
      const html = renderInfographic(buildBlueprintSpec(snap, month));
      const bodyHtml = html.split('<body>')[1]?.replace(/<\/body>\s*<\/html>\s*$/, '') ?? html;
      host = document.createElement('div');
      host.style.position = 'fixed';
      host.style.left = '-10000px';
      host.style.top = '0';
      host.style.width = '1100px';
      host.style.background = '#ffffff';
      host.innerHTML = bodyHtml;
      document.body.appendChild(host);
      const canvas = await html2canvas(host, { scale: 2, backgroundColor: '#ffffff', logging: false });
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `money-blueprint-${month}.png`;
      a.click();
      toast.success('PNG downloaded');
    } catch (e: any) {
      toast.error(e?.message || 'PNG export failed');
    } finally {
      host?.remove();
      setBusy(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" disabled={busy !== null}>
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onPng}>
          <ImageIcon className="mr-2 h-3.5 w-3.5" /> Shareable PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPdf}>
          <FileText className="mr-2 h-3.5 w-3.5" /> One-page PDF (with assumptions)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

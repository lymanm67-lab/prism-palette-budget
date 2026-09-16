import { useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ExecutionGuideDialog from './ExecutionGuideDialog';
import {
  buildExecutionGuide,
  SAMPLE_NOTICE,
  SAMPLE_TRADE,
  type GuideKind,
  type GuideTrade,
} from '@/lib/swingedge/thinkorswimGuide';

/**
 * "View step by step Thinkorswim guide" button.
 *
 * Pass the approved trade and the guide is built from those exact values. With no
 * trade it falls back to the sample training guide and says so, so nobody mistakes
 * practice numbers for their own plan.
 */
export default function ExecutionGuideButton({
  trade,
  kind,
  label = 'View step by step Thinkorswim guide',
  size = 'sm',
  variant = 'outline',
  className,
  disabled,
  paperTradeId,
  tradePlanId,
  executionTicketId,
}: {
  trade?: GuideTrade | null;
  kind?: GuideKind;
  label?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'outline' | 'secondary' | 'default' | 'ghost';
  className?: string;
  disabled?: boolean;
  paperTradeId?: string | null;
  tradePlanId?: string | null;
  executionTicketId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const usingSample = !trade;
  const guide = useMemo(() => buildExecutionGuide(trade ?? SAMPLE_TRADE, kind), [trade, kind]);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className ?? 'gap-2'}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <ClipboardList className="h-4 w-4" />
        {label}
      </Button>
      <ExecutionGuideDialog
        guide={guide}
        open={open}
        onOpenChange={setOpen}
        notice={usingSample ? SAMPLE_NOTICE : null}
        paperTradeId={paperTradeId}
        tradePlanId={tradePlanId}
        executionTicketId={executionTicketId}
      />
    </>
  );
}

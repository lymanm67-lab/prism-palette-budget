import { useCallback, useState } from 'react';
import { LayoutTemplate } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { printInfographic, type InfographicSpec } from '@/lib/reports/infographic';
import InfographicPreviewDialog from './InfographicPreviewDialog';

/**
 * Drop-in "Print Infographic" button for any report page.
 *
 * Pass a builder so the spec is only computed when the user actually clicks.
 * By default it opens a preview modal with Print / PDF / PNG options; set
 * `directPrint` to skip the modal and open the print window immediately.
 */
export default function PrintInfographicButton({
  buildSpec,
  label = 'Print Infographic',
  size,
  variant = 'outline',
  className,
  disabled,
  directPrint = false,
  filename,
}: {
  buildSpec: () => InfographicSpec | null;
  label?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'outline' | 'secondary' | 'default' | 'ghost';
  className?: string;
  disabled?: boolean;
  directPrint?: boolean;
  filename?: string;
}) {
  const [spec, setSpec] = useState<InfographicSpec | null>(null);
  const [open, setOpen] = useState(false);

  const handleClick = useCallback(() => {
    let next: InfographicSpec | null = null;
    try {
      next = buildSpec();
    } catch (e: any) {
      toast.error(e?.message || 'Could not build the infographic');
      return;
    }
    if (!next) {
      toast.error('Nothing to print yet — load the report data first');
      return;
    }
    if (directPrint) {
      if (!printInfographic(next)) toast.error('Allow pop-ups for this site to print the infographic');
      return;
    }
    setSpec(next);
    setOpen(true);
  }, [buildSpec, directPrint]);

  return (
    <>
      <Button variant={variant} size={size} onClick={handleClick} disabled={disabled} className={className ?? 'gap-2'}>
        <LayoutTemplate className="h-4 w-4" />
        {label}
      </Button>
      {!directPrint && (
        <InfographicPreviewDialog spec={spec} open={open} onOpenChange={setOpen} filename={filename} />
      )}
    </>
  );
}

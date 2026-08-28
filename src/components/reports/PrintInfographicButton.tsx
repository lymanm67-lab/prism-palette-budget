import { useCallback } from 'react';
import { LayoutTemplate } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { printInfographic, type InfographicSpec } from '@/lib/reports/infographic';

/**
 * Drop-in "Print Infographic" button for any report page.
 *
 * Pass a builder so the spec is only computed when the user actually prints.
 */
export default function PrintInfographicButton({
  buildSpec,
  label = 'Print Infographic',
  size,
  variant = 'outline',
  className,
  disabled,
}: {
  buildSpec: () => InfographicSpec | null;
  label?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'outline' | 'secondary' | 'default' | 'ghost';
  className?: string;
  disabled?: boolean;
}) {
  const handlePrint = useCallback(() => {
    let spec: InfographicSpec | null = null;
    try {
      spec = buildSpec();
    } catch (e: any) {
      toast.error(e?.message || 'Could not build the infographic');
      return;
    }
    if (!spec) {
      toast.error('Nothing to print yet — load the report data first');
      return;
    }
    if (!printInfographic(spec)) {
      toast.error('Allow pop-ups for this site to print the infographic');
    }
  }, [buildSpec]);

  return (
    <Button variant={variant} size={size} onClick={handlePrint} disabled={disabled} className={className ?? 'gap-2'}>
      <LayoutTemplate className="h-4 w-4" />
      {label}
    </Button>
  );
}

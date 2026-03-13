import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Trash2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Snapshot {
  id: string;
  calculator_type: string;
  label: string;
  inputs: Record<string, any>;
  results: Record<string, any>;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore?: (type: string, inputs: Record<string, any>) => void;
}

const TYPE_LABELS: Record<string, string> = {
  mortgage: 'Mortgage',
  auto: 'Auto Loan',
  creditcard: 'Credit Card',
  investment: 'Investment',
  debt: 'Debt Payoff',
  offers: 'Focus Offer',
  wealth: 'Wealth',
};

export default function CalculatorHistory({ open, onOpenChange, onRestore }: Props) {
  const { household } = useHousehold();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    if (!household?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('calculator_snapshots' as any)
      .select('*')
      .eq('household_id', household.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) setSnapshots(data as any);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetch();
  }, [open, household?.id]);

  const handleDelete = async (id: string) => {
    await supabase.from('calculator_snapshots' as any).delete().eq('id', id);
    setSnapshots(prev => prev.filter(s => s.id !== id));
    toast.success('Deleted');
  };

  const formatResult = (s: Snapshot) => {
    const r = s.results;
    if (s.calculator_type === 'mortgage' || s.calculator_type === 'auto') {
      return `$${Number(r.payment || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo`;
    }
    if (s.calculator_type === 'creditcard' || s.calculator_type === 'debt') {
      return `${r.months || 0} months`;
    }
    if (s.calculator_type === 'investment') {
      return `$${Number(r.finalBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
    return '';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Saved Calculations
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : snapshots.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No saved calculations yet. Use the Save button on any calculator result.
          </div>
        ) : (
          <div className="space-y-2 mt-4">
            {snapshots.map(s => (
              <div
                key={s.id}
                className="group flex items-center gap-3 rounded-lg border border-border/50 bg-gradient-to-br from-muted/40 to-muted/20 p-3 hover:border-primary/20 transition-colors"
              >
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { onRestore?.(s.calculator_type, s.inputs); onOpenChange(false); }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {TYPE_LABELS[s.calculator_type] || s.calculator_type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(s.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm font-medium mt-0.5 truncate">{formatResult(s)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {Object.entries(s.inputs).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(s.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

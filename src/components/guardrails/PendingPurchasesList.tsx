import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useCurrency } from '@/hooks/use-currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, X, ShoppingBag, Star } from 'lucide-react';
import { toast } from 'sonner';

function timeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Ready';
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hrs > 0) return `${hrs}h ${mins}m left`;
  return `${mins}m left`;
}

export function PendingPurchasesList() {
  const { household } = useHousehold();
  const { formatCurrency } = useCurrency();
  const qc = useQueryClient();

  const { data: items } = useQuery({
    queryKey: ['pending-purchases', household?.id],
    enabled: !!household,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guardrail_pending_purchases' as any)
        .select('*')
        .eq('household_id', household!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const resolve = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('guardrail_pending_purchases' as any)
        .update({ status, resolved_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pending-purchases'] });
      toast.success(vars.status === 'approved' ? 'Purchase approved' : 'Purchase cancelled');
    },
  });

  if (!items?.length) return null;

  return (
    <Card className="border-prism-orange/20">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-prism-orange" />
          Cooling-Off Purchases ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item: any) => {
          const ready = new Date(item.expires_at).getTime() <= Date.now();
          return (
            <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/40">
              <ShoppingBag className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.description || 'Unnamed purchase'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold">{formatCurrency(item.amount)}</span>
                  <Badge variant={ready ? 'default' : 'secondary'} className="text-[10px] h-4">
                    {timeLeft(item.expires_at)}
                  </Badge>
                  {item.multi_use_score && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Star className="h-3 w-3" /> {item.multi_use_score}/5 uses
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {ready && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-prism-teal" onClick={() => resolve.mutate({ id: item.id, status: 'approved' })}>
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7 text-prism-rose" onClick={() => resolve.mutate({ id: item.id, status: 'cancelled' })}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

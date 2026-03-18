import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';
import { useSubscriptionAlerts, useDismissAlert } from '@/hooks/use-subscription-alerts';
import { format, parseISO } from 'date-fns';

export function StillChargedAlerts() {
  const { data: alerts } = useSubscriptionAlerts();
  const dismiss = useDismissAlert();

  if (!alerts?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      {alerts.map((alert) => {
        const meta = (alert.metadata || {}) as Record<string, any>;
        return (
          <Card key={alert.id} className="border-prism-orange/40 bg-prism-orange/5">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-prism-orange shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-medium">{alert.message}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] bg-prism-orange/10 text-prism-orange border-prism-orange/30">
                    Still Being Charged
                  </Badge>
                  {meta.num_charges > 1 && (
                    <span className="text-[10px] text-muted-foreground">
                      {meta.num_charges} charges found
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => dismiss.mutate(alert.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </motion.div>
  );
}

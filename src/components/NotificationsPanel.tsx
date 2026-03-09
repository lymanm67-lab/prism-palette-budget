import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, TrendingUp, Target, Calendar, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

interface Insight {
  id: string;
  message: string;
  severity: string;
  insight_type: string;
  is_read: boolean;
  created_at: string;
  metadata?: any;
}

const severityIcon: Record<string, any> = {
  warning: AlertTriangle,
  info: TrendingUp,
  success: Target,
  default: Bell,
};

const severityColor: Record<string, string> = {
  warning: 'text-amber-500',
  info: 'text-blue-500',
  success: 'text-emerald-500',
  default: 'text-muted-foreground',
};

export default function NotificationsPanel() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!household) return;
    
    const fetchInsights = async () => {
      const { data } = await supabase
        .from('financial_insights')
        .select('*')
        .eq('household_id', household.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      setInsights((data as Insight[]) || []);
      setLoading(false);
    };
    
    fetchInsights();
    
    // Subscribe to new insights
    const channel = supabase
      .channel('insights')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'financial_insights',
        filter: `household_id=eq.${household.id}`,
      }, () => {
        fetchInsights();
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [household]);

  const unreadCount = insights.filter(i => !i.is_read).length;

  const markAsRead = async (id: string) => {
    await supabase
      .from('financial_insights')
      .update({ is_read: true })
      .eq('id', id);
    setInsights(prev => prev.map(i => i.id === id ? { ...i, is_read: true } : i));
  };

  const markAllRead = async () => {
    if (!household) return;
    await supabase
      .from('financial_insights')
      .update({ is_read: true })
      .eq('household_id', household.id)
      .eq('is_read', false);
    setInsights(prev => prev.map(i => ({ ...i, is_read: true })));
  };

  const dismissInsight = async (id: string) => {
    await supabase
      .from('financial_insights')
      .delete()
      .eq('id', id);
    setInsights(prev => prev.filter(i => i.id !== id));
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-xs bg-destructive text-destructive-foreground"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead}>
                Mark all read
              </Button>
            )}
          </div>
          <SheetDescription>
            Financial alerts, insights, and reminders
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-140px)] mt-4 -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : insights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No notifications yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                You'll see spending alerts and insights here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map((insight) => {
                const Icon = severityIcon[insight.severity] || severityIcon.default;
                const color = severityColor[insight.severity] || severityColor.default;
                
                return (
                  <div
                    key={insight.id}
                    className={`group relative rounded-lg border p-4 transition-colors ${
                      insight.is_read 
                        ? 'bg-background border-border' 
                        : 'bg-accent/50 border-accent'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`shrink-0 ${color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${insight.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {insight.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(insight.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!insight.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => markAsRead(insight.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => dismissInsight(insight.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

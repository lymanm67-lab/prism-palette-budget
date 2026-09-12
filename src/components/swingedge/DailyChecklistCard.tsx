import { toast } from 'sonner';
import { ListChecks } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useDailyChecklist } from '@/hooks/use-swingedge-training';
import { CHECKLIST_ITEMS, checklistProgress } from '@/lib/swingedge/training';

/** Five questions to answer before the first plan of the day. */
export default function DailyChecklistCard() {
  const { state, complete, save, isSaving } = useDailyChecklist();
  const progress = checklistProgress(state);

  const toggle = async (key: keyof typeof state, value: boolean) => {
    try {
      await save({ [key]: value });
    } catch {
      toast.error('Could not save that');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <ListChecks className="h-4 w-4 text-prism-teal" />
          Before you plan today
          <Badge
            variant="outline"
            className={
              complete
                ? 'border-prism-lime/50 bg-prism-lime/10 text-prism-lime text-[10px]'
                : 'text-[10px]'
            }
          >
            {complete ? 'All five done' : `${progress}%`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={progress} className="h-1.5" />
        <div className="space-y-3">
          {CHECKLIST_ITEMS.map((item) => (
            <label key={item.key} className="flex cursor-pointer gap-3">
              <Checkbox
                checked={state[item.key]}
                disabled={isSaving}
                onCheckedChange={(v) => toggle(item.key, v === true)}
                className="mt-0.5"
              />
              <span className="space-y-0.5">
                <span className="block text-sm">{item.label}</span>
                <span className="block text-xs text-muted-foreground">{item.why}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          This resets each day. It is the same five questions every time, because the mistakes it prevents are
          the same five every time.
        </p>
      </CardContent>
    </Card>
  );
}

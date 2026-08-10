import { Card, CardContent } from '@/components/ui/card';
import { Compass } from 'lucide-react';

/** Section 24: the core dashboard message. */
export default function HealthMissionBanner() {
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
      <CardContent className="flex gap-4 p-5">
        <Compass className="mt-1 h-6 w-6 shrink-0 text-primary" />
        <div className="space-y-2">
          <p className="text-sm leading-relaxed text-foreground sm:text-base">
            “My goal is not simply to reach 175 pounds. My goal is to create the strength, habits, health,
            mobility, clarity, financial stability, relationships, purpose, and faith that allow me to live
            fully for decades to come.”
          </p>
          <p className="text-sm font-semibold text-primary">175 is a milestone. Healthspan is the mission.</p>
        </div>
      </CardContent>
    </Card>
  );
}

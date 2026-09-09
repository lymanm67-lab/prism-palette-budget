import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import { savingsStory } from '@/lib/freed-cash/reality';

interface Props {
  year: number;
  realizedInYear: number;
  runRate: number;
  pipeline: number;
}

/** Plain-language explanation of why realized savings differ from the forward rate. */
export function SavingsStoryCard({ year, realizedInYear, runRate, pipeline }: Props) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4 text-primary" />
          Your {year} savings story
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {savingsStory(year, realizedInYear, runRate, pipeline)}
        </p>
      </CardContent>
    </Card>
  );
}

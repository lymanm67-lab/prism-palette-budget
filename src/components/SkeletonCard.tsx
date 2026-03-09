import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonCardProps {
  className?: string;
  showHeader?: boolean;
  lines?: number;
}

export const SkeletonCard = ({ className, showHeader = true, lines = 3 }: SkeletonCardProps) => {
  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
      )}
      <CardContent className={showHeader ? '' : 'pt-6'}>
        <div className="space-y-3">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" style={{ width: `${100 - i * 15}%` }} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const SkeletonChart = ({ className }: { className?: string }) => {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-6 w-1/4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
};

export const SkeletonTable = ({ rows = 5 }: { rows?: number }) => {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-10 flex-1" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 w-24" />
          <Skeleton className="h-12 w-24" />
        </div>
      ))}
    </div>
  );
};

import { Link } from 'react-router-dom';
import { ArrowRight, Layers } from 'lucide-react';

export function FiveBucketLink({ note }: { note: string }) {
  return (
    <Link to="/planning/five-bucket"
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/40 p-3 text-sm hover:bg-muted/50 transition-colors print:hidden">
      <span className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-prism-teal" />
        <span><strong>Five-Bucket Wealth Plan</strong> <span className="text-muted-foreground">- {note}</span></span>
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

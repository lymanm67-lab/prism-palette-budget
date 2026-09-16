import { Badge } from '@/components/ui/badge';
import type { ConditionalOrderPreview } from '@/lib/swingedge/conditionalOrder';

/**
 * The order the user will type into Thinkorswim, in Thinkorswim's own shorthand.
 * Every figure comes from the plan above it.
 */
export default function ConditionalOrderPreviewCard({ preview }: { preview: ConditionalOrderPreview }) {
  return (
    <div className="space-y-3 rounded-lg border border-prism-teal/40 bg-prism-teal/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Thinkorswim order preview
      </p>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Parent order</p>
        <p className="font-mono text-sm font-semibold">{preview.parent.text}</p>
        {preview.parent.note ? <p className="text-xs text-muted-foreground">{preview.parent.note}</p> : null}
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Submit when</p>
        <ul className="space-y-0.5 font-mono text-sm">
          {preview.submitWhen.map((s, i) => (
            <li key={s}>
              {i > 0 ? <span className="text-muted-foreground">AND </span> : null}
              {s}
            </li>
          ))}
        </ul>
        <Badge variant="outline" className="mt-1 text-[10px]">
          {preview.logic}
        </Badge>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Then</p>
        <p className="font-mono text-sm font-semibold">{preview.then}</p>
        <ul className="mt-1 space-y-0.5 font-mono text-sm">
          {preview.oco.map((o, i) => (
            <li key={`${o.text}-${i}`}>
              {o.text}
              {o.note ? <span className="ml-2 font-sans text-xs text-muted-foreground">{o.note}</span> : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

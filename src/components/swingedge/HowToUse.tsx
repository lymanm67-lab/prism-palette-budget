import { Lightbulb } from 'lucide-react';
import CollapsibleSection from '@/components/swingedge/CollapsibleSection';

interface Props {
  /** Numbered walkthrough: do this, then this. */
  steps: string[];
  /** Optional short reminders shown under the steps. */
  tips?: string[];
  title?: string;
  description?: string;
  /** Stable collapse id; defaults to the title. */
  id?: string;
  defaultOpen?: boolean;
}

/**
 * Plain-language "how to use this screen" panel shared by every SwingEdge page,
 * so the instructions live next to the tool instead of in a separate manual.
 * Collapses to a single header row so it never eats the page.
 */
export default function HowToUse({
  steps,
  tips,
  title = 'How to use this screen',
  description = 'Follow these steps in order the first few times.',
  id,
  defaultOpen = false,
}: Props) {
  return (
    <CollapsibleSection
      id={id ?? `how-to-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
      title={title}
      description={description}
      defaultOpen={defaultOpen}
      className="border-prism-teal/30"
    >
      <div className="space-y-4 pt-1">
        <ol className="space-y-2 text-sm">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-prism-teal/15 text-xs font-semibold text-prism-teal">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        {tips && tips.length > 0 ? (
          <div className="space-y-2 rounded-lg bg-muted/50 p-3">
            {tips.map((tip) => (
              <p key={tip} className="flex gap-2 text-xs text-muted-foreground">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-prism-amber" />
                <span>{tip}</span>
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </CollapsibleSection>
  );
}

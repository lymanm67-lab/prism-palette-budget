import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isBlankValue } from '@/lib/contentKeys';
import { defaultFor, kindFor } from '@/lib/siteContent';
import { useSaveContent, useSiteContent } from '@/hooks/useSiteContent';
import { useEditMode } from '@/components/editor/EditModeContext';

type EditableTextProps = {
  /** Fully-qualified content key, e.g. `hero.headline`. */
  contentKey: string;
  /** The original hardcoded copy (used when nothing is saved). */
  fallback?: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  /** Optional rich fallback markup, used only when nothing is saved. */
  children?: React.ReactNode;
};

const EditableText = ({
  contentKey,
  fallback,
  as = 'span',
  className,
  children,
}: EditableTextProps) => {
  const { map } = useSiteContent();
  const { editing } = useEditMode();
  const save = useSaveContent();
  const ref = useRef<HTMLElement>(null);
  const [dirty, setDirty] = useState(false);

  const saved = map[contentKey];
  const hasSaved = !isBlankValue(saved);
  const original = fallback ?? defaultFor(contentKey);
  const text = hasSaved ? String(saved) : original;

  // Keep the DOM in sync when the saved value changes externally.
  useEffect(() => {
    if (ref.current && !dirty && editing) ref.current.textContent = text;
  }, [text, editing, dirty]);

  const Tag = as as React.ElementType;

  if (!editing) {
    return <Tag className={className}>{!hasSaved && children ? children : text}</Tag>;
  }

  const commit = () => {
    const next = (ref.current?.textContent ?? '').trim();
    setDirty(false);
    if (next === text) return;
    if (!next) {
      if (ref.current) ref.current.textContent = text;
      toast.error('Copy cannot be empty. Use the Content Editor to reset it instead.');
      return;
    }
    save.mutate(
      { key: contentKey, value: next, kind: kindFor(contentKey) },
      {
        onSuccess: () => toast.success('Saved'),
        onError: (e) => toast.error(`Could not save: ${(e as Error).message}`),
      },
    );
  };

  return (
    <Tag
      ref={ref as never}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      title={`Editing ${contentKey} — Esc to cancel`}
      onInput={() => setDirty(true)}
      onBlur={commit}
      onClick={(e: React.MouseEvent) => {
        // Don't let clicks inside buttons/links navigate while editing.
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          if (ref.current) ref.current.textContent = text;

          setDirty(false);
          ref.current?.blur();
        }
        if (e.key === 'Enter' && as !== 'p' && as !== 'div') {
          e.preventDefault();
          ref.current?.blur();
        }
      }}
      className={cn(
        className,
        'outline-none rounded-sm ring-1 ring-dashed ring-accent/60 hover:ring-accent focus:ring-2 focus:ring-accent cursor-text transition-shadow',
        dirty && 'ring-2 ring-primary',
      )}
    >
      {text}
    </Tag>
  );
};

export default EditableText;

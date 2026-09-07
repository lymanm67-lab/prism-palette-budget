import { forwardRef, useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Pencil } from 'lucide-react';

interface InlineEditCellProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  type?: 'text' | 'number' | 'date';
  className?: string;
  formatter?: (value: string) => string;
  placeholder?: string;
  showEditIcon?: boolean;
}

const InlineEditCell = forwardRef<HTMLSpanElement, InlineEditCellProps>(function InlineEditCell({
  value,
  onSave,
  type = 'text',
  className,
  formatter,
  placeholder = 'Click to edit',
  showEditIcon = false,
}, ref) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }
    
    setSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (e) {
      setEditValue(value); // Revert on error
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <span ref={ref} className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={saving}
          className={cn(
            'h-7 px-2 py-1 text-sm',
            type === 'number' && 'w-24',
            type === 'date' && 'w-32',
            className
          )}
        />
      </span>
    );
  }

  const displayValue = formatter ? formatter(value) : value;

  return (
    <span ref={ref} className="inline-flex items-center gap-1">
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title="Edit"
      aria-label={`Edit ${displayValue || placeholder}`}
      onClick={() => setIsEditing(true)}
      className={cn(
        'h-auto min-h-7 justify-start gap-1 px-1 py-0.5 -mx-1 text-left font-inherit',
        !value && 'text-muted-foreground italic',
        className
      )}
    >
      {displayValue || placeholder}
      {showEditIcon && <Pencil className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </Button>
    </span>
  );
});

InlineEditCell.displayName = 'InlineEditCell';

export default InlineEditCell;

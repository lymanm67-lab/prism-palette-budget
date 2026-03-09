import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

interface InlineEditCellProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  type?: 'text' | 'number' | 'date';
  className?: string;
  formatter?: (value: string) => string;
  placeholder?: string;
}

export default function InlineEditCell({
  value,
  onSave,
  type = 'text',
  className,
  formatter,
  placeholder = 'Click to edit',
}: InlineEditCellProps) {
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
      <div className="flex items-center gap-1">
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
      </div>
    );
  }

  const displayValue = formatter ? formatter(value) : value;

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={cn(
        'text-left px-1 py-0.5 -mx-1 rounded hover:bg-muted/50 transition-colors cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        !value && 'text-muted-foreground italic',
        className
      )}
    >
      {displayValue || placeholder}
    </button>
  );
}

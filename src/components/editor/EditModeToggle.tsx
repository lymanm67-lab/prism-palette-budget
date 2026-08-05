import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Pencil, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEditMode } from '@/components/editor/EditModeContext';

/**
 * Floating admin-only edit controls.
 * Collapsed to a small pill by default so it never covers page content,
 * and lifted above the mobile bottom nav / safe area.
 */
const EditModeToggle = () => {
  const { canEdit, editing, toggleEditing } = useEditMode();
  const [open, setOpen] = useState(false);

  if (!canEdit) return null;

  return (
    <div
      className={cn(
        'fixed left-2 z-[60] flex items-center gap-2 print:hidden',
        'bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-4 md:left-4',
      )}
    >
      {!open && !editing ? (
        <Button
          size="icon"
          variant="secondary"
          onClick={() => setOpen(true)}
          aria-label="Show page editing controls"
          className="h-9 w-9 rounded-full opacity-60 shadow-lg backdrop-blur transition-opacity hover:opacity-100"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ) : (
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/85 p-1 shadow-lg backdrop-blur">
          <Button
            size="sm"
            variant={editing ? 'default' : 'ghost'}
            onClick={toggleEditing}
            className="h-8 gap-2 rounded-full"
          >
            {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            {editing ? 'Done' : 'Edit page'}
          </Button>
          <Button
            asChild
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full"
            title="Open the full Content Editor in a new tab"
          >
            <Link
              to="/admin/content-editor"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open the full Content Editor in a new tab"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          {!editing && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setOpen(false)}
              aria-label="Hide page editing controls"
              className="h-8 w-8 rounded-full"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EditModeToggle;

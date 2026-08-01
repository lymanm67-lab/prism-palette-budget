import { Link } from 'react-router-dom';
import { Pencil, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditMode } from '@/components/editor/EditModeContext';

/** Floating admin-only edit controls, bottom-left. Hidden for everyone else. */
const EditModeToggle = () => {
  const { canEdit, editing, toggleEditing } = useEditMode();

  if (!canEdit) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[60] flex items-center gap-2 print:hidden">
      <Button
        size="sm"
        variant={editing ? 'default' : 'secondary'}
        onClick={toggleEditing}
        className="gap-2 shadow-lg"
      >
        {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        {editing ? 'Done editing' : 'Edit page'}
      </Button>
      <Button asChild size="icon" variant="secondary" className="shadow-lg" title="Content Editor">
        <Link to="/admin/content-editor" aria-label="Open the full Content Editor">
          <Settings className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
};

export default EditModeToggle;

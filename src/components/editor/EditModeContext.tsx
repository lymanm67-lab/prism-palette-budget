import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type EditModeContextValue = {
  /** True only for signed-in admins/founders. */
  canEdit: boolean;
  /** True when the admin has actively switched editing on. */
  editing: boolean;
  setEditing: (value: boolean) => void;
  toggleEditing: () => void;
};

const EditModeContext = createContext<EditModeContextValue>({
  canEdit: false,
  editing: false,
  setEditing: () => {},
  toggleEditing: () => {},
});

const STORAGE_KEY = 'prism_edit_mode';

export const EditModeProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [editing, setEditingState] = useState(false);

  const { data: canEdit = false } = useQuery({
    queryKey: ['is-content-admin', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id);
      if (error) return false;
      return (data ?? []).some((r) => r.role === 'admin' || r.role === 'founder');
    },
  });

  // Restore the toggle only once we know the user is allowed to edit.
  useEffect(() => {
    if (!canEdit) {
      setEditingState(false);
      return;
    }
    setEditingState(sessionStorage.getItem(STORAGE_KEY) === '1');
  }, [canEdit]);

  const setEditing = useCallback(
    (value: boolean) => {
      if (!canEdit) return;
      setEditingState(value);
      sessionStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    },
    [canEdit],
  );

  const value = useMemo<EditModeContextValue>(
    () => ({
      canEdit,
      editing: canEdit && editing,
      setEditing,
      toggleEditing: () => setEditing(!editing),
    }),
    [canEdit, editing, setEditing],
  );

  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>;
};

export const useEditMode = () => useContext(EditModeContext);

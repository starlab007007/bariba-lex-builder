import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useEditorRole() {
  const { user, isAdmin } = useAuth();
  const [isEditor, setIsEditor] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsEditor(false);
      setLoading(false);
      return;
    }

    // Admins are implicitly editors
    if (isAdmin) {
      setIsEditor(true);
      setLoading(false);
      return;
    }

    const checkEditor = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'editor')
          .maybeSingle();

        if (error) {
          console.error('Error checking editor role:', error);
          return;
        }
        setIsEditor(!!data);
      } catch (e) {
        console.error('Error checking editor role:', e);
      } finally {
        setLoading(false);
      }
    };

    checkEditor();
  }, [user, isAdmin]);

  return { isEditor, isEditorLoading: loading };
}

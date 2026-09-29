import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useTeacherRole() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [isTeacher, setIsTeacher] = useState(false);
  // Identifiant pour lequel le rôle a été vérifié : tant qu'il diffère de l'utilisateur courant, on reste en chargement
  // (évite une redirection prématurée vers l'accueil au rechargement de /teacher).
  const [checkedFor, setCheckedFor] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    async function check() {
      if (!user) {
        setIsTeacher(false);
        setCheckedFor('anonymous');
        return;
      }
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['teacher', 'admin']);
      if (cancelled) return;
      if (error) console.warn('useTeacherRole', error);
      setIsTeacher((data ?? []).length > 0);
      setCheckedFor(user.id);
    }
    void check();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  const loading = authLoading || checkedFor !== (user ? user.id : 'anonymous');
  return { isTeacher: isTeacher || isAdmin, loading };
}

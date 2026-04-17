import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useTeacherRole() {
  const { user, isAdmin } = useAuth();
  const [isTeacher, setIsTeacher] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!user) {
        setIsTeacher(false);
        setLoading(false);
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
      setLoading(false);
    }
    void check();
    return () => { cancelled = true; };
  }, [user]);

  return { isTeacher: isTeacher || isAdmin, loading };
}

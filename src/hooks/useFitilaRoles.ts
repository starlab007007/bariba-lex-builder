import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type FitilaRole = 'admin' | 'user' | 'editor' | 'teacher' | 'voice_speaker' | 'voice_reviewer';

export function useFitilaRoles() {
  const { user, isAdmin } = useAuth();
  const [roles, setRoles] = useState<FitilaRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void supabase.from('user_roles').select('role').eq('user_id', user.id).then(({ data }) => {
      if (cancelled) return;
      const next = new Set<FitilaRole>((data ?? []).map(r => r.role as FitilaRole));
      if (isAdmin) next.add('admin');
      if (next.size === 0) next.add('user');
      setRoles([...next]);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user, isAdmin]);

  return useMemo(() => ({
    roles,
    loading,
    speaker: roles.includes('voice_speaker') || roles.includes('admin'),
    reviewer: roles.includes('voice_reviewer') || roles.includes('admin'),
    teacher: roles.includes('teacher') || roles.includes('admin'),
    editor: roles.includes('editor') || roles.includes('admin'),
    admin: roles.includes('admin'),
  }), [roles, loading]);
}

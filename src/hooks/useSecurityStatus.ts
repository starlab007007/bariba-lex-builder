import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useSecurityStatus() {
  const { user } = useAuth();
  const [hasSecuritySetup, setHasSecuritySetup] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHasSecuritySetup(null);
      setLoading(false);
      return;
    }

    const check = async () => {
      try {
        const { data, error } = await supabase
          .from('security_answers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        setHasSecuritySetup(!error && !!data);
      } catch {
        setHasSecuritySetup(false);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [user]);

  return { hasSecuritySetup, loading, refetch: () => {
    setLoading(true);
    if (!user) return;
    supabase
      .from('security_answers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        setHasSecuritySetup(!error && !!data);
        setLoading(false);
      });
  }};
}

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUpdateActivity = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const updateActivity = async () => {
      if (document.hidden) return;
      await supabase
        .from('profiles')
        .update({ ultima_atividade: new Date().toISOString() })
        .eq('id', user.id);
    };

    updateActivity();
    const interval = setInterval(updateActivity, 300000); // 5 min

    return () => clearInterval(interval);
  }, [user?.id]);
};

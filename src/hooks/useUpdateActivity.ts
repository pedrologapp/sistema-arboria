import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUpdateActivity = () => {
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user?.id) return;
    
    const updateActivity = async () => {
      await supabase
        .from('profiles')
        .update({ ultima_atividade: new Date().toISOString() })
        .eq('id', user.id);
    };
    
    // Atualizar agora
    updateActivity();
    
    // Atualizar a cada 1 minuto
    const interval = setInterval(updateActivity, 60000);
    
    return () => clearInterval(interval);
  }, [user?.id]);
};

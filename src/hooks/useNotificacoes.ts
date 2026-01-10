import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { useAuth } from '@/contexts/AuthContext';

export const useNotificacoes = () => {
  const { user } = useAuth();
  const { profile, casa } = useStudent();
  const queryClient = useQueryClient();

  // 1. Contar missões pendentes (não entregues, dentro do prazo)
  const { data: missoesPendentes = 0 } = useQuery({
    queryKey: ['count-missoes-pendentes', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { data, error } = await supabase.rpc('get_missoes_do_aluno', {
        p_aluno_id: user.id,
      });
      
      if (error || !data) return 0;
      
      // Filtrar: não entregou E não está atrasada
      const pendentes = data.filter((m: any) => 
        !m.ja_entregou && !m.atrasada
      );
      
      return pendentes.length;
    },
    enabled: !!user?.id,
    staleTime: 60000,
    refetchInterval: 120000,
  });

  // 2. Contar mensagens não lidas nos canais
  const { data: canaisNaoLidos = 0 } = useQuery({
    queryKey: ['count-canais-nao-lidos', profile?.id, casa?.id],
    queryFn: async () => {
      if (!profile?.id || !casa?.id) return 0;
      
      // Buscar canais da casa
      const { data: canais } = await supabase
        .from('canais_casa')
        .select('id')
        .eq('casa_id', casa.id);
      
      if (!canais?.length) return 0;
      
      // Buscar última leitura do usuário
      const { data: leituras } = await supabase
        .from('canal_leituras')
        .select('canal_id, ultima_leitura')
        .eq('usuario_id', profile.id);
      
      let total = 0;
      
      for (const canal of canais) {
        const leitura = leituras?.find(l => l.canal_id === canal.id);
        const ultimaLeitura = leitura?.ultima_leitura || '1970-01-01';
        
        const { count } = await supabase
          .from('mensagens_canal')
          .select('*', { count: 'exact', head: true })
          .eq('canal_id', canal.id)
          .gt('created_at', ultimaLeitura)
          .neq('autor_id', profile.id);
        
        total += count || 0;
      }
      
      return total;
    },
    enabled: !!profile?.id && !!casa?.id,
    staleTime: 30000,
  });

  // 3. Contar DMs não lidas
  const { data: dmsNaoLidas = 0 } = useQuery({
    queryKey: ['count-dms-nao-lidas', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      
      const { data: participacoes } = await supabase
        .from('conversa_participantes')
        .select(`
          conversa_id,
          ultima_leitura,
          conversa:conversas_privadas(updated_at)
        `)
        .eq('usuario_id', profile.id);
      
      if (!participacoes) return 0;
      
      let count = 0;
      for (const p of participacoes) {
        const ultimaLeitura = new Date(p.ultima_leitura || '1970-01-01');
        const conversaData = p.conversa as { updated_at: string | null } | null;
        const ultimaMsg = new Date(conversaData?.updated_at || '1970-01-01');
        
        if (ultimaMsg > ultimaLeitura) {
          count++;
        }
      }
      
      return count;
    },
    enabled: !!profile?.id,
    staleTime: 30000,
  });

  // Real-time: escutar novas mensagens
  useEffect(() => {
    if (!profile?.id) return;
    
    const channel = supabase
      .channel('nav-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens_canal'
      }, (payload) => {
        if (payload.new.autor_id !== profile.id) {
          queryClient.invalidateQueries({ queryKey: ['count-canais-nao-lidos'] });
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens_privadas'
      }, (payload) => {
        if (payload.new.autor_id !== profile.id) {
          queryClient.invalidateQueries({ queryKey: ['count-dms-nao-lidas'] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  return {
    missoesPendentes,
    mensagensNaoLidas: canaisNaoLidos + dmsNaoLidas,
  };
};

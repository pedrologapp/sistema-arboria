import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { useAuth } from '@/contexts/AuthContext';

export interface NotificacoesPorFase {
  faseId: string;
  pendentes: number;
  aprovadas: number;
}

export interface NotificacoesPorSemana {
  faseId: string;
  semana: number;
  pendentes: number;
  aprovadas: number;
}

export const useNotificacoes = () => {
  const { user } = useAuth();
  const { profile, casa } = useStudent();
  const queryClient = useQueryClient();

  // 1. Contar missões pendentes (não entregues ou reprovadas, dentro do prazo)
  const { data: missoesPendentes = 0 } = useQuery({
    queryKey: ['count-missoes-pendentes', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { data, error } = await supabase.rpc('get_missoes_do_aluno', {
        p_aluno_id: user.id,
      });
      
      if (error || !data) return 0;
      
      // Filtrar: não entregou E não está atrasada OU status = 'refazer'
      const pendentes = data.filter((m: any) => 
        (!m.ja_entregou && !m.atrasada) || m.status_entrega === 'refazer'
      );
      
      return pendentes.length;
    },
    enabled: !!user?.id,
    staleTime: 60000,
    refetchInterval: 120000,
  });

  // 2. Contar aprovadas não visualizadas
  const { data: aprovadasNaoVistas = 0 } = useQuery({
    queryKey: ['count-aprovadas-nao-vistas', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { count, error } = await supabase
        .from('entregas')
        .select('*', { count: 'exact', head: true })
        .eq('aluno_id', user.id)
        .eq('status', 'aprovada')
        .eq('visualizada_pelo_aluno', false);
      
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 30000,
    refetchInterval: 120000,
  });

  // 3. Notificações detalhadas por fase
  const { data: notificacoesPorFase = [] } = useQuery<NotificacoesPorFase[]>({
    queryKey: ['notificacoes-por-fase', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Buscar missões do aluno
      const { data: missoes, error: missaoError } = await supabase.rpc('get_missoes_do_aluno', {
        p_aluno_id: user.id,
      });
      
      if (missaoError || !missoes) return [];
      
      // Buscar entregas aprovadas não vistas
      const { data: entregasAprovadas } = await supabase
        .from('entregas')
        .select('missao_id')
        .eq('aluno_id', user.id)
        .eq('status', 'aprovada')
        .eq('visualizada_pelo_aluno', false);
      
      // Buscar info de fase de cada missão
      const missaoIds = missoes.map((m: any) => m.id);
      if (missaoIds.length === 0) return [];
      
      const { data: missaoFases } = await supabase
        .from('missoes')
        .select('id, fase_id')
        .in('id', missaoIds);
      
      // Agrupar por fase_id
      const faseMap = new Map<string, NotificacoesPorFase>();
      
      for (const m of missoes) {
        const mf = missaoFases?.find(mf => mf.id === m.id);
        if (!mf?.fase_id) continue;
        
        if (!faseMap.has(mf.fase_id)) {
          faseMap.set(mf.fase_id, { faseId: mf.fase_id, pendentes: 0, aprovadas: 0 });
        }
        
        const entry = faseMap.get(mf.fase_id)!;
        
        // Pendente: não entregou ou precisa refazer
        if ((!m.ja_entregou && !m.atrasada) || m.status_entrega === 'refazer') {
          entry.pendentes++;
        }
        
        // Aprovada não vista
        if (entregasAprovadas?.some(e => e.missao_id === m.id)) {
          entry.aprovadas++;
        }
      }
      
      return Array.from(faseMap.values());
    },
    enabled: !!user?.id,
    staleTime: 60000,
    refetchInterval: 120000,
  });

  // 4. Notificações detalhadas por semana
  const { data: notificacoesPorSemana = [] } = useQuery<NotificacoesPorSemana[]>({
    queryKey: ['notificacoes-por-semana', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Buscar missões do aluno
      const { data: missoes, error: missaoError } = await supabase.rpc('get_missoes_do_aluno', {
        p_aluno_id: user.id,
      });
      
      if (missaoError || !missoes) return [];
      
      // Buscar entregas aprovadas não vistas
      const { data: entregasAprovadas } = await supabase
        .from('entregas')
        .select('missao_id')
        .eq('aluno_id', user.id)
        .eq('status', 'aprovada')
        .eq('visualizada_pelo_aluno', false);
      
      // Buscar info de fase e semana de cada missão
      const missaoIds = missoes.map((m: any) => m.id);
      if (missaoIds.length === 0) return [];
      
      const { data: missaoInfo } = await supabase
        .from('missoes')
        .select('id, fase_id, semana')
        .in('id', missaoIds);
      
      // Agrupar por fase_id + semana
      const semanaMap = new Map<string, NotificacoesPorSemana>();
      
      for (const m of missoes) {
        const mi = missaoInfo?.find(mi => mi.id === m.id);
        if (!mi?.fase_id || mi.semana == null) continue;
        
        const key = `${mi.fase_id}_${mi.semana}`;
        
        if (!semanaMap.has(key)) {
          semanaMap.set(key, { 
            faseId: mi.fase_id, 
            semana: mi.semana, 
            pendentes: 0, 
            aprovadas: 0 
          });
        }
        
        const entry = semanaMap.get(key)!;
        
        // Pendente: não entregou ou precisa refazer
        if ((!m.ja_entregou && !m.atrasada) || m.status_entrega === 'refazer') {
          entry.pendentes++;
        }
        
        // Aprovada não vista
        if (entregasAprovadas?.some(e => e.missao_id === m.id)) {
          entry.aprovadas++;
        }
      }
      
      return Array.from(semanaMap.values());
    },
    enabled: !!user?.id,
    staleTime: 60000,
    refetchInterval: 120000,
  });

  // 5. Contar mensagens não lidas nos canais
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

  // 6. Contar DMs não lidas
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

  // Real-time: escutar novas mensagens e entregas
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
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'entregas'
      }, () => {
        // Invalidar caches de notificações de missões quando entregas são atualizadas
        queryClient.invalidateQueries({ queryKey: ['count-aprovadas-nao-vistas'] });
        queryClient.invalidateQueries({ queryKey: ['notificacoes-por-fase'] });
        queryClient.invalidateQueries({ queryKey: ['notificacoes-por-semana'] });
        queryClient.invalidateQueries({ queryKey: ['count-missoes-pendentes'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  // Helpers para buscar notificações específicas
  const getNotificacoesFase = (faseId: string): NotificacoesPorFase | null => {
    return notificacoesPorFase.find(n => n.faseId === faseId) || null;
  };

  const getNotificacoesSemana = (faseId: string, semana: number): NotificacoesPorSemana | null => {
    return notificacoesPorSemana.find(n => n.faseId === faseId && n.semana === semana) || null;
  };

  return {
    missoesPendentes,
    aprovadasNaoVistas,
    mensagensNaoLidas: canaisNaoLidos + dmsNaoLidas,
    notificacoesPorFase,
    notificacoesPorSemana,
    getNotificacoesFase,
    getNotificacoesSemana,
    // Total de notificações de missões para o badge na nav
    totalMissoesNotificacoes: missoesPendentes + aprovadasNaoVistas,
  };
};

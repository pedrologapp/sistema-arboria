import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
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

  // === QUERY 1: Missões do aluno (chamada UMA vez, derivamos tudo) ===
  const { data: missoesData } = useQuery({
    queryKey: ['notif-missoes', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Chama o RPC pesado UMA vez só (antes era chamado 2x) + entregas em paralelo
      const [missaoRes, aprovadasRes] = await Promise.all([
        supabase.rpc('get_missoes_do_aluno', { p_aluno_id: user.id }),
        supabase
          .from('entregas')
          .select('missao_id')
          .eq('aluno_id', user.id)
          .eq('status', 'aprovada')
          .eq('visualizada_pelo_aluno', false),
      ]);

      const missoes = missaoRes.data || [];

      // Info de fase/semana das mesmas missões (reaproveita os ids do RPC)
      let missaoInfo: { id: string; fase_id: string | null; semana: number | null }[] = [];
      if (missoes.length > 0) {
        const ids = missoes.map((m: { id: string }) => m.id);
        const { data } = await supabase.from('missoes').select('id, fase_id, semana').in('id', ids);
        missaoInfo = data || [];
      }

      return {
        missoes,
        aprovadas: aprovadasRes.data || [],
        missaoInfo,
      };
    },
    enabled: !!user?.id,
    staleTime: 120000,
    refetchInterval: 300000,
  });

  // Derivar todas as notificações de missões de uma única query
  const { missoesPendentes, aprovadasNaoVistas, notificacoesPorFase, notificacoesPorSemana } = useMemo(() => {
    if (!missoesData) return { missoesPendentes: 0, aprovadasNaoVistas: 0, notificacoesPorFase: [] as NotificacoesPorFase[], notificacoesPorSemana: [] as NotificacoesPorSemana[] };

    const { missoes, aprovadas, missaoInfo } = missoesData;
    const aprovadasSet = new Set(aprovadas.map(a => a.missao_id));

    let pendentes = 0;
    const faseMap = new Map<string, NotificacoesPorFase>();
    const semanaMap = new Map<string, NotificacoesPorSemana>();

    for (const m of missoes) {
      const isPendente = (!m.ja_entregou && !m.atrasada) || m.status_entrega === 'refazer';
      const isAprovada = aprovadasSet.has(m.id);
      const info = missaoInfo.find((mi: any) => mi.id === m.id);

      if (isPendente) pendentes++;

      if (info?.fase_id) {
        // Por fase
        if (!faseMap.has(info.fase_id)) {
          faseMap.set(info.fase_id, { faseId: info.fase_id, pendentes: 0, aprovadas: 0 });
        }
        const fEntry = faseMap.get(info.fase_id)!;
        if (isPendente) fEntry.pendentes++;
        if (isAprovada) fEntry.aprovadas++;

        // Por semana
        if (info.semana != null) {
          const key = `${info.fase_id}_${info.semana}`;
          if (!semanaMap.has(key)) {
            semanaMap.set(key, { faseId: info.fase_id, semana: info.semana, pendentes: 0, aprovadas: 0 });
          }
          const sEntry = semanaMap.get(key)!;
          if (isPendente) sEntry.pendentes++;
          if (isAprovada) sEntry.aprovadas++;
        }
      }
    }

    return {
      missoesPendentes: pendentes,
      aprovadasNaoVistas: aprovadas.length,
      notificacoesPorFase: Array.from(faseMap.values()),
      notificacoesPorSemana: Array.from(semanaMap.values()),
    };
  }, [missoesData]);

  // === QUERY 2: Mensagens não lidas (canais + DMs em UMA query cada, sem N+1) ===
  const { data: mensagensNaoLidas = 0 } = useQuery({
    queryKey: ['notif-mensagens', profile?.id, casa?.id, profile?.institution_id],
    queryFn: async () => {
      if (!profile?.id || !casa?.id || !profile?.institution_id) return 0;

      // Buscar canais e leituras em paralelo
      const [canaisCasaRes, canaisEscolaRes, leiturasRes, participacoesRes] = await Promise.all([
        supabase.from('canais_casa').select('id').eq('casa_id', casa.id),
        supabase.from('canais_casa').select('id').eq('institution_id', profile.institution_id).in('tipo', ['escola_avisos', 'conselho_lideres']),
        supabase.from('canal_leituras').select('canal_id, ultima_leitura').eq('usuario_id', profile.id),
        supabase.from('conversa_participantes').select('conversa_id, ultima_leitura, conversa:conversas_privadas(updated_at)').eq('usuario_id', profile.id),
      ]);

      // --- Canais não lidos (sem N+1) ---
      const todosCanais = [...(canaisCasaRes.data || []), ...(canaisEscolaRes.data || [])];
      const canaisUnicos = [...new Map(todosCanais.map(c => [c.id, c])).values()];

      let totalCanais = 0;
      if (canaisUnicos.length > 0) {
        const canalIds = canaisUnicos.map(c => c.id);
        const leituraMap = new Map((leiturasRes.data || []).map(l => [l.canal_id, l.ultima_leitura]));

        // Buscar TODAS as mensagens recentes dos canais em UMA query
        const minLeitura = [...leituraMap.values()].reduce((min, d) => d < min ? d : min, new Date().toISOString());
        const fallbackDate = leituraMap.size > 0 ? minLeitura : '1970-01-01';

        const { data: mensagensRecentes } = await supabase
          .from('mensagens_canal')
          .select('canal_id, created_at')
          .in('canal_id', canalIds)
          .gt('created_at', fallbackDate)
          .neq('autor_id', profile.id);

        // Contar por canal comparando com leitura individual
        if (mensagensRecentes) {
          for (const msg of mensagensRecentes) {
            const ultimaLeitura = leituraMap.get(msg.canal_id) || '1970-01-01';
            if (msg.created_at > ultimaLeitura) {
              totalCanais++;
            }
          }
        }
      }

      // --- DMs não lidas ---
      let totalDms = 0;
      if (participacoesRes.data) {
        for (const p of participacoesRes.data) {
          const ultimaLeitura = new Date(p.ultima_leitura || '1970-01-01');
          const conversaData = p.conversa as { updated_at: string | null } | null;
          const ultimaMsg = new Date(conversaData?.updated_at || '1970-01-01');
          if (ultimaMsg > ultimaLeitura) totalDms++;
        }
      }

      return totalCanais + totalDms;
    },
    enabled: !!profile?.id && !!casa?.id && !!profile?.institution_id,
    staleTime: 60000,
  });

  // Real-time: escutar novas mensagens e entregas
  // Real-time: escutar novas mensagens e entregas (com fallback se WebSocket falhar)
  useEffect(() => {
    if (!profile?.id) return;

    let channel: any = null;
    try {
      channel = supabase
        .channel('nav-notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_canal' }, (payload) => {
          if (payload.new.autor_id !== profile.id) {
            queryClient.invalidateQueries({ queryKey: ['notif-mensagens'] });
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_privadas' }, (payload) => {
          if (payload.new.autor_id !== profile.id) {
            queryClient.invalidateQueries({ queryKey: ['notif-mensagens'] });
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'entregas' }, () => {
          queryClient.invalidateQueries({ queryKey: ['notif-missoes'] });
        })
        .subscribe();
    } catch (err) {
      console.warn('[Notificacoes] WebSocket indisponível, usando polling:', err);
    }

    return () => { if (channel) try { supabase.removeChannel(channel); } catch {} };
  }, [profile?.id, queryClient]);

  const getNotificacoesFase = (faseId: string): NotificacoesPorFase | null => {
    return notificacoesPorFase.find(n => n.faseId === faseId) || null;
  };

  const getNotificacoesSemana = (faseId: string, semana: number): NotificacoesPorSemana | null => {
    return notificacoesPorSemana.find(n => n.faseId === faseId && n.semana === semana) || null;
  };

  return {
    missoesPendentes,
    aprovadasNaoVistas,
    mensagensNaoLidas,
    notificacoesPorFase,
    notificacoesPorSemana,
    getNotificacoesFase,
    getNotificacoesSemana,
    totalMissoesNotificacoes: missoesPendentes + aprovadasNaoVistas,
  };
};

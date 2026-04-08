import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseAppBadgeParams {
  userId: string | undefined;
  institutionId: string | undefined;
  role: 'professor' | 'user';
  casaMentorId?: number;
}

export const useAppBadge = ({ userId, institutionId, role, casaMentorId }: UseAppBadgeParams) => {

  const { data: badgeCount } = useQuery({
    queryKey: ['app-badge-count', userId, role, institutionId, casaMentorId],
    queryFn: async () => {
      if (role === 'professor') {
        let missaoQuery = supabase
          .from('missoes')
          .select('id')
          .eq('institution_id', institutionId!);

        if (casaMentorId) {
          missaoQuery = missaoQuery.or(`tipo_missao.eq.geral,tipo_missao.is.null,casa_id.eq.${casaMentorId}`);
        } else {
          missaoQuery = missaoQuery.or('tipo_missao.eq.geral,tipo_missao.is.null');
        }

        const { data: missoes } = await missaoQuery;
        const missaoIds = missoes?.map(m => m.id) || [];
        if (missaoIds.length === 0) return 0;

        const { count } = await supabase
          .from('entregas')
          .select('*', { count: 'exact', head: true })
          .in('missao_id', missaoIds)
          .eq('status', 'pendente');

        return count || 0;
      } else {
        const { data } = await supabase.rpc('get_missoes_do_aluno', {
          p_aluno_id: userId!,
        });
        if (!data) return 0;
        return data.filter((m: any) =>
          (!m.ja_entregou && !m.atrasada) || m.status_entrega === 'refazer'
        ).length;
      }
    },
    refetchInterval: 120000,
    staleTime: 60000,
    enabled: !!userId && !!institutionId,
  });

  useEffect(() => {
    if (!('setAppBadge' in navigator) || !userId || !institutionId) return;
    try {
      if (badgeCount && badgeCount > 0) {
        (navigator as any).setAppBadge(badgeCount);
      } else {
        (navigator as any).clearAppBadge();
      }
    } catch {}
  }, [badgeCount, userId, institutionId]);

  return badgeCount || 0;
};

// Função utilitária para limpar badge manualmente
export const clearAppBadge = async () => {
  if ('clearAppBadge' in navigator) {
    try { await (navigator as any).clearAppBadge(); } catch {}
  }
};

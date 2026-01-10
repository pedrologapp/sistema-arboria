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
  
  // Log inicial para debug
  useEffect(() => {
    console.log('🔔 useAppBadge inicializado:', { userId, institutionId, role, casaMentorId });
    console.log('🔔 Badging API suportada:', 'setAppBadge' in navigator);
  }, [userId, institutionId, role, casaMentorId]);

  // Contar pendências baseado no role
  const { data: badgeCount, error, isLoading } = useQuery({
    queryKey: ['app-badge-count', userId, role, institutionId, casaMentorId],
    queryFn: async () => {
      console.log('🔔 Buscando contagem para badge...', { userId, role });
      
      if (role === 'professor') {
        // Professor: contar entregas pendentes de avaliação
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
        console.log('🔔 Missões encontradas:', missaoIds.length);

        if (missaoIds.length === 0) return 0;

        const { count } = await supabase
          .from('entregas')
          .select('*', { count: 'exact', head: true })
          .in('missao_id', missaoIds)
          .eq('status', 'pendente');

        console.log('🔔 Entregas pendentes:', count);
        return count || 0;
        
      } else {
        // Aluno: contar missões pendentes + refazer
        const { data } = await supabase.rpc('get_missoes_do_aluno', {
          p_aluno_id: userId!,
        });
        
        if (!data) return 0;
        
        // Pendentes (não entregou + dentro do prazo) + Refazer
        const pendentes = data.filter((m: any) => 
          (!m.ja_entregou && !m.atrasada) || m.status_entrega === 'refazer'
        );
        
        console.log('🔔 Missões pendentes do aluno:', pendentes.length);
        return pendentes.length;
      }
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    enabled: !!userId && !!institutionId
  });

  // Log de erro
  useEffect(() => {
    if (error) {
      console.error('🔔 Erro ao buscar badge count:', error);
    }
  }, [error]);

  // Log de loading e resultado
  useEffect(() => {
    console.log('🔔 Badge count:', { isLoading, badgeCount, enabled: !!userId && !!institutionId });
  }, [isLoading, badgeCount, userId, institutionId]);

  // Atualizar o badge do ícone do app
  useEffect(() => {
    const atualizarBadge = async () => {
      if (!('setAppBadge' in navigator)) {
        console.log('🔔 ❌ Badging API não suportada neste navegador/contexto');
        return;
      }

      try {
        if (badgeCount && badgeCount > 0) {
          await (navigator as any).setAppBadge(badgeCount);
          console.log('🔔 ✅ Badge atualizado:', badgeCount);
        } else {
          await (navigator as any).clearAppBadge();
          console.log('🔔 ✅ Badge limpo');
        }
      } catch (error) {
        console.error('🔔 ❌ Erro ao atualizar badge:', error);
      }
    };

    // Só tenta atualizar se tiver dados válidos
    if (userId && institutionId) {
      atualizarBadge();
    } else {
      console.log('🔔 ⏳ Aguardando dados do usuário para atualizar badge');
    }
  }, [badgeCount, userId, institutionId]);

  return badgeCount || 0;
};

// Função utilitária para limpar badge manualmente
export const clearAppBadge = async () => {
  if ('clearAppBadge' in navigator) {
    try {
      await (navigator as any).clearAppBadge();
      console.log('🔔 Badge limpo manualmente');
    } catch (error) {
      console.warn('Erro ao limpar badge:', error);
    }
  }
};

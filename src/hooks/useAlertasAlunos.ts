import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';

export interface AlertaAluno {
  id: string;
  aluno: {
    id: string;
    nome: string;
    avatarUrl?: string;
    serie: string;
    turma: string;
  };
  tipo_alerta: 'precisa_atencao' | 'celebrar' | 'nao_esquecer';
  motivo: string;
  dados_contexto: Record<string, unknown>;
  created_at: string;
}

export interface AlertaFaseAnterior {
  id: string;
  aluno: {
    id: string;
    nome: string;
    avatarUrl?: string;
    serie: string;
    turma: string;
  };
  faseAnteriorNome: string;
  faseAnteriorEmoji: string;
  motivo: string;
  observadoFaseAtual: boolean;
  dados_contexto: Record<string, unknown>;
}

export interface AlunoSimples {
  id: string;
  nome: string;
  avatarUrl?: string;
  serie?: string;
  turma?: string;
}

export interface BannerComeceAqui {
  faseNome: string;
  faseEmoji: string;
  quantidade: number;
  alunos: AlunoSimples[];
}

export interface AlertasAgrupados {
  bannerComeceAqui: BannerComeceAqui | null;
  precisaAtencao: AlertaAluno[];
  celebrar: AlertaAluno[];
  naoEsquecer: AlertaAluno[];
  atencaoFaseAnterior: AlertaFaseAnterior[];
  totais: {
    precisaAtencao: number;
    celebrar: number;
    naoEsquecer: number;
    atencaoFaseAnterior: number;
  };
  isLoading: boolean;
}

export const useAlertasAlunos = () => {
  const { profile, casaMentor, faseAtual } = useProfessor();

  const query = useQuery({
    queryKey: ['alertas-alunos', profile?.institution_id, casaMentor?.id, faseAtual?.id],
    queryFn: async (): Promise<AlertasAgrupados> => {
      if (!profile?.institution_id || !casaMentor?.id) {
        return {
          bannerComeceAqui: null,
          precisaAtencao: [],
          celebrar: [],
          naoEsquecer: [],
          atencaoFaseAnterior: [],
          totais: { precisaAtencao: 0, celebrar: 0, naoEsquecer: 0, atencaoFaseAnterior: 0 },
          isLoading: false
        };
      }

      // 1. Buscar alunos da casa
      const { data: alunosCasa, error: alunosError } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome, avatar_url, serie, turma')
        .eq('institution_id', profile.institution_id)
        .eq('casa_id', casaMentor.id);

      if (alunosError) {
        console.error('Erro ao buscar alunos:', alunosError);
        throw alunosError;
      }

      const alunoIds = alunosCasa?.map(a => a.id) || [];

      // 2. Buscar alertas ativos da tabela (fase atual)
      const { data: alertasDb, error: alertasError } = await supabase
        .from('alertas_alunos')
        .select(`
          id,
          tipo_alerta,
          motivo,
          dados_contexto,
          created_at,
          fase_id,
          fase_origem_id,
          aluno:profiles!alertas_alunos_aluno_id_fkey (
            id,
            nome,
            sobrenome,
            avatar_url,
            serie,
            turma
          )
        `)
        .eq('institution_id', profile.institution_id)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false });

      if (alertasError) {
        console.error('Erro ao buscar alertas:', alertasError);
        throw alertasError;
      }

      // 3. Buscar observações da FASE ATUAL para cada aluno
      let observacoesFaseAtual: Record<string, { count: number; ultimaData: string | null }> = {};
      
      if (alunoIds.length > 0 && faseAtual?.id) {
        const { data: observacoes, error: obsError } = await supabase
          .from('observacoes')
          .select('aluno_id, created_at')
          .in('aluno_id', alunoIds)
          .eq('fase_id', faseAtual.id)
          .order('created_at', { ascending: false });

        if (!obsError && observacoes) {
          observacoes.forEach(obs => {
            if (!observacoesFaseAtual[obs.aluno_id]) {
              observacoesFaseAtual[obs.aluno_id] = { count: 0, ultimaData: null };
            }
            observacoesFaseAtual[obs.aluno_id].count += 1;
            if (!observacoesFaseAtual[obs.aluno_id].ultimaData) {
              observacoesFaseAtual[obs.aluno_id].ultimaData = obs.created_at || null;
            }
          });
        }
      }

      // 4. Calcular BANNER "Comece por aqui" - alunos SEM observação na fase atual
      const alunosSemObsFase: AlunoSimples[] = (alunosCasa || [])
        .filter(aluno => !observacoesFaseAtual[aluno.id] || observacoesFaseAtual[aluno.id].count === 0)
        .map(aluno => ({
          id: aluno.id,
          nome: `${aluno.nome || ''} ${aluno.sobrenome || ''}`.trim() || 'Aluno',
          avatarUrl: aluno.avatar_url || undefined,
          serie: aluno.serie || undefined,
          turma: aluno.turma || undefined
        }));

      const bannerComeceAqui: BannerComeceAqui | null = alunosSemObsFase.length > 0 && faseAtual
        ? {
            faseNome: faseAtual.inteligencia?.nome || 'Atual',
            faseEmoji: faseAtual.inteligencia?.emoji || '📚',
            quantidade: alunosSemObsFase.length,
            alunos: alunosSemObsFase
          }
        : null;

      // 5. Calcular "Não esqueça" - alunos COM ≥1 obs na fase atual E 14+ dias sem nova
      const hoje = new Date();
      const limite14Dias = new Date(hoje);
      limite14Dias.setDate(limite14Dias.getDate() - 14);

      const alunosNaoEsquecer: AlertaAluno[] = (alunosCasa || [])
        .filter(aluno => {
          const obsData = observacoesFaseAtual[aluno.id];
          // Deve ter pelo menos 1 observação na fase
          if (!obsData || obsData.count === 0) return false;
          // E a última deve ser há 14+ dias
          if (!obsData.ultimaData) return false;
          return new Date(obsData.ultimaData) < limite14Dias;
        })
        .map(aluno => {
          const obsData = observacoesFaseAtual[aluno.id];
          const diasSemObs = obsData?.ultimaData 
            ? Math.floor((hoje.getTime() - new Date(obsData.ultimaData).getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          
          return {
            id: `nao-esquecer-${aluno.id}`,
            aluno: {
              id: aluno.id,
              nome: `${aluno.nome || ''} ${aluno.sobrenome || ''}`.trim() || 'Aluno',
              avatarUrl: aluno.avatar_url || undefined,
              serie: aluno.serie || '',
              turma: aluno.turma || ''
            },
            tipo_alerta: 'nao_esquecer' as const,
            motivo: `Última observação há ${diasSemObs} dias`,
            dados_contexto: {},
            created_at: new Date().toISOString()
          };
        });

      // 6. Filtrar alertas do banco
      const alertasFiltrados = (alertasDb || [])
        .filter(a => alunoIds.includes(a.aluno?.id))
        .map(alerta => ({
          id: alerta.id,
          aluno: {
            id: alerta.aluno?.id || '',
            nome: `${alerta.aluno?.nome || ''} ${alerta.aluno?.sobrenome || ''}`.trim() || 'Aluno',
            avatarUrl: alerta.aluno?.avatar_url || undefined,
            serie: alerta.aluno?.serie || '',
            turma: alerta.aluno?.turma || ''
          },
          tipo_alerta: alerta.tipo_alerta as 'precisa_atencao' | 'celebrar' | 'nao_esquecer',
          motivo: alerta.motivo,
          dados_contexto: (alerta.dados_contexto as Record<string, unknown>) || {},
          created_at: alerta.created_at || '',
          fase_id: alerta.fase_id,
          fase_origem_id: alerta.fase_origem_id
        }));

      // 7. Separar alertas da fase atual vs fase anterior
      const alertasFaseAtual = alertasFiltrados.filter(a => 
        !a.fase_origem_id || a.fase_origem_id === faseAtual?.id || a.fase_id === faseAtual?.id
      );
      
      const alertasFaseAnteriorRaw = alertasFiltrados.filter(a => 
        a.fase_origem_id && a.fase_origem_id !== faseAtual?.id
      );

      // 8. Buscar dados das fases anteriores para os alertas
      const faseOrigemIds = [...new Set(alertasFaseAnteriorRaw.map(a => a.fase_origem_id).filter(Boolean))];
      let fasesAnterioresMap: Record<string, { nome: string; emoji: string }> = {};
      
      if (faseOrigemIds.length > 0) {
        const { data: fasesData } = await supabase
          .from('fases')
          .select(`
            id,
            inteligencia:inteligencias!fases_inteligencia_id_fkey (
              nome,
              emoji
            )
          `)
          .in('id', faseOrigemIds as string[]);

        if (fasesData) {
          fasesData.forEach(fase => {
            fasesAnterioresMap[fase.id] = {
              nome: fase.inteligencia?.nome || 'Anterior',
              emoji: fase.inteligencia?.emoji || '📚'
            };
          });
        }
      }

      // 9. Montar alertas de fase anterior
      const atencaoFaseAnterior: AlertaFaseAnterior[] = alertasFaseAnteriorRaw.map(alerta => {
        const faseInfo = fasesAnterioresMap[alerta.fase_origem_id || ''] || { nome: 'Anterior', emoji: '📚' };
        const temObsFaseAtual = (observacoesFaseAtual[alerta.aluno.id]?.count || 0) > 0;
        
        return {
          id: alerta.id,
          aluno: alerta.aluno,
          faseAnteriorNome: faseInfo.nome,
          faseAnteriorEmoji: faseInfo.emoji,
          motivo: alerta.motivo,
          observadoFaseAtual: temObsFaseAtual,
          dados_contexto: alerta.dados_contexto
        };
      });

      // 10. Agrupar alertas da fase atual por tipo
      const precisaAtencao = alertasFaseAtual.filter(a => a.tipo_alerta === 'precisa_atencao');
      const celebrar = alertasFaseAtual.filter(a => a.tipo_alerta === 'celebrar');
      const naoEsquecerDb = alertasFaseAtual.filter(a => a.tipo_alerta === 'nao_esquecer');
      
      // Combinar nao_esquecer do banco + calculados dinamicamente
      const naoEsquecer = [...naoEsquecerDb, ...alunosNaoEsquecer];

      return {
        bannerComeceAqui,
        precisaAtencao,
        celebrar,
        naoEsquecer,
        atencaoFaseAnterior,
        totais: {
          precisaAtencao: precisaAtencao.length,
          celebrar: celebrar.length,
          naoEsquecer: naoEsquecer.length,
          atencaoFaseAnterior: atencaoFaseAnterior.length
        },
        isLoading: false
      };
    },
    enabled: !!profile?.institution_id && !!casaMentor?.id,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5
  });

  return {
    ...query.data,
    isLoading: query.isLoading,
    bannerComeceAqui: query.data?.bannerComeceAqui || null,
    precisaAtencao: query.data?.precisaAtencao || [],
    celebrar: query.data?.celebrar || [],
    naoEsquecer: query.data?.naoEsquecer || [],
    atencaoFaseAnterior: query.data?.atencaoFaseAnterior || [],
    totais: query.data?.totais || { precisaAtencao: 0, celebrar: 0, naoEsquecer: 0, atencaoFaseAnterior: 0 }
  };
};

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

export interface AlertasAgrupados {
  precisaAtencao: AlertaAluno[];
  celebrar: AlertaAluno[];
  naoEsquecer: AlertaAluno[];
  totais: {
    precisaAtencao: number;
    celebrar: number;
    naoEsquecer: number;
  };
  isLoading: boolean;
}

export const useAlertasAlunos = () => {
  const { profile, casaMentor } = useProfessor();

  const query = useQuery({
    queryKey: ['alertas-alunos', profile?.institution_id, casaMentor?.id],
    queryFn: async (): Promise<AlertasAgrupados> => {
      if (!profile?.institution_id || !casaMentor?.id) {
        return {
          precisaAtencao: [],
          celebrar: [],
          naoEsquecer: [],
          totais: { precisaAtencao: 0, celebrar: 0, naoEsquecer: 0 },
          isLoading: false
        };
      }

      // 1. Buscar alertas ativos da tabela
      const { data: alertasDb, error: alertasError } = await supabase
        .from('alertas_alunos')
        .select(`
          id,
          tipo_alerta,
          motivo,
          dados_contexto,
          created_at,
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

      // 2. Buscar alunos da casa para calcular "não esqueça"
      const { data: alunosCasa, error: alunosError } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome, avatar_url, serie, turma')
        .eq('institution_id', profile.institution_id)
        .eq('casa_id', casaMentor.id);

      if (alunosError) {
        console.error('Erro ao buscar alunos:', alunosError);
        throw alunosError;
      }

      // 3. Buscar última observação de cada aluno da casa
      const alunoIds = alunosCasa?.map(a => a.id) || [];
      
      let ultimasObservacoes: Record<string, string> = {};
      
      if (alunoIds.length > 0) {
        const { data: observacoes, error: obsError } = await supabase
          .from('observacoes')
          .select('aluno_id, created_at')
          .in('aluno_id', alunoIds)
          .order('created_at', { ascending: false });

        if (!obsError && observacoes) {
          // Pegar a última observação de cada aluno
          observacoes.forEach(obs => {
            if (!ultimasObservacoes[obs.aluno_id]) {
              ultimasObservacoes[obs.aluno_id] = obs.created_at || '';
            }
          });
        }
      }

      // 4. Calcular alunos sem observação há 14+ dias
      const hoje = new Date();
      const limite14Dias = new Date(hoje);
      limite14Dias.setDate(limite14Dias.getDate() - 14);

      const alunosSemObservacao: AlertaAluno[] = (alunosCasa || [])
        .filter(aluno => {
          const ultimaObs = ultimasObservacoes[aluno.id];
          if (!ultimaObs) return true; // Nunca teve observação
          return new Date(ultimaObs) < limite14Dias;
        })
        .map(aluno => ({
          id: `nao-esquecer-${aluno.id}`,
          aluno: {
            id: aluno.id,
            nome: `${aluno.nome || ''} ${aluno.sobrenome || ''}`.trim() || 'Aluno',
            avatarUrl: aluno.avatar_url || undefined,
            serie: aluno.serie || '',
            turma: aluno.turma || ''
          },
          tipo_alerta: 'nao_esquecer' as const,
          motivo: ultimasObservacoes[aluno.id] 
            ? `Última observação há ${Math.floor((hoje.getTime() - new Date(ultimasObservacoes[aluno.id]).getTime()) / (1000 * 60 * 60 * 24))} dias`
            : 'Nenhuma observação registrada',
          dados_contexto: {},
          created_at: new Date().toISOString()
        }));

      // 5. Filtrar alertas do banco que são de alunos da casa
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
          created_at: alerta.created_at || ''
        }));

      // 6. Agrupar por tipo
      const precisaAtencao = alertasFiltrados.filter(a => a.tipo_alerta === 'precisa_atencao');
      const celebrar = alertasFiltrados.filter(a => a.tipo_alerta === 'celebrar');
      
      // Combinar nao_esquecer do banco + calculados dinamicamente
      const naoEsquecerDb = alertasFiltrados.filter(a => a.tipo_alerta === 'nao_esquecer');
      const naoEsquecer = [...naoEsquecerDb, ...alunosSemObservacao];

      return {
        precisaAtencao,
        celebrar,
        naoEsquecer,
        totais: {
          precisaAtencao: precisaAtencao.length,
          celebrar: celebrar.length,
          naoEsquecer: naoEsquecer.length
        },
        isLoading: false
      };
    },
    enabled: !!profile?.institution_id && !!casaMentor?.id,
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchInterval: 1000 * 60 * 5 // Atualiza a cada 5 minutos
  });

  return {
    ...query.data,
    isLoading: query.isLoading,
    precisaAtencao: query.data?.precisaAtencao || [],
    celebrar: query.data?.celebrar || [],
    naoEsquecer: query.data?.naoEsquecer || [],
    totais: query.data?.totais || { precisaAtencao: 0, celebrar: 0, naoEsquecer: 0 }
  };
};

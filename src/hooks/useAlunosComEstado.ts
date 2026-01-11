import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useAlunosCasa, type AlunoComStatus } from './useAlunosCasa';

export type EstadoCalculado = 
  | 'precisa_atencao' 
  | 'celebrar' 
  | 'atencao_recente' 
  | 'melhorando' 
  | 'sem_observacao' 
  | 'primeira_obs' 
  | 'neutro';

export interface AlunoComEstado extends AlunoComStatus {
  estadoCalculado: EstadoCalculado;
  ultimaSinal?: string;
  penultimaSinal?: string;
}

interface EstadoAluno {
  aluno_id: string;
  estado_calculado: EstadoCalculado;
  ultima_sinal: string | null;
  penultima_sinal: string | null;
}

export const useAlunosComEstado = () => {
  const { casaMentor, profile } = useProfessor();
  const { data: alunosBase, isLoading: isLoadingAlunos } = useAlunosCasa();

  const { data: estados, isLoading: isLoadingEstados } = useQuery({
    queryKey: ['estados-alunos', casaMentor?.id, profile?.institution_id],
    queryFn: async (): Promise<EstadoAluno[]> => {
      if (!casaMentor?.id || !profile?.institution_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('vw_estados_alunos')
        .select('aluno_id, estado_calculado, ultima_sinal, penultima_sinal')
        .eq('casa_id', casaMentor.id)
        .eq('institution_id', profile.institution_id);

      if (error) {
        console.error('Erro ao buscar estados dos alunos:', error);
        throw error;
      }

      return (data || []) as EstadoAluno[];
    },
    enabled: !!casaMentor?.id && !!profile?.institution_id
  });

  // Combinar alunos com estados
  const alunosComEstado: AlunoComEstado[] | undefined = alunosBase?.map(aluno => {
    const estadoAluno = estados?.find(e => e.aluno_id === aluno.id);
    
    return {
      ...aluno,
      estadoCalculado: (estadoAluno?.estado_calculado || 'sem_observacao') as EstadoCalculado,
      ultimaSinal: estadoAluno?.ultima_sinal || undefined,
      penultimaSinal: estadoAluno?.penultima_sinal || undefined
    };
  });

  return {
    data: alunosComEstado,
    isLoading: isLoadingAlunos || isLoadingEstados
  };
};

// Configuração visual dos filtros de estado
export const estadosFiltroConfig = [
  { 
    id: null, 
    label: 'Todos', 
    cor: '#3B82F6', 
    corFundo: '#1D4ED8', 
    icone: null 
  },
  { 
    id: 'precisa_atencao', 
    label: 'Alerta', 
    cor: '#EF4444', 
    corFundo: '#7F1D1D', 
    icone: 'circle' as const
  },
  { 
    id: 'celebrar', 
    label: 'Celebrar', 
    cor: '#EAB308', 
    corFundo: '#78350F', 
    icone: 'star' as const
  },
  { 
    id: 'atencao_recente', 
    label: 'Atenção', 
    cor: '#F97316', 
    corFundo: '#78350F', 
    icone: 'circle' as const
  },
  { 
    id: 'melhorando', 
    label: 'Melhorando', 
    cor: '#22C55E', 
    corFundo: '#14532D', 
    icone: 'circle' as const
  },
  { 
    id: 'sem_observacao', 
    label: 'Sem olhar', 
    cor: '#6B7280', 
    corFundo: '#374151', 
    icone: 'circle-empty' as const
  },
] as const;

// Helper para obter visual do estado
export const getEstadoVisual = (estado: EstadoCalculado) => {
  switch (estado) {
    case 'precisa_atencao':
      return { cor: '#EF4444', icone: 'circle' as const, label: 'Alerta' };
    case 'celebrar':
      return { cor: '#EAB308', icone: 'star' as const, label: 'Celebrar' };
    case 'atencao_recente':
      return { cor: '#F97316', icone: 'circle' as const, label: 'Atenção' };
    case 'melhorando':
      return { cor: '#22C55E', icone: 'circle' as const, label: 'Melhorando' };
    case 'sem_observacao':
    case 'primeira_obs':
      return { cor: '#6B7280', icone: 'circle-empty' as const, label: 'Sem olhar' };
    default:
      return { cor: '#6B7280', icone: 'circle' as const, label: 'Neutro' };
  }
};

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';

export interface AlunoComStatusTurma {
  id: string;
  nome: string;
  serie: string;
  turma: string;
  turmaId: string;
  avatarUrl?: string;
  pontosTotais: number;
  status: 'destaque' | 'regular' | 'risco';
}

export const useAlunosTurmasComStatus = () => {
  const { turmasVinculadas, profile } = useProfessor();

  return useQuery({
    queryKey: ['alunos-turmas-com-status', turmasVinculadas?.map(t => t.id), profile?.institution_id],
    queryFn: async (): Promise<AlunoComStatusTurma[]> => {
      if (!turmasVinculadas || turmasVinculadas.length === 0 || !profile?.institution_id) {
        return [];
      }

      const turmaIds = turmasVinculadas.map(t => t.id);

      // Buscar alunos vinculados às turmas do professor
      const { data: alunosTurma, error } = await supabase
        .from('aluno_turma')
        .select(`
          aluno_id,
          turma_id,
          turmas!inner (
            id,
            nome,
            serie,
            turma_letra
          ),
          profiles!inner (
            id,
            full_name,
            nome,
            sobrenome,
            serie,
            turma,
            avatar_url
          )
        `)
        .in('turma_id', turmaIds)
        .eq('ativo', true);

      if (error) {
        console.error('Erro ao buscar alunos das turmas:', error);
        throw error;
      }

      if (!alunosTurma || alunosTurma.length === 0) {
        return [];
      }

      // Buscar pontos de todos os alunos
      const alunoIds = alunosTurma.map(at => (at.profiles as any).id);
      
      const { data: pontosData } = await supabase
        .from('pontos_gerais')
        .select('aluno_id, pontos')
        .in('aluno_id', alunoIds);

      // Criar mapa de pontos por aluno
      const pontosMap = new Map<string, number>();
      if (pontosData) {
        for (const p of pontosData) {
          const atual = pontosMap.get(p.aluno_id) || 0;
          pontosMap.set(p.aluno_id, atual + (p.pontos || 0));
        }
      }

      // Mapear para o formato esperado
      const alunos: AlunoComStatusTurma[] = alunosTurma.map(at => {
        const profileData = at.profiles as any;
        const turmaData = at.turmas as any;
        
        const nomeCompleto = profileData.full_name || 
          [profileData.nome, profileData.sobrenome].filter(Boolean).join(' ') || 
          'Sem nome';

        const pontosTotais = pontosMap.get(profileData.id) || 0;

        // Calcular status baseado em pontos
        let status: 'destaque' | 'regular' | 'risco' = 'risco';
        if (pontosTotais > 50) {
          status = 'destaque';
        } else if (pontosTotais > 0) {
          status = 'regular';
        }

        return {
          id: profileData.id,
          nome: nomeCompleto,
          serie: profileData.serie || `${turmaData.serie}º`,
          turma: profileData.turma || turmaData.turma_letra,
          turmaId: turmaData.id,
          avatarUrl: profileData.avatar_url || undefined,
          pontosTotais,
          status,
        };
      });

      // Ordenar por pontuação decrescente, depois por nome
      return alunos.sort((a, b) => {
        if (b.pontosTotais !== a.pontosTotais) {
          return b.pontosTotais - a.pontosTotais;
        }
        return a.nome.localeCompare(b.nome);
      });
    },
    enabled: !!turmasVinculadas && turmasVinculadas.length > 0 && !!profile?.institution_id
  });
};

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
  quantidadeObservacoes: number;
  status: 'com_observacao' | 'sem_observacao';
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

      // Buscar contagem de observações de todos os alunos
      const alunoIds = alunosTurma.map(at => (at.profiles as any).id);
      
      const { data: observacoesData } = await supabase
        .from('observacoes')
        .select('aluno_id')
        .in('aluno_id', alunoIds);

      // Criar mapa de quantidade de observações por aluno
      const obsMap = new Map<string, number>();
      if (observacoesData) {
        for (const o of observacoesData) {
          const atual = obsMap.get(o.aluno_id) || 0;
          obsMap.set(o.aluno_id, atual + 1);
        }
      }

      // Mapear para o formato esperado
      const alunos: AlunoComStatusTurma[] = alunosTurma.map(at => {
        const profileData = at.profiles as any;
        const turmaData = at.turmas as any;
        
        const nomeCompleto = profileData.full_name || 
          [profileData.nome, profileData.sobrenome].filter(Boolean).join(' ') || 
          'Sem nome';

        const quantidadeObservacoes = obsMap.get(profileData.id) || 0;

        // Status baseado em observações
        const status: 'com_observacao' | 'sem_observacao' = quantidadeObservacoes > 0 
          ? 'com_observacao' 
          : 'sem_observacao';

        return {
          id: profileData.id,
          nome: nomeCompleto,
          serie: profileData.serie || `${turmaData.serie}º`,
          turma: profileData.turma || turmaData.turma_letra,
          turmaId: turmaData.id,
          avatarUrl: profileData.avatar_url || undefined,
          quantidadeObservacoes,
          status,
        };
      });

      // Ordenar por nome alfabético
      return alunos.sort((a, b) => a.nome.localeCompare(b.nome));
    },
    enabled: !!turmasVinculadas && turmasVinculadas.length > 0 && !!profile?.institution_id
  });
};

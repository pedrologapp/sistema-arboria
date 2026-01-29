import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';

export interface AlunoTurma {
  id: string;
  nome: string;
  serie: string;
  turma: string;
  turmaId: string;
  turmaNome: string;
  avatarUrl?: string;
}

export const useAlunosTurmas = () => {
  const { turmasVinculadas, profile } = useProfessor();

  return useQuery({
    queryKey: ['alunos-turmas', turmasVinculadas?.map(t => t.id), profile?.institution_id],
    queryFn: async (): Promise<AlunoTurma[]> => {
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

      // Mapear para o formato esperado
      const alunos: AlunoTurma[] = alunosTurma.map(at => {
        const profile = at.profiles as any;
        const turma = at.turmas as any;
        
        const nomeCompleto = profile.full_name || 
          [profile.nome, profile.sobrenome].filter(Boolean).join(' ') || 
          'Sem nome';

        return {
          id: profile.id,
          nome: nomeCompleto,
          serie: profile.serie || `${turma.serie}º`,
          turma: profile.turma || turma.turma_letra,
          turmaId: turma.id,
          turmaNome: turma.nome,
          avatarUrl: profile.avatar_url || undefined,
        };
      });

      // Ordenar por nome
      return alunos.sort((a, b) => a.nome.localeCompare(b.nome));
    },
    enabled: !!turmasVinculadas && turmasVinculadas.length > 0 && !!profile?.institution_id
  });
};

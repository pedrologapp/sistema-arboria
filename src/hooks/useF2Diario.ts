import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// A coluna turmas.segmento pode não estar nos tipos gerados do Supabase ainda;
// consumimos via `sb` (any), como fazem useTurmasDaCasaAtiva e useF2Panorama,
// para o build não quebrar por tipagem.
const sb = supabase as any;

export interface TurmaF2Diario {
  id: string;
  nome: string;
  serie: string | null;
  turma_letra: string | null;
}

/**
 * TODAS as turmas do Fundamental 2 da instituição (acesso COMPARTILHADO).
 *
 * No modelo do F2 não há vinculação por turma: qualquer mentor tem acesso a
 * todas as turmas do 6º ao 9º. Mesma fonte/padrão de useTurmasDaCasaAtiva e
 * useF2Panorama (query em `turmas` por institution_id + segmento).
 */
export const useTurmasF2Instituicao = (institutionId?: string | null) => {
  return useQuery({
    queryKey: ['f2-diario-turmas', institutionId],
    enabled: !!institutionId,
    queryFn: async (): Promise<TurmaF2Diario[]> => {
      const { data, error } = await sb
        .from('turmas')
        .select('id, nome, serie, turma_letra')
        .eq('institution_id', institutionId!)
        .eq('segmento', 'fundamental2');
      if (error) throw error;
      const turmas = (data as TurmaF2Diario[]) ?? [];
      return turmas.sort(
        (a, b) =>
          (a.serie ?? '').localeCompare(b.serie ?? '') ||
          (a.turma_letra ?? '').localeCompare(b.turma_letra ?? '')
      );
    },
  });
};

export interface AlunoF2Diario {
  id: string;
  nome: string;
  avatarUrl?: string;
  quantidadeObservacoes: number;
}

/**
 * TODOS os alunos de UMA turma F2 (por turma_id), sem filtro por vinculação do
 * professor. Espelha useAlunosTurmasComStatus, mas a fonte é a turma escolhida:
 * qualquer mentor vê todos os alunos daquela turma.
 */
export const useAlunosDaTurmaF2 = (turmaId?: string | null) => {
  return useQuery({
    queryKey: ['f2-diario-alunos', turmaId],
    enabled: !!turmaId,
    queryFn: async (): Promise<AlunoF2Diario[]> => {
      // Alunos ATIVOS vinculados à turma escolhida.
      const { data: alunosTurma, error } = await supabase
        .from('aluno_turma')
        .select(`
          aluno_id,
          profiles!inner (
            id,
            full_name,
            nome,
            sobrenome,
            avatar_url
          )
        `)
        .eq('turma_id', turmaId!)
        .eq('ativo', true);

      if (error) throw error;
      if (!alunosTurma || alunosTurma.length === 0) return [];

      const alunoIds = alunosTurma.map((at) => (at.profiles as any).id);

      // Contagem de observações por aluno (soft-delete fica de fora).
      const { data: observacoesData } = await supabase
        .from('observacoes')
        .select('aluno_id')
        .in('aluno_id', alunoIds)
        .is('excluida_em' as never, null);

      const obsMap = new Map<string, number>();
      for (const o of observacoesData ?? []) {
        obsMap.set(o.aluno_id, (obsMap.get(o.aluno_id) ?? 0) + 1);
      }

      const alunos: AlunoF2Diario[] = alunosTurma.map((at) => {
        const p = at.profiles as any;
        const nomeCompleto =
          p.full_name ||
          [p.nome, p.sobrenome].filter(Boolean).join(' ') ||
          'Sem nome';
        return {
          id: p.id,
          nome: nomeCompleto,
          avatarUrl: p.avatar_url || undefined,
          quantidadeObservacoes: obsMap.get(p.id) ?? 0,
        };
      });

      return alunos.sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });
};

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AlunoRajada {
  id: string;
  nome: string;
  avatarUrl?: string;
  registradoHoje: boolean;       // já ganhou um momento HOJE, por qualquer educadora (selo afirmativo)
  registradoHojePorMim: boolean; // ganhou um momento hoje POR QUEM ESTÁ LOGADA; é o que o
                                 // fechamento "Você enxergou N" conta (honestidade do rito)
  momentosNaFase: number;        // observações da criança NA FASE ATUAL (contexto de continuidade;
                                 // só é EXIBIDO dentro do editor aberto e quando > 0, nunca na lista)
}

/**
 * Lista da turma para o REGISTRO EM RAJADA ("Iniciar aula").
 *
 * Devolve os alunos da turma em ordem alfabética + se cada um já recebeu um
 * registro HOJE (para acender o selo "registrado hoje", verde/afirmativo).
 * NUNCA expõe "quem falta": quem não tem registro é só o estado natural da lista.
 *
 * "Hoje" = desde a meia-noite local do aparelho (o professor está em Natal/RN).
 * NÃO carrega o texto das observações: a rajada é superfície de ESCRITA;
 * o histórico da criança vive no thread/Diário.
 *
 * Observações excluídas (soft-delete) ficam fora de tudo.
 */
export const useRajadaTurma = (
  turmaId?: string | null,
  faseId?: string | null,
  professorId?: string | null
) => {
  return useQuery({
    queryKey: ['rajada-turma', turmaId, faseId ?? null, professorId ?? null],
    enabled: !!turmaId,
    queryFn: async (): Promise<AlunoRajada[]> => {
      if (!turmaId) return [];

      // 1. Alunos ativos da turma
      const { data: vinc, error } = await supabase
        .from('aluno_turma')
        .select(`
          aluno_id,
          profiles!inner ( id, full_name, nome, sobrenome, avatar_url )
        `)
        .eq('turma_id', turmaId)
        .eq('ativo', true);
      if (error) throw error;
      if (!vinc || vinc.length === 0) return [];

      const alunoIds = vinc.map((v) => (v.profiles as any).id);

      // 2. Quem já recebeu registro HOJE (desde a meia-noite local)
      const inicioHoje = new Date();
      inicioHoje.setHours(0, 0, 0, 0);
      const { data: obsHoje } = await supabase
        .from('observacoes')
        .select('aluno_id, professor_id')
        .in('aluno_id', alunoIds)
        .is('excluida_em' as never, null)
        .gte('created_at', inicioHoje.toISOString());
      const registradosHoje = new Set((obsHoje || []).map((o) => o.aluno_id));
      const registradosPorMim = new Set(
        (obsHoje || [])
          .filter((o: any) => professorId && o.professor_id === professorId)
          .map((o) => o.aluno_id)
      );

      // 3. Momentos de cada criança NA FASE atual (fio de continuidade do editor)
      const momentosMap = new Map<string, number>();
      if (faseId) {
        const { data: obsFase } = await supabase
          .from('observacoes')
          .select('aluno_id')
          .in('aluno_id', alunoIds)
          .eq('fase_id', faseId)
          .is('excluida_em' as never, null);
        for (const o of obsFase || []) {
          momentosMap.set(o.aluno_id, (momentosMap.get(o.aluno_id) ?? 0) + 1);
        }
      }

      // 4. Monta a lista, ordem alfabética estável (nunca "não-registrados primeiro")
      const alunos: AlunoRajada[] = vinc.map((v) => {
        const p = v.profiles as any;
        const nome =
          p.full_name || [p.nome, p.sobrenome].filter(Boolean).join(' ') || 'Aluno';
        return {
          id: p.id,
          nome,
          avatarUrl: p.avatar_url || undefined,
          registradoHoje: registradosHoje.has(p.id),
          registradoHojePorMim: registradosPorMim.has(p.id),
          momentosNaFase: momentosMap.get(p.id) ?? 0,
        };
      });

      return alunos.sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });
};

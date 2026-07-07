import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// A tabela turma_atividade_plano ainda pode não existir nos tipos gerados
// (migration escrita, aplicação sob revisão de Riscos + Dados). O acesso
// destipado evita erro de build enquanto isso.
const fromAny = (tb: string) =>
  (supabase.from as never as (tb: string) => ReturnType<typeof supabase.from>)(tb);

export interface AtividadePlanoItem {
  planoId: string;
  atividadeId: string;
  nome: string;
  objetivo: string | null;
  ordem: number;
}

/**
 * PLANO de atividades da turma para uma inteligência (a fase atual).
 *
 * Lê o vínculo turma + fase + atividade (turma_atividade_plano) que o dono
 * monta na tela "Definição de Trilha", já ordenado.
 *
 * TOLERANTE POR DESIGN: se a migration ainda não estiver aplicada (tabela
 * ausente) ou a query falhar por qualquer motivo, devolve [] em vez de
 * quebrar. O chamador (cockpit da aula) usa o vazio como sinal de "sem plano"
 * e mantém o comportamento de hoje. Nenhuma turma em produção quebra.
 */
export const useTurmaAtividadePlano = (
  turmaId?: string | null,
  inteligenciaId?: number | null,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['turma-atividade-plano', turmaId, inteligenciaId],
    enabled: !!turmaId && !!inteligenciaId && enabled,
    retry: false,
    staleTime: 60_000,
    queryFn: async (): Promise<AtividadePlanoItem[]> => {
      const anoLetivo = new Date().getFullYear();
      try {
        const { data, error } = await fromAny('turma_atividade_plano')
          .select('id, ordem, atividade:atividade_id (id, nome, objetivo, ativo)')
          .eq('turma_id', turmaId!)
          .eq('ano_letivo', anoLetivo)
          .eq('inteligencia_id', inteligenciaId!)
          .eq('ativo', true)
          .order('ordem');
        if (error || !data) return [];
        return (data as unknown as Array<{
          id: string;
          ordem: number;
          atividade: { id: string; nome: string; objetivo: string | null; ativo: boolean } | null;
        }>)
          .filter((r) => r.atividade && r.atividade.ativo !== false)
          .map((r) => ({
            planoId: r.id,
            atividadeId: r.atividade!.id,
            nome: r.atividade!.nome,
            objetivo: r.atividade!.objetivo ?? null,
            ordem: r.ordem,
          }));
      } catch {
        return [];
      }
    },
  });
};

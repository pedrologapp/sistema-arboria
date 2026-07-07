import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AtividadePlanoItem } from '@/hooks/useTurmaAtividadePlano';

// A tabela turma_atividade_evento pode ainda não estar nos tipos gerados
// (banco de atividades sob revisão de Riscos + Dados). Acesso destipado, igual
// ao useTurmaAtividadePlano: evita erro de build enquanto isso.
const fromAny = (tb: string) =>
  (supabase.from as never as (tb: string) => ReturnType<typeof supabase.from>)(tb);

/**
 * EVENTOS de conclusão das atividades da turma (turma_atividade_evento,
 * evento = 'concluida'). Lê por turma + os atividade_ids do plano e devolve o
 * conjunto de ids já concluídos.
 *
 * TOLERANTE POR DESIGN: se a tabela não existir, a query falhar ou não houver
 * ids, devolve Set vazio, a aula segue normal e nenhum card marca concluída.
 * Nenhuma turma em produção quebra por causa disto.
 */
export const useTurmaAtividadeEventos = (
  turmaId?: string | null,
  atividadeIds: string[] = []
) => {
  // Chave estável: a ordem dos ids não muda o resultado.
  const idsKey = [...atividadeIds].sort().join(',');
  return useQuery({
    queryKey: ['turma-atividade-eventos', turmaId, idsKey],
    enabled: !!turmaId && atividadeIds.length > 0,
    retry: false,
    staleTime: 30_000,
    queryFn: async (): Promise<Set<string>> => {
      try {
        const { data, error } = await fromAny('turma_atividade_evento')
          .select('atividade_id')
          .eq('turma_id', turmaId!)
          .eq('evento', 'concluida')
          .in('atividade_id', atividadeIds);
        if (error || !data) return new Set();
        return new Set((data as Array<{ atividade_id: string }>).map((r) => r.atividade_id));
      } catch {
        return new Set();
      }
    },
  });
};

export interface AtividadeCorrente {
  /** Ids das atividades do plano já concluídas. */
  concluidas: Set<string>;
  /** Id da atividade DA VEZ: a primeira do plano (por ordem) ainda não concluída. */
  correnteId: string | null;
  /** A atividade da vez em objeto (ou null se o plano acabou/está vazio). */
  correnteItem: AtividadePlanoItem | null;
  /** Posição 1-based da corrente no plano (0 quando não há corrente). */
  correnteNumero: number;
  /** true quando o plano tem itens e TODOS estão concluídos. */
  todasConcluidas: boolean;
}

/**
 * Deriva a "atividade da vez": a PRIMEIRA do plano (já ordenado) que ainda não
 * tem evento 'concluida'. Se todas estão concluídas, não há corrente
 * (`correnteId` = null, `todasConcluidas` = true), o chamador decide se exibe a
 * última com marca de concluída.
 */
export const derivarCorrente = (
  plano: AtividadePlanoItem[],
  concluidas: Set<string>
): AtividadeCorrente => {
  const idx = plano.findIndex((a) => !concluidas.has(a.atividadeId));
  const temCorrente = idx >= 0;
  return {
    concluidas,
    correnteId: temCorrente ? plano[idx].atividadeId : null,
    correnteItem: temCorrente ? plano[idx] : null,
    correnteNumero: temCorrente ? idx + 1 : 0,
    todasConcluidas: plano.length > 0 && !temCorrente,
  };
};

/**
 * Marca uma atividade como CONCLUÍDA para a turma (ao finalizar a aula).
 * IDEMPOTENTE: usa o UNIQUE (turma_id, atividade_id, evento) da tabela com
 * upsert ignorando duplicata, chamar de novo não cria linha nem erra.
 *
 * SILENCIOSO POR DESIGN: qualquer falha é engolida, marcar a atividade NUNCA
 * pode bloquear o encerramento da aula (o registro das crianças já aconteceu).
 * Devolve true se a marcação foi efetivada (para o chamador decidir invalidar).
 */
export const marcarAtividadeConcluida = async (
  turmaId: string,
  atividadeId: string,
  criadoPor: string
): Promise<boolean> => {
  try {
    const { error } = await fromAny('turma_atividade_evento').upsert(
      { turma_id: turmaId, atividade_id: atividadeId, evento: 'concluida', criado_por: criadoPor },
      { onConflict: 'turma_id,atividade_id,evento', ignoreDuplicates: true }
    );
    return !error;
  } catch {
    return false;
  }
};

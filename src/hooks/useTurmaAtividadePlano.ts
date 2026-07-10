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
  materiais: string | null;
  comoConduzir: string | null;
  oQueObservar: string | null;
  pdfUrl: string | null;
  ordem: number;
}

interface AtividadeBanco {
  id: string;
  nome: string;
  objetivo: string | null;
  materiais: string | null;
  como_conduzir: string | null;
  o_que_observar: string | null;
  pdf_url: string | null;
  ordem: number | null;
  ativo: boolean;
}

const mapBanco = (a: AtividadeBanco): AtividadePlanoItem => ({
  // Sem plano curado: a própria atividade do banco é o item. planoId = id dela.
  planoId: a.id,
  atividadeId: a.id,
  nome: a.nome,
  objetivo: a.objetivo ?? null,
  materiais: a.materiais ?? null,
  comoConduzir: a.como_conduzir ?? null,
  oQueObservar: a.o_que_observar ?? null,
  pdfUrl: a.pdf_url ?? null,
  ordem: a.ordem ?? 0,
});

/**
 * Atividades da turma para uma inteligência (a fase sendo lida).
 *
 * 1. PLANO CURADO (turma_atividade_plano): o vínculo turma + fase + atividade
 *    que o dono monta na tela de trilha, já ordenado. Tem prioridade.
 * 2. FALLBACK POR FAIXA: se não houver plano curado, cai no BANCO de atividades
 *    (tabela atividades) pela faixa da turma (turmas.serie == atividades.faixa)
 *    + inteligência. Assim tudo que o dono cadastra no banco por faixa aparece
 *    direto pro professor, sem precisar montar plano turma a turma.
 *
 * TOLERANTE POR DESIGN: qualquer falha ou ausência de tabela devolve [] em vez
 * de quebrar. O chamador usa o vazio como "sem atividade". Nenhuma turma quebra.
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

      // 1. Plano curado da turma (tem prioridade).
      try {
        const { data, error } = await fromAny('turma_atividade_plano')
          .select(
            'id, ordem, atividade:atividade_id (id, nome, objetivo, materiais, como_conduzir, o_que_observar, pdf_url, ativo)'
          )
          .eq('turma_id', turmaId!)
          .eq('ano_letivo', anoLetivo)
          .eq('inteligencia_id', inteligenciaId!)
          .eq('ativo', true)
          .order('ordem');
        if (!error && data) {
          const plano = (data as unknown as Array<{
            id: string;
            ordem: number;
            atividade: {
              id: string;
              nome: string;
              objetivo: string | null;
              materiais: string | null;
              como_conduzir: string | null;
              o_que_observar: string | null;
              pdf_url: string | null;
              ativo: boolean;
            } | null;
          }>)
            .filter((r) => r.atividade && r.atividade.ativo !== false)
            .map((r) => ({
              planoId: r.id,
              atividadeId: r.atividade!.id,
              nome: r.atividade!.nome,
              objetivo: r.atividade!.objetivo ?? null,
              materiais: r.atividade!.materiais ?? null,
              comoConduzir: r.atividade!.como_conduzir ?? null,
              oQueObservar: r.atividade!.o_que_observar ?? null,
              pdfUrl: r.atividade!.pdf_url ?? null,
              ordem: r.ordem,
            }));
          if (plano.length > 0) return plano;
        }
      } catch {
        // segue pro fallback
      }

      // 2. Fallback: banco de atividades pela faixa (serie) da turma.
      try {
        const { data: turma } = await fromAny('turmas')
          .select('serie, segmento, institution_id')
          .eq('id', turmaId!)
          .maybeSingle();
        const t = turma as {
          serie: string | null;
          segmento: string | null;
          institution_id: string | null;
        } | null;
        if (!t?.serie || !t.institution_id) return [];

        const { data, error } = await fromAny('atividades')
          .select('id, nome, objetivo, materiais, como_conduzir, o_que_observar, pdf_url, ordem, ativo')
          .eq('institution_id', t.institution_id)
          .eq('faixa', t.serie)
          .eq('inteligencia_id', inteligenciaId!)
          .eq('ativo', true)
          .order('ordem');
        if (error || !data) return [];
        return (data as unknown as AtividadeBanco[])
          .filter((a) => a.ativo !== false)
          .map(mapBanco);
      } catch {
        return [];
      }
    },
  });
};

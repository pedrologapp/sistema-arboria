import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// A tabela turma_fase_ordem pode não constar nos tipos gerados (feature nova).
// Acesso destipado + leitura tolerante: se a tabela/consulta falhar, a trilha
// cai no FALLBACK canônico (8 fases, posicao == inteligencia_id).
const fromAny = (tb: string) =>
  (supabase.from as never as (tb: string) => ReturnType<typeof supabase.from>)(tb);

const TOTAL_PADRAO = 8;

export interface InteligenciaFaseTurma {
  id: number;
  nome: string;
  codigo: string;
  cor_hex: string | null;
  emoji: string | null;
  brasao_url: string | null;
  descricao: string | null;
}

export interface FaseDaTurma {
  id: string;
  numero_fase: number;
  inteligencia: InteligenciaFaseTurma | null;
}

export interface FaseTurmaResult {
  /**
   * Posição da turma na trilha:
   *  0            = trilha não começou
   *  1..total     = fase (posição) em curso
   *  > total      = trilha concluída (ano encerrado, sem fase ativa)
   */
  ordem: number;
  /** Nº de fases ATIVAS da turma. 8 no fallback (turma sem configuração). */
  total: number;
  fase: FaseDaTurma | null;
  /**
   * Ordem configurada da turma: IDs de inteligência na ordem de percurso
   * (só as fases ATIVAS, posição 1..N). `null` quando a turma NÃO tem
   * configuração (fallback canônico: as 8 inteligências, ordem == id).
   */
  trilhaIntel: number[] | null;
}

/**
 * Fase atual DA TURMA (Infantil/F1/F2): lida da turma_trilha POR turma, com a
 * ORDEM/subconjunto configurados em turma_fase_ordem.
 *
 * DUAS RESPONSABILIDADES:
 *  1. Corrige o bug de professora com 2+ turmas: cada turma tem sua própria
 *     trilha (a turma A pode estar na fase 3 e a B na 1). Toda tela do professor
 *     que registra ou move trilha deve usar ESTE hook com a turma selecionada.
 *  2. Resolve a fase pela trilha CONFIGURADA da turma (turma_fase_ordem): a
 *     posição `ordem` mapeia para a inteligência daquela posição, e o TOTAL é o
 *     nº de fases ativas.
 *
 * GARANTIA DE FALLBACK (zero regressão): turma SEM linhas em turma_fase_ordem
 * segue EXATAMENTE o comportamento de produção: 8 fases fixas, posicao ==
 * inteligencia_id, total = 8, trilhaIntel = null. A leitura de turma_fase_ordem
 * é tolerante: qualquer erro/ausência cai no fallback.
 */
export const useFaseTurma = (
  turmaId?: string | null,
  institutionId?: string | null,
  segmento: string = 'infantil'
) => {
  return useQuery({
    queryKey: ['fase-turma', turmaId, segmento],
    enabled: !!turmaId && !!institutionId,
    queryFn: async (): Promise<FaseTurmaResult> => {
      const anoLetivo = new Date().getFullYear();

      // (1) Posição atual da turma.
      const { data: trilha, error } = await supabase
        .from('turma_trilha')
        .select('ordem_atual')
        .eq('turma_id', turmaId!)
        .eq('ano_letivo', anoLetivo)
        .maybeSingle();
      if (error) throw error;
      const ordem = (trilha?.ordem_atual as number | undefined) ?? 0;

      // (2) Ordem/subconjunto configurados (tolerante -> fallback canônico).
      let config: Array<{ posicao: number; inteligencia_id: number }> = [];
      try {
        const { data, error: e2 } = await fromAny('turma_fase_ordem')
          .select('posicao, inteligencia_id')
          .eq('turma_id', turmaId!)
          .eq('ano_letivo', anoLetivo)
          .order('posicao');
        if (!e2 && Array.isArray(data)) {
          config = (data as unknown as Array<{ posicao: number; inteligencia_id: number }>)
            .slice()
            .sort((a, b) => a.posicao - b.posicao);
        }
      } catch {
        /* fallback canônico */
      }

      const temConfig = config.length > 0;
      const total = temConfig ? config.length : TOTAL_PADRAO;
      const trilhaIntel = temConfig ? config.map((r) => r.inteligencia_id) : null;

      // Fora da faixa ativa (0 = não começou; > total = concluída): sem fase.
      if (ordem < 1 || ordem > total) {
        return { ordem, total, fase: null, trilhaIntel };
      }

      // Inteligência (Casa) da posição atual: configurada (posicao == ordem) ou
      // fallback ordinal (inteligencia_id == ordem).
      const inteligenciaId = temConfig
        ? config.find((r) => r.posicao === ordem)?.inteligencia_id ?? ordem
        : ordem;

      const { data: fase } = await supabase
        .from('fases')
        .select(
          `id, numero_fase,
           inteligencias!fases_inteligencia_id_fkey (
             id, nome, codigo, cor_hex, emoji, brasao_url, descricao
           )`
        )
        .eq('institution_id', institutionId!)
        .eq('segmento', segmento)
        .eq('ano_letivo', anoLetivo)
        .eq('inteligencia_id', inteligenciaId)
        .maybeSingle();

      return {
        ordem,
        total,
        trilhaIntel,
        fase: fase
          ? {
              id: fase.id,
              numero_fase: fase.numero_fase,
              inteligencia: (fase.inteligencias as unknown as InteligenciaFaseTurma) || null,
            }
          : null,
      };
    },
  });
};

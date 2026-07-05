import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  /** 0 = trilha não começou · 1..8 = fase em curso · 9 = as 8 explorações concluídas */
  ordem: number;
  fase: FaseDaTurma | null;
}

/**
 * Fase atual DA TURMA (Infantil): lida da turma_trilha POR turma.
 *
 * Corrige o bug de professora com 2+ turmas: o ProfessorContext deriva a
 * faseAtual só da primeira turma vinculada, mas cada turma tem sua própria
 * trilha (a turma A pode estar na fase 3 e a B na 1). Toda tela do Infantil
 * que registra ou move trilha deve usar ESTE hook com a turma selecionada: * senão a observação nasce presa à fase errada no rio longitudinal.
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

      const { data: trilha, error } = await supabase
        .from('turma_trilha')
        .select('ordem_atual')
        .eq('turma_id', turmaId!)
        .eq('ano_letivo', anoLetivo)
        .maybeSingle();
      if (error) throw error;

      const ordem = (trilha?.ordem_atual as number | undefined) ?? 0;
      if (ordem < 1 || ordem > 8) {
        // 0 = ainda não começou; 9 = trilha completa (ano encerrado, sem fase ativa)
        return { ordem, fase: null };
      }

      // ordem == inteligencia_id (1..8) na sequência recomendada
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
        .eq('inteligencia_id', ordem)
        .maybeSingle();

      return {
        ordem,
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

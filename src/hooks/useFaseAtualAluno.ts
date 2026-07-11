import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { F2_ALUNO_FASE_TRILHA } from '@/config/f2AlunoFase';

export interface FaseAtualAluno {
  inteligenciaId: number;
  nome: string;
  corHex: string | null;
  emoji: string | null;
}

/**
 * Fase ATUAL da turma do aluno (a Casa da vez), resolvida pela trilha via RPC
 * fase_atual_do_aluno() (SECURITY DEFINER, escopo auth.uid()).
 *
 * Devolve null quando: a flag esta desligada (a query nem roda), nao ha fase
 * (nao comecou / concluida / sem provisao), ou qualquer erro. Nesses casos a
 * home cai no comportamento atual (fase por data). Nenhuma tela quebra.
 */
export const useFaseAtualAluno = () => {
  return useQuery({
    queryKey: ['fase-atual-aluno'],
    enabled: F2_ALUNO_FASE_TRILHA,
    retry: false,
    staleTime: 60_000,
    queryFn: async (): Promise<FaseAtualAluno | null> => {
      try {
        const { data, error } = await (
          supabase as unknown as {
            rpc: (fn: string) => Promise<{ data: unknown; error: unknown }>;
          }
        ).rpc('fase_atual_do_aluno');
        if (error || !Array.isArray(data) || data.length === 0) return null;
        const r = data[0] as {
          inteligencia_id: number;
          nome: string;
          cor_hex: string | null;
          emoji: string | null;
        };
        return {
          inteligenciaId: r.inteligencia_id,
          nome: r.nome,
          corHex: r.cor_hex ?? null,
          emoji: r.emoji ?? null,
        };
      } catch {
        return null;
      }
    },
  });
};

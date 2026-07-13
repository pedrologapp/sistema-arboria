import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStudent } from '@/contexts/StudentContext';
import { F2_ALUNO_HOME_NOVA } from '@/config/f2AlunoHomeNova';

const sb = supabase as any;

export interface CapituloHome {
  id: string;
  nome: string;
  frase_ancora: string | null;
  /** Nome do time/papel do aluno, se ele estiver alocado. null quando sem alocacao. */
  timeNome: string | null;
  /** Dias ate o evento (por turma). null quando nao ha data. */
  dias: number | null;
}

const calcularDias = (data: string | null): number | null => {
  if (!data) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const evento = new Date(data + 'T00:00:00');
  return Math.ceil((evento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Capitulo ATIVO da fase da turma do aluno, para o cartao de destaque da HomeNova.
 * Reaproveita o mesmo caminho do CapituloPage: aluno_turma -> capitulos (fase_id +
 * ativo) -> capitulo_turma_config (data_evento) -> capitulo_alocacoes do aluno ->
 * nome do papel/time.
 *
 * So roda com o flag F2_ALUNO_HOME_NOVA ligado. Devolve null quando nao ha capitulo
 * ativo (o cartao nao renderiza). Nenhum erro derruba a home.
 */
export const useCapituloHome = (): { capitulo: CapituloHome | null; isLoading: boolean } => {
  const { user } = useAuth();
  const { profile, faseAtual } = useStudent();

  const enabled =
    F2_ALUNO_HOME_NOVA && !!user?.id && !!faseAtual?.id && !!profile?.institution_id;

  const { data, isLoading } = useQuery({
    queryKey: ['capitulo-home', user?.id, faseAtual?.id, profile?.institution_id],
    enabled,
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<CapituloHome | null> => {
      try {
        const { data: cap } = await sb
          .from('capitulos')
          .select('id, nome, frase_ancora')
          .eq('institution_id', profile!.institution_id)
          .eq('fase_id', faseAtual!.id)
          .eq('ativo', true)
          .maybeSingle();
        if (!cap) return null;

        const { data: at } = await sb
          .from('aluno_turma')
          .select('turma_id')
          .eq('aluno_id', user!.id)
          .eq('ativo', true)
          .limit(1)
          .maybeSingle();
        const turmaId = (at?.turma_id as string | undefined) ?? null;

        let dias: number | null = null;
        let timeNome: string | null = null;

        if (turmaId) {
          const [cfgRes, alocRes] = await Promise.all([
            sb
              .from('capitulo_turma_config')
              .select('data_evento')
              .eq('capitulo_id', cap.id)
              .eq('turma_id', turmaId)
              .maybeSingle(),
            sb
              .from('capitulo_alocacoes')
              .select('papel_id')
              .eq('capitulo_id', cap.id)
              .eq('turma_id', turmaId)
              .eq('aluno_id', user!.id)
              .maybeSingle(),
          ]);

          dias = calcularDias(cfgRes.data?.data_evento ?? null);

          if (alocRes.data?.papel_id) {
            const { data: papel } = await sb
              .from('capitulo_papeis')
              .select('nome')
              .eq('id', alocRes.data.papel_id)
              .maybeSingle();
            timeNome = (papel?.nome as string | undefined) ?? null;
          }
        }

        return {
          id: cap.id as string,
          nome: cap.nome as string,
          frase_ancora: (cap.frase_ancora as string | null) ?? null,
          timeNome,
          dias,
        };
      } catch {
        return null;
      }
    },
  });

  return { capitulo: data ?? null, isLoading };
};

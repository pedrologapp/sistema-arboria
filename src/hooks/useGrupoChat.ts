import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// As tabelas do Capítulo (capitulos, capitulo_alocacoes, capitulo_papeis,
// capitulo_grupo_canais) podem não estar nos tipos gerados do Supabase. Como as
// telas do Capítulo já fazem, acessamos via `sb` (any) pra não quebrar o build.
const sb = supabase as any;

export interface MeuCanalGrupo {
  canalId: string;
  canalNome: string | null;
  capituloId: string;
  capituloNome: string;
  capituloAtivo: boolean;
  turmaId: string;
  papelId: string;
  grupo: number;
}

/**
 * Descobre o canal do GRUPO do aluno no capítulo ativo da fase dele.
 *
 * Caminho: capítulo ativo da fase -> minha alocação de categoria 'time' nesse
 * capítulo (papel_id + turma_id + grupo) -> o canal correspondente em
 * `capitulo_grupo_canais`. Retorna null se o aluno não tem grupo, se o capítulo
 * não está ativo, ou se o canal ainda não foi aberto pelo mentor (o aluno não
 * pode criar o canal — isso é garantido pelo mentor na tela do Capítulo).
 */
export function useMeuCanalGrupo(params: {
  faseId: string | null | undefined;
  alunoId: string | null | undefined;
  institutionId: string | null | undefined;
}) {
  const { faseId, alunoId, institutionId } = params;
  return useQuery<MeuCanalGrupo | null>({
    queryKey: ['meu-canal-grupo', faseId, alunoId],
    enabled: !!faseId && !!alunoId && !!institutionId,
    staleTime: 30000,
    queryFn: async () => {
      // 1. Capítulo ativo da fase do aluno.
      const { data: cap } = await sb
        .from('capitulos')
        .select('id, nome, ativo')
        .eq('fase_id', faseId)
        .eq('institution_id', institutionId)
        .eq('ativo', true)
        .maybeSingle();
      if (!cap) return null;

      // 2. Minhas alocações nesse capítulo (a RLS já filtra pra este aluno).
      const { data: alocs } = await sb
        .from('capitulo_alocacoes')
        .select('papel_id, turma_id, grupo')
        .eq('capitulo_id', cap.id)
        .eq('aluno_id', alunoId);
      if (!alocs || alocs.length === 0) return null;

      // 3. Qual dessas alocações é de um papel de categoria 'time' (o tema).
      const papelIds = [...new Set(alocs.map((a: any) => a.papel_id))];
      const { data: papeis } = await sb
        .from('capitulo_papeis')
        .select('id, categoria')
        .in('id', papelIds);
      const timeIds = new Set(
        (papeis || []).filter((p: any) => p.categoria === 'time').map((p: any) => p.id)
      );
      const minha = alocs.find((a: any) => timeIds.has(a.papel_id));
      if (!minha) return null;
      const grupo = minha.grupo ?? 1;

      // 4. O canal daquele (capítulo, turma, papel, grupo). Só existe se o mentor
      //    dividiu o tema em grupos (o mentor garante os canais). Sem canal, não
      //    há chat de grupo pra este aluno.
      const { data: canal } = await sb
        .from('capitulo_grupo_canais')
        .select('id, nome')
        .eq('capitulo_id', cap.id)
        .eq('turma_id', minha.turma_id)
        .eq('papel_id', minha.papel_id)
        .eq('grupo', grupo)
        .maybeSingle();
      if (!canal) return null;

      return {
        canalId: canal.id,
        canalNome: canal.nome ?? null,
        capituloId: cap.id,
        capituloNome: cap.nome,
        capituloAtivo: !!cap.ativo,
        turmaId: minha.turma_id,
        papelId: minha.papel_id,
        grupo,
      };
    },
  });
}

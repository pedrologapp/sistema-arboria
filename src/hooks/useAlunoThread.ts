import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ObservacaoThread {
  id: string;
  texto: string;
  data: string;        // data_observacao (YYYY-MM-DD)
  dataHora: string;    // created_at (quando foi escrito — data + hora)
  origem: string;      // 'manual' | 'caixa_hipotese' | 'ia_rascunho' | ...
  faseNome: string;    // nome da inteligência da fase (agrupador)
  anexoUrl?: string;   // signed URL da foto do trabalho (bucket privado 'observacoes')
}

export interface AlunoThreadData {
  aluno: {
    id: string;
    nome: string;
    avatarUrl?: string;
    serie?: string;
    turma?: string;
  } | null;
  turmaId: string | null;
  observacoes: ObservacaoThread[];
}

/**
 * Lê o "rio" de observações de um aluno como uma conversa (ordem cronológica),
 * com o nome da fase de cada registro para agrupar. Inc.2 da reforma Infantil.
 */
export const useAlunoThread = (alunoId?: string) => {
  return useQuery({
    queryKey: ['aluno-thread', alunoId],
    enabled: !!alunoId,
    queryFn: async (): Promise<AlunoThreadData> => {
      if (!alunoId) throw new Error('alunoId ausente');

      // 1. Dados do aluno
      const { data: aluno } = await supabase
        .from('profiles')
        .select('id, full_name, nome, sobrenome, avatar_url, serie, turma')
        .eq('id', alunoId)
        .single();

      // 2. Turma atual (para registrar observações)
      const { data: at } = await supabase
        .from('aluno_turma')
        .select('turma_id')
        .eq('aluno_id', alunoId)
        .eq('ativo', true)
        .maybeSingle();

      // 3. Observações (ordem cronológica = conversa)
      const { data: obs } = await supabase
        .from('observacoes')
        .select('id, observacao_texto, data_observacao, created_at, fase_id, origem, anexo_url')
        .eq('aluno_id', alunoId)
        .order('data_observacao', { ascending: true })
        .order('created_at', { ascending: true });

      // 4. Mapa fase_id -> nome da inteligência (para o agrupador)
      const faseIds = [...new Set((obs || []).map((o) => o.fase_id).filter(Boolean))];
      const faseNomeMap = new Map<string, string>();
      if (faseIds.length > 0) {
        const { data: fases } = await supabase
          .from('fases')
          .select('id, inteligencia_id')
          .in('id', faseIds);
        const intelIds = [...new Set((fases || []).map((f) => f.inteligencia_id))];
        const { data: intels } = await supabase
          .from('inteligencias')
          .select('id, nome')
          .in('id', intelIds.length > 0 ? intelIds : [0]);
        const intelMap = new Map((intels || []).map((i) => [i.id, i.nome]));
        for (const f of fases || []) {
          faseNomeMap.set(f.id, intelMap.get(f.inteligencia_id) || 'Fase');
        }
      }

      // 5. Signed URLs das fotos anexadas (bucket privado 'observacoes').
      //    A coluna anexo_url guarda o CAMINHO no storage; gera-se a URL em paralelo.
      const anexoUrlMap = new Map<string, string>();
      const comAnexo = (obs || [])
        .map((o) => ({ id: o.id, path: (o as { anexo_url?: string }).anexo_url }))
        .filter((o): o is { id: string; path: string } => !!o.path);
      if (comAnexo.length > 0) {
        const signed = await Promise.all(
          comAnexo.map(async ({ id, path }) => {
            const { data: s } = await supabase.storage
              .from('observacoes')
              .createSignedUrl(path, 3600);
            return { id, url: s?.signedUrl };
          })
        );
        for (const { id, url } of signed) {
          if (url) anexoUrlMap.set(id, url);
        }
      }

      const nomeCompleto =
        aluno?.full_name ||
        [aluno?.nome, aluno?.sobrenome].filter(Boolean).join(' ') ||
        'Aluno';

      return {
        aluno: aluno
          ? {
              id: aluno.id,
              nome: nomeCompleto,
              avatarUrl: aluno.avatar_url || undefined,
              serie: aluno.serie || undefined,
              turma: aluno.turma || undefined,
            }
          : null,
        turmaId: at?.turma_id || null,
        observacoes: (obs || []).map((o) => ({
          id: o.id,
          texto: o.observacao_texto || '',
          data: o.data_observacao,
          dataHora: o.created_at || o.data_observacao,
          origem: (o as { origem?: string }).origem || 'manual',
          faseNome: o.fase_id ? faseNomeMap.get(o.fase_id) || 'Fase' : 'Sem fase',
          anexoUrl: anexoUrlMap.get(o.id),
        })),
      };
    },
  });
};

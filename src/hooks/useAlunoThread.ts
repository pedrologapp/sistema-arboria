import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ObservacaoThread {
  id: string;
  texto: string;
  data: string;        // data_observacao (YYYY-MM-DD)
  dataHora: string;    // created_at (quando foi escrito; data + hora)
  origem: string;      // 'manual' | 'caixa_hipotese' | 'ia_rascunho' | ...
  faseNome: string;    // nome da inteligência da fase (agrupador)
  anexoUrl?: string;   // signed URL da foto do trabalho (bucket privado 'observacoes')
  professorId?: string;   // quem escreveu (thread é compartilhado entre professores da turma)
  professorNome?: string; // primeiro nome de quem escreveu (autoria visível quando não for quem lê)
  origemCaptura?: string; // 'aula' | 'diario' | 'capitulo' | undefined (legado não rotulado)
  atividadeId?: string;   // atividade da aula (quando origemCaptura='aula')
  atividadeNome?: string; // nome da atividade, para a referência clicável no Diário
  capituloId?: string;    // capítulo (quando origemCaptura='capitulo', F2)
  capituloNome?: string;  // nome do capítulo, para a referência "Na apresentação"
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

      // 2. Turma atual (para registrar observações). Um aluno pode ter MAIS DE UM
      //    vínculo ativo (ex.: matriculado em 2 turmas). Com maybeSingle isso
      //    erra e bloqueia o registro (podeRegistrar=false). Pegamos um vínculo
      //    ativo de forma determinística (ano letivo mais recente, depois o
      //    criado mais recentemente) em vez de tratar 2 vínculos como erro.
      const { data: ats } = await supabase
        .from('aluno_turma')
        .select('turma_id')
        .eq('aluno_id', alunoId)
        .eq('ativo', true)
        .order('ano_letivo', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);
      const at = ats?.[0] ?? null;

      // 3. Observações (ordem cronológica = conversa): excluídas (soft-delete) ficam fora
      const { data: obs } = await supabase
        .from('observacoes')
        .select('id, observacao_texto, data_observacao, created_at, fase_id, origem, origem_captura, atividade_id, capitulo_id, anexo_url, professor_id')
        .eq('aluno_id', alunoId)
        .is('excluida_em' as never, null)
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

      // 4a. Mapa atividade_id -> nome (referência "feita na aula" clicável). Lê
      //     atividades pela RLS normal (auto-protegido por instituição, Riscos).
      const atividadeIds = [
        ...new Set((obs || []).map((o) => (o as { atividade_id?: string }).atividade_id).filter(Boolean)),
      ] as string[];
      const atividadeNomeMap = new Map<string, string>();
      if (atividadeIds.length > 0) {
        const { data: ativs } = await supabase
          .from('atividades')
          .select('id, nome')
          .in('id', atividadeIds);
        for (const a of ativs || []) atividadeNomeMap.set(a.id, a.nome);
      }

      // 4a-bis. Mapa capitulo_id -> nome (referência "Na apresentação", F2).
      const capituloIds = [
        ...new Set((obs || []).map((o) => (o as { capitulo_id?: string }).capitulo_id).filter(Boolean)),
      ] as string[];
      const capituloNomeMap = new Map<string, string>();
      if (capituloIds.length > 0) {
        const { data: caps } = await (supabase.from as never as (t: string) => ReturnType<typeof supabase.from>)('capitulos')
          .select('id, nome')
          .in('id', capituloIds);
        for (const c of caps || []) capituloNomeMap.set((c as { id: string }).id, (c as { nome: string }).nome);
      }

      // 4b. Nome de quem escreveu (o thread é compartilhado: titular + auxiliar
      //     precisam se enxergar; a autoria só é EXIBIDA quando não é quem lê).
      const professorIds = [
        ...new Set((obs || []).map((o) => (o as { professor_id?: string }).professor_id).filter(Boolean)),
      ] as string[];
      const professorNomeMap = new Map<string, string>();
      if (professorIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, nome')
          .in('id', professorIds);
        for (const p of profs || []) {
          const nome = (p.nome || p.full_name || '').split(' ')[0];
          if (nome) professorNomeMap.set(p.id, nome);
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
          faseNome: o.fase_id ? faseNomeMap.get(o.fase_id) || 'Fase' : 'Registro avulso',
          anexoUrl: anexoUrlMap.get(o.id),
          professorId: (o as { professor_id?: string }).professor_id,
          professorNome: (o as { professor_id?: string }).professor_id
            ? professorNomeMap.get((o as { professor_id?: string }).professor_id!)
            : undefined,
          origemCaptura: (o as { origem_captura?: string }).origem_captura || undefined,
          atividadeId: (o as { atividade_id?: string }).atividade_id || undefined,
          atividadeNome: (o as { atividade_id?: string }).atividade_id
            ? atividadeNomeMap.get((o as { atividade_id?: string }).atividade_id!)
            : undefined,
          capituloId: (o as { capitulo_id?: string }).capitulo_id || undefined,
          capituloNome: (o as { capitulo_id?: string }).capitulo_id
            ? capituloNomeMap.get((o as { capitulo_id?: string }).capitulo_id!)
            : undefined,
        })),
      };
    },
  });
};

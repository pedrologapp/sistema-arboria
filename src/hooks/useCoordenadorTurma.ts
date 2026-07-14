import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const fromAny = (tb: string) =>
  (supabase.from as never as (tb: string) => ReturnType<typeof supabase.from>)(tb);

const TOTAL_FASES = 8;

const nomeCurto = (p: { full_name?: string | null; nome?: string | null; sobrenome?: string | null }) =>
  p.full_name || [p.nome, p.sobrenome].filter(Boolean).join(' ') || 'Aluno';

export interface CoordenadorTurmaAluno {
  id: string;
  nome: string;
  avatarUrl?: string;
  /** Já tem ao menos uma observação NA FASE corrente (ponto aceso na lista). */
  observadoNaFase: boolean;
  /** Total de observações do aluno nesta turma (todas as fases). Identifica quem tem registro. */
  nObs: number;
}

export interface CoordenadorTurmaMural {
  id: string;
  alunoId: string | null;
  alunoNome: string | null;
  professorNome: string | null;
  texto: string;
  createdAt: string;
}

export interface CoordenadorTurmaDetalhe {
  turmaId: string;
  nome: string;
  serie: string;
  segmento: string;
  professorNome: string | null;
  /** Posição na trilha: 0 = não iniciada; 1..8 = fase em curso. */
  ordemAtual: number;
  totalFases: number;
  faseNome: string | null;
  faseCor: string | null;
  iniciadaEm: string | null;
  nAlunos: number;
  nObservados: number;
  alunos: CoordenadorTurmaAluno[];
  /** Mural da turma: todas as observações (recentes primeiro), com nomes resolvidos. */
  mural: CoordenadorTurmaMural[];
}

/**
 * Detalhe de UMA turma para o visor do coordenador: cabeçalho (turma, professor),
 * trilha do ano, e a lista de alunos com o sinal de OBSERVADO na fase corrente.
 *
 * O ponto "observado na fase" é uma leitura de COBERTURA (o professor já viu esta
 * criança nesta fase?), nunca um atributo da criança: o ponto apagado significa
 * "ainda não observado", jamais "silêncio de mecanismo" nem "aluno com pouca
 * observação". A lista fica em ordem alfabética estável.
 *
 * A fase corrente é resolvida pelo mapa canônico (posição == inteligencia_id);
 * quando a trilha ainda não começou (ordem 0), ninguém aparece como observado,
 * o estado natural de uma fase que não rodou.
 */
export const useCoordenadorTurma = (turmaId?: string | null, institutionId?: string | null) => {
  return useQuery({
    queryKey: ['coordenador-turma', turmaId, institutionId ?? null],
    enabled: !!turmaId,
    retry: false,
    staleTime: 30_000,
    queryFn: async (): Promise<CoordenadorTurmaDetalhe | null> => {
      if (!turmaId) return null;

      const [painelRes, profRes, alunosRes] = await Promise.all([
        fromAny('vw_coordenador_turma_painel')
          .select('turma_id, nome, serie, segmento, ordem_atual, iniciada_em, n_alunos, n_observados_fase')
          .eq('turma_id', turmaId)
          .maybeSingle(),
        supabase
          .from('professor_turma')
          .select('professor_id')
          .eq('turma_id', turmaId)
          .eq('ativo', true),
        supabase
          .from('aluno_turma')
          .select('aluno_id, profiles!inner ( id, full_name, nome, sobrenome, avatar_url )')
          .eq('turma_id', turmaId)
          .eq('ativo', true),
      ]);

      const painel = painelRes.data as {
        turma_id: string;
        nome: string;
        serie: string | number | null;
        segmento: string | null;
        ordem_atual: number | null;
        iniciada_em: string | null;
        n_alunos: number | null;
        n_observados_fase: number | null;
      } | null;
      if (!painel) return null; // fora do escopo do coordenador (RLS) ou turma inexistente

      const ordem = painel.ordem_atual ?? 0;
      const segmento = painel.segmento || '';

      // Perfil do professor buscado à parte (professor_turma.professor_id →
      // auth.users, não profiles; o embed falharia).
      const professorIds = ((profRes.data as Array<{ professor_id: string | null }> | null) || [])
        .map((r) => r.professor_id)
        .filter(Boolean) as string[];
      let professorNome: string | null = null;
      if (professorIds.length > 0) {
        const { data: pp } = await supabase
          .from('profiles')
          .select('id, full_name, nome, sobrenome')
          .in('id', professorIds);
        professorNome = ((pp as any[] | null) || []).map((p) => nomeCurto(p)).filter(Boolean)[0] ?? null;
      }

      const alunosRaw = ((alunosRes.data as any[] | null) || []).map((r) => r.profiles as {
        id: string;
        full_name?: string | null;
        nome?: string | null;
        sobrenome?: string | null;
        avatar_url?: string | null;
      });

      // Fase corrente (canônica: inteligencia_id == ordem) para nome/cor e fase_id.
      let faseId: string | null = null;
      let faseNome: string | null = null;
      let faseCor: string | null = null;
      if (ordem >= 1 && ordem <= TOTAL_FASES && institutionId) {
        const anoLetivo = new Date().getFullYear();
        const { data: fase } = await supabase
          .from('fases')
          .select('id, inteligencias!fases_inteligencia_id_fkey ( nome, cor_hex )')
          .eq('institution_id', institutionId)
          .eq('inteligencia_id', ordem)
          .eq('ano_letivo', anoLetivo)
          .eq('segmento', segmento || 'infantil')
          .maybeSingle();
        if (fase) {
          faseId = (fase as { id: string }).id;
          const intel = (fase as any).inteligencias as { nome?: string; cor_hex?: string } | null;
          faseNome = intel?.nome ?? null;
          faseCor = intel?.cor_hex ?? null;
        }
      }

      // Observações da turma numa leitura só (recentes primeiro): serve ao mural,
      // à contagem por aluno e à cobertura da fase corrente.
      const observados = new Set<string>();
      const countByAluno = new Map<string, number>();
      let mural: CoordenadorTurmaMural[] = [];
      {
        const { data: obsRaw } = await fromAny('observacoes')
          .select('id, aluno_id, professor_id, fase_id, observacao_texto, created_at')
          .eq('turma_id', turmaId)
          .is('excluida_em', null)
          .order('created_at', { ascending: false })
          .limit(100);
        const obs = (obsRaw as Array<{
          id: string;
          aluno_id: string | null;
          professor_id: string | null;
          fase_id: string | null;
          observacao_texto: string | null;
          created_at: string;
        }> | null) || [];

        // Nomes: aluno já temos em alunosRaw; professor buscamos os distintos.
        const nomeAluno = new Map<string, string>();
        for (const a of alunosRaw) nomeAluno.set(a.id, nomeCurto(a));
        const profIds = [...new Set(obs.map((o) => o.professor_id).filter(Boolean) as string[])];
        const nomeProf = new Map<string, string>();
        if (profIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name, nome, sobrenome')
            .in('id', profIds);
          for (const p of (profs as any[] | null) || []) {
            nomeProf.set(p.id, nomeCurto(p).split(' ')[0]);
          }
        }

        for (const o of obs) {
          if (o.aluno_id) countByAluno.set(o.aluno_id, (countByAluno.get(o.aluno_id) || 0) + 1);
          if (faseId && o.fase_id === faseId && o.aluno_id) observados.add(o.aluno_id);
        }
        mural = obs.map((o) => ({
          id: o.id,
          alunoId: o.aluno_id,
          alunoNome: o.aluno_id ? nomeAluno.get(o.aluno_id) ?? null : null,
          professorNome: o.professor_id ? nomeProf.get(o.professor_id) ?? null : null,
          texto: o.observacao_texto || '',
          createdAt: o.created_at,
        }));
      }

      const alunos: CoordenadorTurmaAluno[] = alunosRaw
        .map((a) => ({
          id: a.id,
          nome: nomeCurto(a),
          avatarUrl: a.avatar_url || undefined,
          observadoNaFase: observados.has(a.id),
          nObs: countByAluno.get(a.id) || 0,
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome));

      return {
        turmaId: painel.turma_id,
        nome: painel.nome,
        serie: painel.serie == null ? '' : String(painel.serie),
        segmento,
        professorNome,
        ordemAtual: ordem,
        totalFases: TOTAL_FASES,
        faseNome,
        faseCor,
        iniciadaEm: painel.iniciada_em,
        nAlunos: painel.n_alunos ?? alunos.length,
        nObservados: painel.n_observados_fase ?? observados.size,
        alunos,
        mural,
      };
    },
  });
};

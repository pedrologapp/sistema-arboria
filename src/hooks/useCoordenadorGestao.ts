import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// A view e as tabelas do coordenador podem ainda não constar nos tipos gerados
// (migration aplicada em paralelo). Acesso destipado + leitura tolerante.
const fromAny = (tb: string) =>
  (supabase.from as never as (tb: string) => ReturnType<typeof supabase.from>)(tb);

const TOTAL_FASES = 8;

export interface MuralEvento {
  id: string;
  professorNome: string | null;
  alunoNome: string | null;
  texto: string;
  createdAt: string;
}

export interface CoordenadorTurmaCard {
  turmaId: string;
  nome: string;
  serie: string;
  segmento: string;
  professorNome: string | null;
  /** ISO do último sinal de atividade (o mais recente entre os professores da turma). */
  ultimaAtividade: string | null;
  /** Posição na trilha: 0 = não iniciada; 1..8 = fase em curso. */
  ordemAtual: number;
  /** Nome da inteligência da fase corrente (mapa canônico ordem == id). */
  faseNome: string | null;
  totalFases: number;
  nAlunos: number;
  nObservados: number;
  mural: MuralEvento[];
  /** Cores das 8 fases da trilha, na ordem (índice 0 = fase 1), da cor de cada Casa/inteligência. */
  coresTrilha: string[];
  /** Atividades da fase corrente: total montado e quantas já concluídas. */
  atividadesTotal: number;
  atividadesFeitas: number;
}

export interface SerieGrupo {
  serie: string;
  serieLabel: string;
  turmas: CoordenadorTurmaCard[];
}

const nomeCurto = (p: { full_name?: string | null; nome?: string | null; sobrenome?: string | null }) =>
  p.full_name || [p.nome, p.sobrenome].filter(Boolean).join(' ') || null;

const serieLabelDe = (serie: string) =>
  /^\d+$/.test(serie) ? `${serie}º ano` : serie;

/**
 * Dados da aba GESTÃO do coordenador: uma linha por série, cada série com suas
 * turmas (A/B/C). Por turma: cobertura da fase ("X de N observados", que é
 * medida da COBERTURA DO PROFESSOR, nunca atributo da criança), trilha, sinal de
 * último acesso e um trecho do mural (texto das observações).
 *
 * O ESCOPO é imposto no banco: a view vw_coordenador_turma_painel e as policies
 * só devolvem as turmas do segmento concedido ao coordenador. A UI não filtra
 * acesso; só apresenta o que o banco liberou.
 *
 * TOLERANTE: sem concessão (nenhuma linha em coordenador_segmento) ou antes da
 * migration, devolve lista vazia, e a página mostra o estado vazio.
 */
export const useCoordenadorGestao = () => {
  return useQuery({
    queryKey: ['coordenador-gestao'],
    retry: false,
    staleTime: 30_000,
    queryFn: async (): Promise<SerieGrupo[]> => {
      // 1. Painel por turma (view; RLS já restringe ao escopo do coordenador).
      const { data: painel, error } = await fromAny('vw_coordenador_turma_painel')
        .select('turma_id, nome, serie, segmento, ordem_atual, iniciada_em, n_alunos, n_observados_fase');
      if (error || !painel || (painel as unknown[]).length === 0) return [];

      const linhas = painel as Array<{
        turma_id: string;
        nome: string;
        serie: string | number | null;
        segmento: string | null;
        ordem_atual: number | null;
        iniciada_em: string | null;
        n_alunos: number | null;
        n_observados_fase: number | null;
      }>;
      const turmaIds = linhas.map((l) => l.turma_id);

      // Último acesso REAL (login) por turma, via função SECURITY DEFINER que lê
      // auth.users.last_sign_in_at. Tolerante: se a função ainda não existir,
      // cai no fallback (ultima_atividade do professor), sem quebrar a Gestão.
      const acessoPorTurma = new Map<string, string>();
      try {
        const { data: acesso } = await (supabase.rpc as never as (fn: string) => Promise<{
          data: Array<{ turma_id: string; ultimo_acesso: string | null }> | null;
        }>)('get_coordenador_turma_acesso');
        for (const r of acesso || []) {
          if (r.ultimo_acesso) acessoPorTurma.set(r.turma_id, r.ultimo_acesso);
        }
      } catch {
        /* função ausente ou sem permissão: usa o fallback abaixo */
      }

      // Progresso de atividades da fase (tolerante, igual ao acesso).
      const atividadesPorTurma = new Map<string, { total: number; feitas: number }>();
      try {
        const { data: atv } = await (supabase.rpc as never as (fn: string) => Promise<{
          data: Array<{ turma_id: string; total: number | null; feitas: number | null }> | null;
        }>)('get_coordenador_turma_atividades');
        for (const r of atv || []) {
          atividadesPorTurma.set(r.turma_id, { total: r.total ?? 0, feitas: r.feitas ?? 0 });
        }
      } catch {
        /* função ausente: o indicador some, sem quebrar */
      }

      // 2-4 em paralelo: professores da turma, inteligências e mural.
      const [profTurmaRes, intelRes, obsRes] = await Promise.all([
        supabase
          .from('professor_turma')
          .select('turma_id, professor_id')
          .in('turma_id', turmaIds)
          .eq('ativo', true),
        supabase.from('inteligencias').select('id, nome, cor_hex'),
        supabase
          .from('observacoes')
          .select('id, turma_id, observacao_texto, created_at, professor_id, aluno_id')
          .in('turma_id', turmaIds)
          .is('excluida_em' as never, null)
          .order('created_at', { ascending: false })
          .limit(Math.min(300, turmaIds.length * 8)),
      ]);

      // Mapa inteligência id -> nome (trilha canônica: ordem == inteligencia_id).
      const intelNome = new Map<number, string>();
      const intelCor = new Map<number, string>();
      for (const i of (intelRes.data as Array<{ id: number; nome: string; cor_hex: string | null }> | null) || []) {
        intelNome.set(i.id, i.nome);
        if (i.cor_hex) intelCor.set(i.id, i.cor_hex);
      }
      // Cores das 8 fases (trilha canônica: fase == inteligencia_id 1..8).
      const coresTrilha = Array.from({ length: TOTAL_FASES }, (_, i) => intelCor.get(i + 1) ?? '#5E8BD8');

      // Perfis dos professores buscados À PARTE: professor_turma.professor_id
      // referencia auth.users, não profiles, então o embed 'profiles!inner'
      // falharia (e derrubava o nome de TODAS as turmas). Buscamos por id.
      const profTurmaRows =
        (profTurmaRes.data as Array<{ turma_id: string; professor_id: string | null }> | null) || [];
      const professorIds = [...new Set(profTurmaRows.map((r) => r.professor_id).filter(Boolean) as string[])];
      const perfilProf = new Map<string, { nome: string | null; ultima: string | null }>();
      if (professorIds.length > 0) {
        const { data: pp } = await supabase
          .from('profiles')
          .select('id, full_name, nome, sobrenome, ultima_atividade')
          .in('id', professorIds);
        for (const p of (pp as any[] | null) || []) {
          perfilProf.set(p.id, { nome: nomeCurto(p) || null, ultima: p.ultima_atividade ?? null });
        }
      }

      // Professores por turma: nome (primeiro por ordem) + último acesso (o mais recente).
      const profPorTurma = new Map<string, { nomes: string[]; ultima: string | null }>();
      for (const row of profTurmaRows) {
        if (!row.professor_id) continue;
        const perfil = perfilProf.get(row.professor_id);
        const entry = profPorTurma.get(row.turma_id) || { nomes: [], ultima: null };
        if (perfil?.nome) entry.nomes.push(perfil.nome);
        if (perfil?.ultima && (!entry.ultima || perfil.ultima > entry.ultima)) {
          entry.ultima = perfil.ultima;
        }
        profPorTurma.set(row.turma_id, entry);
      }

      // Mural: agrupa por turma, no máximo 2 eventos mais recentes por turma.
      const obs = (obsRes.data as Array<{
        id: string;
        turma_id: string;
        observacao_texto: string | null;
        created_at: string;
        professor_id: string | null;
        aluno_id: string | null;
      }> | null) || [];

      // Resolver nomes de professor e aluno do mural em uma consulta.
      const idsPessoas = [
        ...new Set(
          obs.flatMap((o) => [o.professor_id, o.aluno_id]).filter(Boolean) as string[]
        ),
      ];
      const nomePorId = new Map<string, string>();
      if (idsPessoas.length > 0) {
        const { data: pessoas } = await supabase
          .from('profiles')
          .select('id, full_name, nome, sobrenome')
          .in('id', idsPessoas);
        for (const p of (pessoas as any[] | null) || []) {
          const nome = nomeCurto(p);
          if (nome) nomePorId.set(p.id, nome.split(' ')[0]);
        }
      }

      const muralPorTurma = new Map<string, MuralEvento[]>();
      for (const o of obs) {
        const lista = muralPorTurma.get(o.turma_id) || [];
        if (lista.length >= 6) continue; // já ordenado desc: os mais recentes primeiro; o card rola por dentro
        lista.push({
          id: o.id,
          professorNome: o.professor_id ? nomePorId.get(o.professor_id) ?? null : null,
          alunoNome: o.aluno_id ? nomePorId.get(o.aluno_id) ?? null : null,
          texto: o.observacao_texto || '',
          createdAt: o.created_at,
        });
        muralPorTurma.set(o.turma_id, lista);
      }

      // Monta os cards.
      const cards: CoordenadorTurmaCard[] = linhas.map((l) => {
        const serie = l.serie == null ? '' : String(l.serie);
        const ordem = l.ordem_atual ?? 0;
        const prof = profPorTurma.get(l.turma_id);
        const faseNome =
          ordem >= 1 && ordem <= TOTAL_FASES ? intelNome.get(ordem) ?? null : null;
        return {
          turmaId: l.turma_id,
          nome: l.nome,
          serie,
          segmento: l.segmento || '',
          professorNome: prof?.nomes[0] ?? null,
          // Preferência: login real (auth); fallback: última ação rastreada.
          ultimaAtividade: acessoPorTurma.get(l.turma_id) ?? prof?.ultima ?? null,
          ordemAtual: ordem,
          faseNome,
          totalFases: TOTAL_FASES,
          nAlunos: l.n_alunos ?? 0,
          nObservados: l.n_observados_fase ?? 0,
          mural: muralPorTurma.get(l.turma_id) || [],
          coresTrilha,
          atividadesTotal: atividadesPorTurma.get(l.turma_id)?.total ?? 0,
          atividadesFeitas: atividadesPorTurma.get(l.turma_id)?.feitas ?? 0,
        };
      });

      // Agrupa por série, ordenado por série (numérica primeiro) e turma por nome.
      const grupos = new Map<string, CoordenadorTurmaCard[]>();
      for (const c of cards) {
        const arr = grupos.get(c.serie) || [];
        arr.push(c);
        grupos.set(c.serie, arr);
      }
      const ordemSerie = (s: string) => (/^\d+$/.test(s) ? parseInt(s, 10) : 100 + s.charCodeAt(0));
      return [...grupos.entries()]
        .sort((a, b) => ordemSerie(a[0]) - ordemSerie(b[0]))
        .map(([serie, turmas]) => ({
          serie,
          serieLabel: serieLabelDe(serie),
          turmas: turmas.sort((a, b) => a.nome.localeCompare(b.nome)),
        }));
    },
  });
};

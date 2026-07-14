import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Lente CASAS do coordenador (F2). O F2 é conduzido por MENTOR de Casa (a Casa
 * atravessa turmas), então aqui o coordenador vê, por Casa: o(s) mentor(es), o
 * nº de alunos, a COBERTURA (quantos alunos já foram observados) e um trecho do
 * MURAL (observações dos alunos da Casa). O escopo é imposto no banco (RLS +
 * get_coordenador_casa_ids): só as Casas ligadas às turmas do coordenador.
 *
 * Fase/atividade NÃO entram aqui: no F2 são por turma (capítulos), não por Casa.
 *
 * DOUTRINA: a Casa é TIME/mentoria (pertencimento), não a inteligência
 * diagnosticada. O nome segue o padrão da constituição ("Casa [Inteligência]"),
 * mas a leitura é de mentoria e cobertura, nunca "os alunos diagnosticados X".
 */

const fromAny = (tb: string) =>
  (supabase.from as never as (tb: string) => ReturnType<typeof supabase.from>)(tb);

const nomeCurto = (p: { full_name?: string | null; nome?: string | null; sobrenome?: string | null }) =>
  p.full_name || [p.nome, p.sobrenome].filter(Boolean).join(' ') || null;

export interface CasaMuralItem {
  id: string;
  alunoNome: string | null;
  professorNome: string | null;
  texto: string;
  createdAt: string;
}

export interface CoordenadorCasa {
  casaId: number;
  nome: string; // "Casa Linguística"
  cor: string;
  mentores: string[]; // nomes, principal primeiro
  nAlunos: number;
  nObservados: number; // alunos da Casa com ao menos uma observação
  mural: CasaMuralItem[]; // trecho (mais recentes)
}

export const useCoordenadorCasas = () => {
  return useQuery({
    queryKey: ['coordenador-casas'],
    retry: false,
    staleTime: 30_000,
    queryFn: async (): Promise<CoordenadorCasa[]> => {
      // Mentores das Casas do escopo (RLS já restringe às Casas do coordenador).
      const { data: pcRaw, error } = await fromAny('professor_casa')
        .select('casa_id, professor_id, eh_mentor_principal')
        .eq('ativo', true);
      if (error || !pcRaw || (pcRaw as unknown[]).length === 0) return [];

      const pc = pcRaw as Array<{
        casa_id: number;
        professor_id: string | null;
        eh_mentor_principal: boolean | null;
      }>;
      const casaIds = [...new Set(pc.map((r) => r.casa_id))];

      const [intelRes, alunosRes, obsRes] = await Promise.all([
        supabase.from('inteligencias').select('id, nome, cor_hex'),
        // Alunos do escopo com sua Casa (RLS restringe aluno_turma às turmas do coord).
        supabase.from('aluno_turma').select('aluno_id, profiles!inner ( casa_id )').eq('ativo', true),
        // Observações do escopo (mais recentes), para cobertura e mural por Casa.
        fromAny('observacoes')
          .select('id, aluno_id, professor_id, observacao_texto, created_at')
          .is('excluida_em', null)
          .order('created_at', { ascending: false })
          .limit(300),
      ]);

      const intelNome = new Map<number, { nome: string; cor: string }>();
      for (const i of (intelRes.data as Array<{ id: number; nome: string; cor_hex: string | null }> | null) || []) {
        intelNome.set(i.id, { nome: i.nome, cor: i.cor_hex || '#5E8BD8' });
      }

      // aluno -> casa e contagem de alunos por Casa.
      const alunoCasa = new Map<string, number>();
      const alunosPorCasa = new Map<number, number>();
      for (const row of (alunosRes.data as any[] | null) || []) {
        const casaId = (row.profiles as { casa_id?: number | null })?.casa_id;
        if (casaId == null || !row.aluno_id) continue;
        alunoCasa.set(row.aluno_id, casaId);
        alunosPorCasa.set(casaId, (alunosPorCasa.get(casaId) || 0) + 1);
      }

      // Observações agrupadas por Casa (via aluno -> casa): cobertura + mural.
      const obs = (obsRes.data as Array<{
        id: string;
        aluno_id: string | null;
        professor_id: string | null;
        observacao_texto: string | null;
        created_at: string;
      }> | null) || [];
      const observadosPorCasa = new Map<number, Set<string>>();
      const muralPorCasa = new Map<number, Array<{ id: string; aluno_id: string | null; professor_id: string | null; texto: string; created_at: string }>>();
      for (const o of obs) {
        const casaId = o.aluno_id ? alunoCasa.get(o.aluno_id) : undefined;
        if (casaId == null) continue;
        if (o.aluno_id) {
          const set = observadosPorCasa.get(casaId) || new Set<string>();
          set.add(o.aluno_id);
          observadosPorCasa.set(casaId, set);
        }
        const lista = muralPorCasa.get(casaId) || [];
        if (lista.length < 4) {
          lista.push({ id: o.id, aluno_id: o.aluno_id, professor_id: o.professor_id, texto: o.observacao_texto || '', created_at: o.created_at });
          muralPorCasa.set(casaId, lista);
        }
      }

      // Nomes: mentores + pessoas do mural (aluno + professor), numa consulta.
      const idsPessoas = [
        ...new Set([
          ...(pc.map((r) => r.professor_id).filter(Boolean) as string[]),
          ...obs.flatMap((o) => [o.aluno_id, o.professor_id]).filter(Boolean) as string[],
        ]),
      ];
      const nomePorId = new Map<string, string>();
      if (idsPessoas.length > 0) {
        const { data: pessoas } = await supabase
          .from('profiles')
          .select('id, full_name, nome, sobrenome')
          .in('id', idsPessoas);
        for (const p of (pessoas as any[] | null) || []) {
          const n = nomeCurto(p);
          if (n) nomePorId.set(p.id, n);
        }
      }

      // Mentores por Casa (principal primeiro).
      const mentoresPorCasa = new Map<number, { nome: string; principal: boolean }[]>();
      for (const r of pc) {
        if (!r.professor_id) continue;
        const nome = nomePorId.get(r.professor_id);
        if (!nome) continue;
        const lista = mentoresPorCasa.get(r.casa_id) || [];
        lista.push({ nome, principal: r.eh_mentor_principal === true });
        mentoresPorCasa.set(r.casa_id, lista);
      }

      return casaIds
        .map((casaId) => {
          const intel = intelNome.get(casaId);
          const mentores = (mentoresPorCasa.get(casaId) || [])
            .sort((a, b) => Number(b.principal) - Number(a.principal))
            .map((m) => m.nome);
          const mural: CasaMuralItem[] = (muralPorCasa.get(casaId) || []).map((m) => ({
            id: m.id,
            alunoNome: m.aluno_id ? nomePorId.get(m.aluno_id)?.split(' ')[0] ?? null : null,
            professorNome: m.professor_id ? nomePorId.get(m.professor_id)?.split(' ')[0] ?? null : null,
            texto: m.texto,
            createdAt: m.created_at,
          }));
          return {
            casaId,
            nome: intel ? `Casa ${intel.nome}` : `Casa ${casaId}`,
            cor: intel?.cor || '#5E8BD8',
            mentores,
            nAlunos: alunosPorCasa.get(casaId) || 0,
            nObservados: observadosPorCasa.get(casaId)?.size || 0,
            mural,
          };
        })
        .sort((a, b) => a.casaId - b.casaId);
    },
  });
};

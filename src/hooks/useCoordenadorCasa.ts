import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CasaMuralItem } from '@/hooks/useCoordenadorCasas';

/**
 * Detalhe de UMA Casa (F2) para o coordenador: mentor(es), alunos (com nº de
 * observações) e o mural completo. Escopo imposto no banco (RLS). A Casa é time
 * de mentoria, não diagnóstico: os números são cobertura, nunca placar.
 */

const fromAny = (tb: string) =>
  (supabase.from as never as (tb: string) => ReturnType<typeof supabase.from>)(tb);

const nomeCurto = (p: { full_name?: string | null; nome?: string | null; sobrenome?: string | null }) =>
  p.full_name || [p.nome, p.sobrenome].filter(Boolean).join(' ') || 'Aluno';

export interface CasaAluno {
  id: string;
  nome: string;
  avatarUrl?: string;
  nObs: number;
}

export interface CoordenadorCasaDetalhe {
  casaId: number;
  nome: string;
  cor: string;
  mentores: { nome: string; principal: boolean }[];
  nAlunos: number;
  nObservados: number;
  alunos: CasaAluno[];
  mural: CasaMuralItem[];
}

export const useCoordenadorCasa = (casaId?: number | null) => {
  return useQuery({
    queryKey: ['coordenador-casa', casaId],
    enabled: casaId != null && !Number.isNaN(casaId),
    retry: false,
    staleTime: 30_000,
    queryFn: async (): Promise<CoordenadorCasaDetalhe | null> => {
      if (casaId == null) return null;

      const [intelRes, pcRes, alunosRes] = await Promise.all([
        supabase.from('inteligencias').select('id, nome, cor_hex').eq('id', casaId).maybeSingle(),
        fromAny('professor_casa').select('professor_id, eh_mentor_principal').eq('casa_id', casaId).eq('ativo', true),
        supabase
          .from('aluno_turma')
          .select('aluno_id, profiles!inner ( id, casa_id, full_name, nome, sobrenome, avatar_url )')
          .eq('ativo', true),
      ]);

      const intel = intelRes.data as { id: number; nome: string; cor_hex: string | null } | null;
      const cor = intel?.cor_hex || '#5E8BD8';
      const nome = intel ? `Casa ${intel.nome}` : `Casa ${casaId}`;

      // Alunos desta Casa (RLS restringe aluno_turma às turmas do coord).
      const alunoMap = new Map<string, { nome: string; avatarUrl?: string }>();
      for (const row of (alunosRes.data as any[] | null) || []) {
        const p = row.profiles as {
          id: string;
          casa_id?: number | null;
          full_name?: string | null;
          nome?: string | null;
          sobrenome?: string | null;
          avatar_url?: string | null;
        };
        if (p?.casa_id !== casaId) continue;
        if (!alunoMap.has(p.id)) {
          alunoMap.set(p.id, { nome: nomeCurto(p), avatarUrl: p.avatar_url || undefined });
        }
      }
      const alunoIds = [...alunoMap.keys()];

      // Observações dos alunos da Casa: mural + contagem por aluno.
      let obs: Array<{ id: string; aluno_id: string | null; professor_id: string | null; observacao_texto: string | null; created_at: string }> = [];
      if (alunoIds.length > 0) {
        const { data } = await fromAny('observacoes')
          .select('id, aluno_id, professor_id, observacao_texto, created_at')
          .in('aluno_id', alunoIds)
          .is('excluida_em', null)
          .order('created_at', { ascending: false })
          .limit(200);
        obs = (data as typeof obs | null) || [];
      }

      const nObsPorAluno = new Map<string, number>();
      const observados = new Set<string>();
      for (const o of obs) {
        if (!o.aluno_id) continue;
        nObsPorAluno.set(o.aluno_id, (nObsPorAluno.get(o.aluno_id) || 0) + 1);
        observados.add(o.aluno_id);
      }

      // Nomes de mentores + professores do mural.
      const mentorRows = (pcRes.data as Array<{ professor_id: string | null; eh_mentor_principal: boolean | null }> | null) || [];
      const idsPessoas = [
        ...new Set([
          ...(mentorRows.map((r) => r.professor_id).filter(Boolean) as string[]),
          ...(obs.map((o) => o.professor_id).filter(Boolean) as string[]),
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

      const mentores = mentorRows
        .map((r) => ({
          nome: r.professor_id ? nomePorId.get(r.professor_id) ?? 'Mentor' : 'Mentor',
          principal: r.eh_mentor_principal === true,
        }))
        .sort((a, b) => Number(b.principal) - Number(a.principal));

      const alunos: CasaAluno[] = [...alunoMap.entries()]
        .map(([id, a]) => ({ id, nome: a.nome, avatarUrl: a.avatarUrl, nObs: nObsPorAluno.get(id) || 0 }))
        .sort((a, b) => a.nome.localeCompare(b.nome));

      const mural: CasaMuralItem[] = obs.map((o) => ({
        id: o.id,
        alunoNome: o.aluno_id ? alunoMap.get(o.aluno_id)?.nome?.split(' ')[0] ?? null : null,
        professorNome: o.professor_id ? nomePorId.get(o.professor_id)?.split(' ')[0] ?? null : null,
        texto: o.observacao_texto || '',
        createdAt: o.created_at,
      }));

      return {
        casaId,
        nome,
        cor,
        mentores,
        nAlunos: alunoMap.size,
        nObservados: observados.size,
        alunos,
        mural,
      };
    },
  });
};

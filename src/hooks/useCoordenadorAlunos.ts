import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Todos os alunos do escopo do coordenador (RLS restringe aluno_turma às turmas
 * dele), com turma e segmento. Serve à aba DIÁRIO: selecionar turma ou pesquisar
 * um aluno para abrir o diário (histórico) dele. Só leitura.
 */

const nomeCurto = (p: { full_name?: string | null; nome?: string | null; sobrenome?: string | null }) =>
  p.full_name || [p.nome, p.sobrenome].filter(Boolean).join(' ') || 'Aluno';

export interface CoordenadorAlunoLista {
  id: string;
  nome: string;
  avatarUrl?: string;
  turmaId: string;
  turmaNome: string;
  serie: string | null;
  segmento: string;
}

export const useCoordenadorAlunos = () => {
  return useQuery({
    queryKey: ['coordenador-alunos'],
    retry: false,
    staleTime: 30_000,
    queryFn: async (): Promise<CoordenadorAlunoLista[]> => {
      const { data, error } = await supabase
        .from('aluno_turma')
        .select(
          'aluno_id, turma_id, profiles!inner ( id, full_name, nome, sobrenome, avatar_url ), turmas!inner ( nome, serie, segmento )'
        )
        .eq('ativo', true);
      if (error || !data) return [];

      const vistos = new Set<string>();
      const out: CoordenadorAlunoLista[] = [];
      for (const row of data as any[]) {
        const p = row.profiles as {
          id: string;
          full_name?: string | null;
          nome?: string | null;
          sobrenome?: string | null;
          avatar_url?: string | null;
        };
        const turma = row.turmas as { nome?: string; serie?: string | number | null; segmento?: string | null };
        if (!p?.id || !row.turma_id) continue;
        const chave = `${p.id}:${row.turma_id}`;
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        out.push({
          id: p.id,
          nome: nomeCurto(p),
          avatarUrl: p.avatar_url || undefined,
          turmaId: row.turma_id,
          turmaNome: turma?.nome || 'Turma',
          serie: turma?.serie == null ? null : String(turma.serie),
          segmento: turma?.segmento || 'infantil',
        });
      }
      return out.sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });
};

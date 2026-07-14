import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Diário próprio do coordenador (parte D). Caderno de coordenação: anotações do
 * coordenador por segmento e turma opcional. Dono do dado = o coordenador
 * (RLS: coordenador_id = auth.uid()). NÃO é observação de criança (sem aluno_id).
 * Ver empresa/registros/decisoes.md e riscos.md (14/07).
 */

const fromAny = (tb: string) =>
  (supabase.from as never as (tb: string) => ReturnType<typeof supabase.from>)(tb);

export interface DiarioEntrada {
  id: string;
  segmento: string;
  turmaId: string | null;
  titulo: string | null;
  texto: string;
  createdAt: string;
  updatedAt: string;
}

export const useCoordenadorDiario = () => {
  return useQuery({
    queryKey: ['coordenador-diario'],
    retry: false,
    staleTime: 15_000,
    queryFn: async (): Promise<DiarioEntrada[]> => {
      const { data, error } = await fromAny('coordenador_diario')
        .select('id, segmento, turma_id, titulo, texto, created_at, updated_at')
        .is('excluida_em', null)
        .order('created_at', { ascending: false });
      if (error || !data) return [];
      return (data as any[]).map((r) => ({
        id: r.id,
        segmento: r.segmento,
        turmaId: r.turma_id ?? null,
        titulo: r.titulo ?? null,
        texto: r.texto,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    },
  });
};

export interface SalvarDiarioParams {
  id?: string;
  coordenadorId: string;
  institutionId: string;
  segmento: string;
  turmaId: string | null;
  titulo: string | null;
  texto: string;
}

/** Cria (sem id) ou edita (com id) uma entrada do diário. RLS impõe o escopo. */
export const salvarDiario = async (p: SalvarDiarioParams) => {
  if (p.id) {
    return fromAny('coordenador_diario')
      .update({ segmento: p.segmento, turma_id: p.turmaId, titulo: p.titulo, texto: p.texto })
      .eq('id', p.id);
  }
  return fromAny('coordenador_diario').insert({
    coordenador_id: p.coordenadorId,
    institution_id: p.institutionId,
    segmento: p.segmento,
    turma_id: p.turmaId,
    titulo: p.titulo,
    texto: p.texto,
  });
};

/** Soft-delete (o coordenador é dono e pode remover a própria reflexão). */
export const excluirDiario = async (id: string, coordenadorId: string) =>
  fromAny('coordenador_diario')
    .update({ excluida_em: new Date().toISOString(), excluida_por: coordenadorId })
    .eq('id', id);

/**
 * Marcadores de conteúdo CLÍNICO/de saúde de menor. Se aparecerem, a UI mostra
 * um aviso NÃO bloqueante (guardrail do Riscos): o diário não é lugar de laudo;
 * isso tem trilho próprio (nota de apoio, ainda fora do app).
 */
const RE_CLINICO =
  /\b(tdah|tda\b|autis|laudo|diagn[oó]stic|s[ií]ndrome|d[eé]ficit|transtorno|dislex|hiperativ|neurod|medica[çc][ãa]o|psic[oó]log|terapeut)/i;
export const temMarcadorClinico = (texto: string): boolean => RE_CLINICO.test(texto || '');

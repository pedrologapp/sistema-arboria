import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Tabelas da reforma do F2 (turma_fase_ordem) e a coluna turmas.segmento podem
// não estar nos tipos gerados do Supabase ainda; consumimos via `sb` (any),
// como faz CapituloProfessorPage, para o build não quebrar por tipagem.
const sb = supabase as any;

/**
 * Status de uma turma F2 em relação à Casa do mentor logado:
 *  - 'vez'     : a fase ATIVA da turma É a Casa do mentor (é a vez dele conduzir).
 *  - 'caminho' : a Casa do mentor é a PRÓXIMA posição da trilha desta turma.
 *  - 'depois'  : a Casa do mentor vem mais adiante (ou a trilha nem começou).
 * Turmas em que a Casa do mentor JÁ passou não entram na lista.
 */
export type StatusTurmaCasa = 'vez' | 'caminho' | 'depois';

export interface TurmaDaCasaAtiva {
  turma_id: string;
  nome: string;
  serie: string | null;
  turma_letra: string | null;
  /** Posição atual da trilha da turma: 0 = não começou · 1..8 = em curso · 9 = concluída. */
  ordemAtual: number;
  /** Posição (1..8) em que a Casa do mentor aparece na trilha desta turma. */
  mentorPos: number;
  /** Casa que conduz a turma AGORA (na posição atual). Null se não começou/concluiu. */
  casaAtualId: number | null;
  casaAtualNome: string | null;
  casaAtualBrasao: string | null;
  status: StatusTurmaCasa;
}

interface IntelInfo {
  id: number;
  nome: string;
  brasao_url: string | null;
}

/**
 * Turmas do Fundamental 2 da instituição relevantes para a Casa do mentor.
 *
 * Espelha a resolução de fase do useFaseTurma.ts, mas POR MENTOR e para MUITAS
 * turmas: para cada turma F2, lê turma_trilha.ordem_atual e resolve a Casa de
 * cada posição via turma_fase_ordem (fallback ordinal: posicao == inteligencia_id,
 * como as RPCs de fase). Depois classifica a turma em relação à Casa do mentor.
 *
 * Só leitura. Nenhuma escrita, nenhuma RPC de virada.
 */
export const useTurmasDaCasaAtiva = (
  institutionId?: string | null,
  casaMentorId?: number | null
) => {
  return useQuery({
    queryKey: ['turmas-casa-ativa', institutionId, casaMentorId],
    enabled: !!institutionId && !!casaMentorId,
    queryFn: async (): Promise<TurmaDaCasaAtiva[]> => {
      const anoLetivo = new Date().getFullYear();
      const casaId = casaMentorId!;

      // 1. Turmas do Fundamental 2 da instituição.
      const { data: turmasRaw, error: turmasErr } = await sb
        .from('turmas')
        .select('id, nome, serie, turma_letra')
        .eq('institution_id', institutionId!)
        .eq('segmento', 'fundamental2');
      if (turmasErr) throw turmasErr;
      const turmas = (turmasRaw as { id: string; nome: string; serie: string | null; turma_letra: string | null }[]) ?? [];
      if (turmas.length === 0) return [];
      const turmaIds = turmas.map((t) => t.id);

      // 2-4. Trilhas, ordens por turma e inteligências (em paralelo).
      const [trilhaRes, ordemRes, intelRes] = await Promise.all([
        sb
          .from('turma_trilha')
          .select('turma_id, ordem_atual')
          .in('turma_id', turmaIds)
          .eq('ano_letivo', anoLetivo),
        sb
          .from('turma_fase_ordem')
          .select('turma_id, posicao, inteligencia_id')
          .in('turma_id', turmaIds)
          .eq('ano_letivo', anoLetivo),
        sb.from('inteligencias').select('id, nome, brasao_url'),
      ]);
      if (trilhaRes.error) throw trilhaRes.error;
      if (ordemRes.error) throw ordemRes.error;
      if (intelRes.error) throw intelRes.error;

      const ordemAtualPorTurma = new Map<string, number>();
      (trilhaRes.data as { turma_id: string; ordem_atual: number | null }[] ?? []).forEach((r) => {
        ordemAtualPorTurma.set(r.turma_id, r.ordem_atual ?? 0);
      });

      // Mapa turma -> (posicao -> inteligencia_id) e (inteligencia_id -> posicao)
      const posParaIntel = new Map<string, Map<number, number>>();
      const intelParaPos = new Map<string, Map<number, number>>();
      (ordemRes.data as { turma_id: string; posicao: number; inteligencia_id: number }[] ?? []).forEach((r) => {
        if (!posParaIntel.has(r.turma_id)) posParaIntel.set(r.turma_id, new Map());
        if (!intelParaPos.has(r.turma_id)) intelParaPos.set(r.turma_id, new Map());
        posParaIntel.get(r.turma_id)!.set(r.posicao, r.inteligencia_id);
        intelParaPos.get(r.turma_id)!.set(r.inteligencia_id, r.posicao);
      });

      const intelById = new Map<number, IntelInfo>();
      (intelRes.data as IntelInfo[] ?? []).forEach((i) => intelById.set(i.id, i));

      // Fallback ordinal (posicao == inteligencia_id), igual às RPCs de fase.
      const intelDaPosicao = (turmaId: string, posicao: number): number =>
        posParaIntel.get(turmaId)?.get(posicao) ?? posicao;
      const posDaIntel = (turmaId: string, intel: number): number =>
        intelParaPos.get(turmaId)?.get(intel) ?? intel;

      const resultado: TurmaDaCasaAtiva[] = [];

      for (const turma of turmas) {
        const ordemAtual = ordemAtualPorTurma.get(turma.id) ?? 0;
        const mentorPos = posDaIntel(turma.id, casaId); // 1..8

        // A Casa do mentor já passou nesta turma: não interessa neste painel.
        if (ordemAtual > 0 && mentorPos < ordemAtual) continue;
        // Trilha concluída (ordem 9): a Casa do mentor está no passado.
        if (ordemAtual > 8) continue;

        let status: StatusTurmaCasa;
        if (ordemAtual >= 1 && mentorPos === ordemAtual) status = 'vez';
        else if (mentorPos === ordemAtual + 1) status = 'caminho';
        else status = 'depois';

        // Casa que conduz agora (posição atual). Null se não começou.
        let casaAtualId: number | null = null;
        let casaAtualNome: string | null = null;
        let casaAtualBrasao: string | null = null;
        if (ordemAtual >= 1 && ordemAtual <= 8) {
          casaAtualId = intelDaPosicao(turma.id, ordemAtual);
          const info = intelById.get(casaAtualId);
          casaAtualNome = info?.nome ?? null;
          casaAtualBrasao = info?.brasao_url ?? null;
        }

        resultado.push({
          turma_id: turma.id,
          nome: turma.nome,
          serie: turma.serie,
          turma_letra: turma.turma_letra,
          ordemAtual,
          mentorPos,
          casaAtualId,
          casaAtualNome,
          casaAtualBrasao,
          status,
        });
      }

      // Ordena: a vez primeiro, depois a caminho, depois o resto; por série/letra.
      const peso: Record<StatusTurmaCasa, number> = { vez: 0, caminho: 1, depois: 2 };
      resultado.sort((a, b) => {
        if (peso[a.status] !== peso[b.status]) return peso[a.status] - peso[b.status];
        return (a.serie ?? '').localeCompare(b.serie ?? '') || (a.turma_letra ?? '').localeCompare(b.turma_letra ?? '');
      });

      return resultado;
    },
  });
};

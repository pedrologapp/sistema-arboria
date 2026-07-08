import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { corDaCasa } from '@/config/f2Reforma';

// Tabelas/colunas da reforma do F2 podem não constar nos tipos gerados; via `sb`
// (any), como as demais telas/hooks do F2, para o build não quebrar por tipagem.
const sb = supabase as any;

const TOTAL_PADRAO = 8;

/** Cadência-base (dias por capítulo) para ESPALHAR o layout quando não há data
 *  real. Só layout: nunca vira rótulo de data. ~5 semanas. */
export const CADENCIA_PADRAO_DIAS = 35;

export type EstadoCasaPanorama = 'concluida' | 'agora' | 'caminho';

export interface PanoramaPasso {
  posicao: number; // 1..N na trilha DESTA turma
  inteligenciaId: number;
  nome: string;
  cor: string;
  /** 'YYYY-MM-DD' do capítulo desta Casa nesta turma, ou null = a definir.
   *  Data REAL (capitulo_turma_config.data_evento). Nunca inventada. */
  data: string | null;
  estado: EstadoCasaPanorama;
  ehMentor: boolean;
}

export interface PanoramaTurma {
  turma_id: string;
  nome: string;
  serie: string | null;
  turma_letra: string | null;
  /** 0 = não começou · 1..total = em curso · > total = concluída. */
  ordemAtual: number;
  total: number;
  casaAtualId: number | null;
  casaAtualNome: string | null;
  /** posição (1..total) da Casa do mentor nesta turma; -1 se não percorre. */
  mentorPos: number;
  passos: PanoramaPasso[];
}

export interface PanoramaDados {
  turmas: PanoramaTurma[];
  /** Cadência efetiva (dias por capítulo) usada no layout. */
  cadenciaDias: number;
}

/**
 * PANORAMA do F2: TODAS as turmas do Fundamental 2 da instituição, cada uma com
 * a trilha inteira (as Casas na ordem, com data real quando existe) para o
 * mentor se situar de uma vez.
 *
 * Espelha useTurmasDaCasaAtiva (turmas + trilha + ordem) e useLinhaAno (datas
 * reais via inteligência -> fase -> capítulo ativo -> capitulo_turma_config),
 * mas BATCHED para todas as turmas de uma vez (sem N+1). SÓ LEITURA. Toda leitura
 * é tolerante: sem configuração de ordem cai no fallback canônico (8 Casas,
 * posicao == inteligencia_id); onde não há data, fica null ("a definir").
 *
 * DIFERENÇA do useTurmasDaCasaAtiva: aqui NÃO filtramos turmas em que a Casa do
 * mentor já passou. O panorama mostra o quadro completo.
 */
export const useF2Panorama = (
  institutionId?: string | null,
  casaMentorId?: number | null
) => {
  return useQuery<PanoramaDados>({
    queryKey: ['f2-panorama', institutionId, casaMentorId],
    enabled: !!institutionId,
    queryFn: async (): Promise<PanoramaDados> => {
      const ano = new Date().getFullYear();

      // 1. Turmas do Fundamental 2 da instituição (TODAS).
      const { data: turmasRaw } = await sb
        .from('turmas')
        .select('id, nome, serie, turma_letra')
        .eq('institution_id', institutionId!)
        .eq('segmento', 'fundamental2');
      const turmas =
        (turmasRaw as {
          id: string;
          nome: string;
          serie: string | null;
          turma_letra: string | null;
        }[]) ?? [];
      if (turmas.length === 0) return { turmas: [], cadenciaDias: CADENCIA_PADRAO_DIAS };
      const turmaIds = turmas.map((tu) => tu.id);

      // 2-5. Trilhas, ordens, inteligências e cadência (em paralelo).
      const [trilhaRes, ordemRes, intelRes, settingsRes] = await Promise.all([
        sb
          .from('turma_trilha')
          .select('turma_id, ordem_atual')
          .in('turma_id', turmaIds)
          .eq('ano_letivo', ano),
        sb
          .from('turma_fase_ordem')
          .select('turma_id, posicao, inteligencia_id')
          .in('turma_id', turmaIds)
          .eq('ano_letivo', ano),
        sb.from('inteligencias').select('id, nome'),
        sb
          .from('institution_settings')
          .select('f2_dias_por_encontro')
          .eq('institution_id', institutionId!)
          .maybeSingle(),
      ]);

      const cadRaw = (settingsRes?.data as { f2_dias_por_encontro?: number | null } | null)
        ?.f2_dias_por_encontro;
      const cadenciaDias = cadRaw && cadRaw > 0 ? cadRaw : CADENCIA_PADRAO_DIAS;

      const ordemAtualPorTurma = new Map<string, number>();
      ((trilhaRes.data as { turma_id: string; ordem_atual: number | null }[]) ?? []).forEach(
        (r) => ordemAtualPorTurma.set(r.turma_id, r.ordem_atual ?? 0)
      );

      // turma -> config ordenada [{posicao, inteligencia_id}] (tolerante).
      const configPorTurma = new Map<string, Array<{ posicao: number; inteligencia_id: number }>>();
      ((ordemRes.data as { turma_id: string; posicao: number; inteligencia_id: number }[]) ?? []).forEach(
        (r) => {
          const arr = configPorTurma.get(r.turma_id) ?? [];
          arr.push({ posicao: r.posicao, inteligencia_id: r.inteligencia_id });
          configPorTurma.set(r.turma_id, arr);
        }
      );

      const nomePorIntel = new Map<number, string>();
      ((intelRes.data as { id: number; nome: string }[]) ?? []).forEach((i) =>
        nomePorIntel.set(i.id, i.nome)
      );

      // Trilha efetiva de cada turma (config ou fallback canônico 1..8).
      const trilhaPorTurma = new Map<string, Array<{ posicao: number; inteligencia_id: number }>>();
      for (const tu of turmas) {
        const cfg = (configPorTurma.get(tu.id) ?? []).slice().sort((a, b) => a.posicao - b.posicao);
        trilhaPorTurma.set(
          tu.id,
          cfg.length > 0
            ? cfg
            : Array.from({ length: TOTAL_PADRAO }, (_, i) => ({ posicao: i + 1, inteligencia_id: i + 1 }))
        );
      }

      // 6-8. Datas reais dos capítulos, BATCHED para todas as turmas.
      //      inteligência -> fase -> capítulo ativo -> capitulo_turma_config.
      //      Chave do mapa: `${turma_id}:${inteligencia_id}` -> 'YYYY-MM-DD' | null.
      const dataPorTurmaIntel = new Map<string, string | null>();
      try {
        const intelIdsUsados = Array.from(
          new Set(
            Array.from(trilhaPorTurma.values()).flatMap((arr) => arr.map((p) => p.inteligencia_id))
          )
        );

        const { data: fasesRaw } = await sb
          .from('fases')
          .select('id, inteligencia_id')
          .eq('institution_id', institutionId!)
          .eq('segmento', 'fundamental2')
          .eq('ano_letivo', ano)
          .in('inteligencia_id', intelIdsUsados);
        const faseIdParaIntel = new Map<string, number>();
        const faseIds: string[] = [];
        ((fasesRaw as { id: string; inteligencia_id: number }[]) ?? []).forEach((f) => {
          faseIdParaIntel.set(f.id, f.inteligencia_id);
          faseIds.push(f.id);
        });

        if (faseIds.length) {
          const { data: capsRaw } = await sb
            .from('capitulos')
            .select('id, fase_id')
            .eq('institution_id', institutionId!)
            .eq('ativo', true)
            .in('fase_id', faseIds);
          const capIdParaIntel = new Map<string, number>();
          const capIds: string[] = [];
          ((capsRaw as { id: string; fase_id: string }[]) ?? []).forEach((c) => {
            const intel = faseIdParaIntel.get(c.fase_id);
            if (intel != null) {
              capIdParaIntel.set(c.id, intel);
              capIds.push(c.id);
            }
          });

          if (capIds.length) {
            const { data: cfgRaw } = await sb
              .from('capitulo_turma_config')
              .select('turma_id, capitulo_id, data_evento')
              .in('turma_id', turmaIds)
              .in('capitulo_id', capIds);
            ((cfgRaw as { turma_id: string; capitulo_id: string; data_evento: string | null }[]) ?? []).forEach(
              (cfg) => {
                const intel = capIdParaIntel.get(cfg.capitulo_id);
                if (intel != null) {
                  dataPorTurmaIntel.set(`${cfg.turma_id}:${intel}`, cfg.data_evento ?? null);
                }
              }
            );
          }
        }
      } catch {
        /* datas degradam para "a definir" */
      }

      const resultado: PanoramaTurma[] = turmas.map((tu) => {
        const ordemAtual = ordemAtualPorTurma.get(tu.id) ?? 0;
        const trilha = trilhaPorTurma.get(tu.id)!;
        const total = trilha.length;

        const estadoDe = (posicao: number): EstadoCasaPanorama => {
          if (ordemAtual >= 1 && posicao === ordemAtual) return 'agora';
          if (ordemAtual >= 1 && posicao < ordemAtual) return 'concluida';
          return 'caminho';
        };

        const passos: PanoramaPasso[] = trilha.map((p) => ({
          posicao: p.posicao,
          inteligenciaId: p.inteligencia_id,
          nome: nomePorIntel.get(p.inteligencia_id) ?? `Casa ${p.inteligencia_id}`,
          cor: corDaCasa(p.inteligencia_id),
          data: dataPorTurmaIntel.get(`${tu.id}:${p.inteligencia_id}`) ?? null,
          estado: estadoDe(p.posicao),
          ehMentor: casaMentorId != null && p.inteligencia_id === casaMentorId,
        }));

        const casaAtual =
          ordemAtual >= 1 && ordemAtual <= total
            ? trilha.find((p) => p.posicao === ordemAtual) ?? null
            : null;
        const mentorPasso = passos.find((p) => p.ehMentor) ?? null;

        return {
          turma_id: tu.id,
          nome: tu.nome,
          serie: tu.serie,
          turma_letra: tu.turma_letra,
          ordemAtual,
          total,
          casaAtualId: casaAtual?.inteligencia_id ?? null,
          casaAtualNome: casaAtual ? nomePorIntel.get(casaAtual.inteligencia_id) ?? null : null,
          mentorPos: mentorPasso?.posicao ?? -1,
          passos,
        };
      });

      // Ordena por série/letra para leitura estável (o painel é panorâmico).
      resultado.sort(
        (a, b) =>
          (a.serie ?? '').localeCompare(b.serie ?? '', 'pt-BR', { numeric: true }) ||
          (a.turma_letra ?? '').localeCompare(b.turma_letra ?? '')
      );

      return { turmas: resultado, cadenciaDias };
    },
  });
};

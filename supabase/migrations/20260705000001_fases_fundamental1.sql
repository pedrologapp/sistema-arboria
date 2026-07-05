-- Fases do Fundamental 1 (Academia de Superpoderes / Talentos)
-- Espelha as 8 fases do Infantil do ano letivo corrente, trocando apenas o segmento.
-- A trilha por turma (turma_trilha) e as RPCs continuam funcionando por turma_id;
-- este seed só materializa as fases pra que useFaseTurma(segmento='fundamental1') resolva.

INSERT INTO public.fases
  (institution_id, inteligencia_id, ano_letivo, numero_fase, semana_atual,
   data_inicio, data_fim, ativo, serie, segmento)
SELECT
  f.institution_id, f.inteligencia_id, f.ano_letivo, f.numero_fase, f.semana_atual,
  f.data_inicio, f.data_fim, f.ativo, NULL, 'fundamental1'
FROM public.fases f
WHERE f.segmento = 'infantil'
  AND f.ano_letivo = EXTRACT(YEAR FROM now())::smallint
  AND NOT EXISTS (
    SELECT 1 FROM public.fases g
    WHERE g.segmento = 'fundamental1'
      AND g.institution_id = f.institution_id
      AND g.ano_letivo = f.ano_letivo
      AND g.inteligencia_id = f.inteligencia_id
  );

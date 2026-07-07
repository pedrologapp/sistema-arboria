-- =============================================================
-- Seed de FASES do Fundamental 2 (as 8 "Casas").
--
-- O QUÊ: materializa as 8 fases (inteligencia_id 1..8) por institution/ano
-- para segmento='fundamental2', espelhando as fases já existentes do Infantil
-- do ano corrente (mesma fonte que 20260705000001_fases_fundamental1.sql usa).
--
-- POR QUÊ: a trilha por turma (turma_trilha) resolve a POSIÇÃO da turma, mas a
-- POSIÇÃO só vira uma fase real quando existe a linha em `fases` para aquele
-- (institution, segmento, ano, inteligencia). Sem este seed, a trilha do F2
-- acha a posição mas NÃO resolve a fase -> observação/capítulo ficam órfãos.
-- As 8 fases continuam COMPARTILHADAS por segmento/ano (o rio longitudinal de
-- 12 anos não fragmenta); a variação por turma vive só em turma_trilha /
-- turma_fase_ordem / datas de encontro. NÃO criamos `fases` por turma.
--
-- ADITIVO E IDEMPOTENTE: só INSERT com guarda NOT EXISTS. Nada é apagado,
-- renomeado ou sobrescrito. Rodar várias vezes é seguro.
-- =============================================================

INSERT INTO public.fases
  (institution_id, inteligencia_id, ano_letivo, numero_fase, semana_atual,
   data_inicio, data_fim, ativo, serie, segmento)
SELECT
  f.institution_id, f.inteligencia_id, f.ano_letivo, f.numero_fase, f.semana_atual,
  f.data_inicio, f.data_fim, f.ativo, NULL, 'fundamental2'
FROM public.fases f
WHERE f.segmento = 'infantil'
  AND f.ano_letivo = EXTRACT(YEAR FROM now())::smallint
  AND NOT EXISTS (
    SELECT 1 FROM public.fases g
    WHERE g.segmento = 'fundamental2'
      AND g.institution_id = f.institution_id
      AND g.ano_letivo = f.ano_letivo
      AND g.inteligencia_id = f.inteligencia_id
  );

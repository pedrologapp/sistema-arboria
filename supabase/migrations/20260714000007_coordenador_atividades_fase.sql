-- =============================================================
-- COORDENADOR: progresso de ATIVIDADES da fase corrente por turma.
--
-- MOTIVO: o Fundador quer ver no card em qual atividade a turma está (ex.: "1 de
-- 3 feitas, faltam 2"). O dado vem de turma_atividade_plano (as atividades
-- montadas para a turma na fase) x turma_atividade_evento (evento='concluida').
--
-- Função escopada às turmas do coordenador (get_coordenador_turma_ids usa o
-- auth.uid() do chamador). SECURITY DEFINER só para simplificar o cruzamento;
-- devolve apenas contagens, nada sensível. Read-only. O front chama de forma
-- tolerante: se a função não existir, o indicador some, sem quebrar a Gestão.
--
-- IMPORTANTE: a trilha da turma pode ser CONFIGURADA (turma_fase_ordem: a
-- posição N não é necessariamente a inteligência N). Então a inteligência da
-- fase corrente é resolvida por turma_fase_ordem (posicao == ordem_atual), com
-- fallback canônico (== ordem_atual) quando a turma não tem config. Isto espelha
-- exatamente o que o professor vê (useFaseTurma), pra o card bater com a tela.
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_coordenador_turma_atividades()
RETURNS TABLE(turma_id uuid, total integer, feitas integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id AS turma_id,
    count(tap.id)::integer AS total,
    count(*) FILTER (WHERE ev.atividade_id IS NOT NULL)::integer AS feitas
  FROM public.turmas t
  JOIN LATERAL (
    SELECT tt.ano_letivo, tt.ordem_atual
    FROM public.turma_trilha tt
    WHERE tt.turma_id = t.id
    ORDER BY tt.ano_letivo DESC
    LIMIT 1
  ) tr ON true
  -- Inteligência da posição atual: configurada (turma_fase_ordem) ou fallback canônico.
  LEFT JOIN public.turma_fase_ordem tfo
    ON tfo.turma_id = t.id
   AND tfo.ano_letivo = tr.ano_letivo
   AND tfo.posicao = tr.ordem_atual
  LEFT JOIN public.turma_atividade_plano tap
    ON tap.turma_id = t.id
   AND tap.ano_letivo = tr.ano_letivo
   AND tap.inteligencia_id = COALESCE(tfo.inteligencia_id, tr.ordem_atual)
   AND tap.ativo IS TRUE
  LEFT JOIN public.turma_atividade_evento ev
    ON ev.turma_id = tap.turma_id
   AND ev.atividade_id = tap.atividade_id
   AND ev.evento = 'concluida'
  WHERE t.id = ANY(public.get_coordenador_turma_ids())
  GROUP BY t.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_coordenador_turma_atividades() TO authenticated;

-- ROLLBACK: DROP FUNCTION IF EXISTS public.get_coordenador_turma_atividades();

-- =============================================================
-- RPC fase_atual_do_aluno(): a Casa (inteligencia) da fase ATUAL da turma do
-- aluno logado, resolvida pela MESMA trilha que o professor ve (turma_trilha +
-- turma_fase_ordem), REUSANDO os helpers ja existentes intel_da_posicao() e
-- total_fases_ativas_turma() (fonte unica da regra da trilha).
--
-- Aprovada por Riscos (aprovado com condicoes) e Dados (ok com ajustes) em
-- 2026-07-11. Contorna a RLS educador-only de turma_trilha SEM afrouxa-la.
--
-- TRAVAS (Riscos + Dados):
--  . SECURITY DEFINER + SET search_path = public + STABLE (read-only).
--  . Sem parametro: escopo SEMPRE em auth.uid() (aluno nunca consulta outra
--    turma/aluno). Guard para auth.uid() nulo.
--  . Desempate deterministico quando o aluno tem >1 turma ativa.
--  . Segmento DERIVADO da turma (nao hardcoded).
--  . Ano por EXTRACT(YEAR FROM now()) (mesmo que o professor / useFaseTurma).
--  . Gate anti-fase-fantasma: so devolve Casa que existe em fases (o professor
--    tambem ve). Bordas (nao comecou / concluida / sem provisao) => vazio.
--  . Devolve SO a Casa atual (id, nome, cor, emoji). NUNCA a trilha, o total,
--    a proxima/anterior, outra turma. GRANT so a authenticated.
--
-- Frontend atras do flag F2_ALUNO_FASE_TRILHA (default false). Producao
-- intocada enquanto a flag estiver desligada (a query nem roda).
-- =============================================================
CREATE OR REPLACE FUNCTION public.fase_atual_do_aluno()
RETURNS TABLE (
  inteligencia_id smallint,
  nome            text,
  cor_hex         text,
  emoji           text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_turma uuid;
  v_inst  uuid;
  v_seg   text;
  v_ano   smallint := EXTRACT(YEAR FROM now())::smallint;
  v_ordem smallint;
  v_total smallint;
  v_intel smallint;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  -- Turma ATIVA do aluno no ano corrente. Desempate deterministico se houver
  -- mais de uma (nunca por parametro do cliente).
  SELECT t.id, t.institution_id, COALESCE(t.segmento, 'infantil')
    INTO v_turma, v_inst, v_seg
  FROM public.aluno_turma at
  JOIN public.turmas t ON t.id = at.turma_id
  WHERE at.aluno_id = v_uid
    AND at.ativo = true
    AND t.ano_letivo = v_ano
  ORDER BY at.data_entrada DESC NULLS LAST, at.turma_id
  LIMIT 1;

  IF v_turma IS NULL THEN
    RETURN;
  END IF;

  -- Posicao na trilha (0/nula = nao comecou).
  SELECT tt.ordem_atual INTO v_ordem
  FROM public.turma_trilha tt
  WHERE tt.turma_id = v_turma AND tt.ano_letivo = v_ano;
  v_ordem := COALESCE(v_ordem, 0);

  v_total := public.total_fases_ativas_turma(v_turma, v_ano);

  -- Fora da faixa ativa (nao comecou ou concluida) => sem fase.
  IF v_ordem < 1 OR v_ordem > v_total THEN
    RETURN;
  END IF;

  v_intel := public.intel_da_posicao(v_turma, v_ano, v_ordem);
  IF v_intel IS NULL THEN
    RETURN;
  END IF;

  -- Gate anti-fase-fantasma: so a Casa que o professor tambem ve.
  IF NOT EXISTS (
    SELECT 1 FROM public.fases f
    WHERE f.institution_id = v_inst
      AND f.segmento = v_seg
      AND f.ano_letivo = v_ano
      AND f.inteligencia_id = v_intel
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT i.id::smallint, i.nome, i.cor_hex, i.emoji
    FROM public.inteligencias i
    WHERE i.id = v_intel;
END;
$$;

-- Acesso: so usuario autenticado; nunca anonimo.
REVOKE ALL ON FUNCTION public.fase_atual_do_aluno() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fase_atual_do_aluno() TO authenticated;

-- ============================================================
-- arboria_resetar_fase: o dono (super_admin) volta a fase de uma turma no painel
-- /arboria, sem depender do CEO mexer no banco. Pedido do Fundador 23/07 (ele
-- finaliza fases sem querer testando; aconteceu 1ºA, 3ºA, Grupo IV A).
--
-- SEGURANCA (doutrina): NUNCA toca observacoes nem evidencias (o historico da
-- crianca e' intocavel). So mexe em: turma_trilha.ordem_atual (a POSICAO da fase)
-- e turma_fase_evento (o log de eventos, que nao e' dado de crianca). Gated a
-- super_admin. As observacoes guardam o proprio fase_id (snapshot), entao voltar
-- a fase nao as altera.
--
-- ordem_alvo: 0 = nao iniciada; 1..8 = posicao na trilha (1=Linguistica no
-- fallback canonico). A fase alvo fica ATIVA (remove a finalizacao dela, se houver).
-- ============================================================
CREATE OR REPLACE FUNCTION public.arboria_resetar_fase(
  p_turma_id uuid,
  p_ordem_alvo smallint,
  p_ano_letivo smallint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ano smallint := COALESCE(p_ano_letivo, EXTRACT(year FROM now())::smallint);
  v_inst uuid;
  v_removidos int;
  v_atualizou int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;
  IF p_ordem_alvo < 0 OR p_ordem_alvo > 8 THEN
    RAISE EXCEPTION 'ordem alvo invalida (0 a 8)';
  END IF;

  SELECT institution_id INTO v_inst FROM public.turmas WHERE id = p_turma_id;
  IF v_inst IS NULL THEN
    RAISE EXCEPTION 'turma nao encontrada';
  END IF;

  -- Posicao atual = ordem_alvo (upsert: cria a linha da trilha se nao existir).
  UPDATE public.turma_trilha
    SET ordem_atual = p_ordem_alvo, updated_at = now()
    WHERE turma_id = p_turma_id AND ano_letivo = v_ano;
  GET DIAGNOSTICS v_atualizou = ROW_COUNT;
  IF v_atualizou = 0 THEN
    INSERT INTO public.turma_trilha (institution_id, turma_id, ano_letivo, ordem_atual, iniciada_em)
    VALUES (v_inst, p_turma_id, v_ano, p_ordem_alvo, CASE WHEN p_ordem_alvo > 0 THEN now() ELSE NULL END);
  END IF;

  -- Limpa os eventos posteriores ao alvo + a finalizacao do proprio alvo (pra a
  -- fase alvo ficar ATIVA). NUNCA toca observacoes.
  DELETE FROM public.turma_fase_evento
    WHERE turma_id = p_turma_id AND ano_letivo = v_ano
      AND (ordem > p_ordem_alvo OR (ordem = p_ordem_alvo AND evento = 'finalizou'));
  GET DIAGNOSTICS v_removidos = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'ordem_atual', p_ordem_alvo,
    'eventos_removidos', v_removidos
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.arboria_resetar_fase(uuid, smallint, smallint) TO authenticated;

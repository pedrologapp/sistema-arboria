-- Corrige o log de eventos de fase para turmas fora do Infantil (F1+):
-- iniciar/finalizar_fase_turma resolviam o fase_id com segmento='infantil' fixo.
-- Agora o segmento vem da própria turma (fallback 'infantil' para dados antigos).
-- Comportamento para turmas do Infantil: idêntico ao anterior.

CREATE OR REPLACE FUNCTION public.iniciar_fase_turma(p_turma_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inst  uuid;
  v_seg   text;
  v_ano   smallint := EXTRACT(YEAR FROM now())::smallint;
  v_atual smallint;
  v_fase  uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM professor_turma pt
                 WHERE pt.professor_id = auth.uid() AND pt.turma_id = p_turma_id AND pt.ativo) THEN
    RAISE EXCEPTION 'Sem permissão nesta turma';
  END IF;

  SELECT institution_id, COALESCE(segmento, 'infantil') INTO v_inst, v_seg
    FROM turmas WHERE id = p_turma_id;

  SELECT ordem_atual INTO v_atual FROM turma_trilha
   WHERE turma_id = p_turma_id AND ano_letivo = v_ano;

  -- Já começou? no-op — não sobrescreve nem loga de novo.
  IF v_atual IS NOT NULL AND v_atual >= 1 THEN
    RETURN;
  END IF;

  INSERT INTO turma_trilha (institution_id, turma_id, ano_letivo, ordem_atual, iniciada_em)
  VALUES (v_inst, p_turma_id, v_ano, 1, now())
  ON CONFLICT (turma_id, ano_letivo) DO UPDATE
    SET ordem_atual = 1, iniciada_em = now(), updated_at = now();

  -- Log append-only do início da fase 1
  SELECT id INTO v_fase FROM fases
   WHERE institution_id = v_inst AND segmento = v_seg
     AND ano_letivo = v_ano AND inteligencia_id = 1
   LIMIT 1;

  INSERT INTO turma_fase_evento (institution_id, turma_id, ano_letivo, ordem, fase_id, evento, professor_id, ocorrido_em)
  VALUES (v_inst, p_turma_id, v_ano, 1, v_fase, 'iniciou', auth.uid(), now());
END $$;

CREATE OR REPLACE FUNCTION public.finalizar_fase_turma(p_turma_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inst       uuid;
  v_seg        text;
  v_ano        smallint := EXTRACT(YEAR FROM now())::smallint;
  v_atual      smallint;
  v_prox       smallint;
  v_agora      timestamptz := now();
  v_fase_atual uuid;
  v_fase_prox  uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM professor_turma pt
                 WHERE pt.professor_id = auth.uid() AND pt.turma_id = p_turma_id AND pt.ativo) THEN
    RAISE EXCEPTION 'Sem permissão nesta turma';
  END IF;

  SELECT institution_id, COALESCE(segmento, 'infantil') INTO v_inst, v_seg
    FROM turmas WHERE id = p_turma_id;

  SELECT ordem_atual INTO v_atual FROM turma_trilha
   WHERE turma_id = p_turma_id AND ano_letivo = v_ano;
  IF v_atual IS NULL OR v_atual < 1 OR v_atual > 8 THEN
    RAISE EXCEPTION 'Nao ha fase em andamento para finalizar';
  END IF;

  v_prox := v_atual + 1;

  UPDATE turma_trilha
    SET ordem_atual = v_prox,
        iniciada_em = CASE WHEN v_prox <= 8 THEN v_agora ELSE NULL END,
        updated_at  = v_agora
  WHERE turma_id = p_turma_id AND ano_letivo = v_ano;

  -- Fase que fechou
  SELECT id INTO v_fase_atual FROM fases
   WHERE institution_id = v_inst AND segmento = v_seg
     AND ano_letivo = v_ano AND inteligencia_id = v_atual
   LIMIT 1;
  INSERT INTO turma_fase_evento (institution_id, turma_id, ano_letivo, ordem, fase_id, evento, professor_id, ocorrido_em)
  VALUES (v_inst, p_turma_id, v_ano, v_atual, v_fase_atual, 'finalizou', auth.uid(), v_agora);

  -- Próxima fase auto-iniciada (mesmo instante) — a menos que a trilha tenha acabado
  IF v_prox <= 8 THEN
    SELECT id INTO v_fase_prox FROM fases
     WHERE institution_id = v_inst AND segmento = v_seg
       AND ano_letivo = v_ano AND inteligencia_id = v_prox
     LIMIT 1;
    INSERT INTO turma_fase_evento (institution_id, turma_id, ano_letivo, ordem, fase_id, evento, professor_id, ocorrido_em)
    VALUES (v_inst, p_turma_id, v_ano, v_prox, v_fase_prox, 'iniciou', auth.uid(), v_agora);
  END IF;
END $$;

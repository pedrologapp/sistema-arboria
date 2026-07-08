-- =============================================================
-- RPCs de fase: avanço dentro do SUBCONJUNTO ATIVO da trilha da turma.
--
-- >>> MIGRATION JÁ APLICADA (aplicada pelo CEO; cabeçalho corrigido em 2026-07-08). <<<
-- Um futuro db push pode incluí-la normalmente: NÃO é aviso de bloqueio. É
-- ADITIVA: só CREATE OR REPLACE FUNCTION, nenhuma coluna/linha/constraint é
-- alterada. Passou por revisão de Riscos + Dados (mexe em RPC que move a trilha
-- da turma) e aprovação do Fundador.
--
-- O QUÊ MUDA vs 20260707000006: as RPCs deixam de assumir que a trilha tem
-- SEMPRE 8 posições. Agora o TOTAL de fases de uma turma é o nº de fases ATIVAS
-- configuradas em turma_fase_ordem (max(posicao)); quando a turma NÃO tem
-- configuração, o total é 8 (FALLBACK canônico). O avanço "finalizar" abre a
-- próxima posição SE ela existir dentro do subconjunto; ao finalizar a ÚLTIMA
-- posição (v_atual == total), a trilha fica COMPLETA (ordem_atual = total + 1)
-- e nenhuma posição inexistente é buscada.
--
-- GARANTIA DE FALLBACK (zero regressão): turma sem linhas em turma_fase_ordem
-- -> total = 8, posicao == inteligencia_id (via intel_da_posicao), exatamente
-- como hoje. Infantil e F1 em produção seguem intocados.
--
-- SEGURANÇA PRESERVADA (idêntica à 20260707000006):
--   - Trava de MENTOR no F2 (mentor principal da Casa da posição, ou gestor).
--   - SELECT ... FOR UPDATE na linha da turma_trilha (corrida na virada).
--   - GUARD anti-fase-fantasma SÓ no F2 (Infantil/F1 logam fase_id NULL e seguem).
--   - Notificação ao mentor da próxima Casa (ou aos admins) na MESMA transação.
--   - reverter_fase_turma restrita a coordenação/admin, log 'reverteu' append-only.
-- =============================================================

-- -------------------------------------------------------------
-- Helper: TOTAL de fases ATIVAS de uma turma (nº de posições configuradas).
-- Fallback 8 quando não há configuração. STABLE/SECURITY DEFINER, alinhado aos
-- helpers de 20260707000006.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.total_fases_ativas_turma(
  p_turma_id uuid, p_ano smallint
)
RETURNS smallint LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT COALESCE(
    (SELECT MAX(tfo.posicao)::smallint
       FROM public.turma_fase_ordem tfo
      WHERE tfo.turma_id = p_turma_id AND tfo.ano_letivo = p_ano),
    8::smallint
  );
$$;

-- -------------------------------------------------------------
-- iniciar_fase_turma : começa a trilha (posição 1), idempotente.
-- (Reescrita idêntica à 20260707000006: iniciar não depende do total; incluída
--  aqui só para o arquivo ficar autocontido.)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.iniciar_fase_turma(p_turma_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inst   uuid;
  v_seg    text;
  v_ano    smallint := EXTRACT(YEAR FROM now())::smallint;
  v_atual  smallint;
  v_intel1 smallint;
  v_fase   uuid;
BEGIN
  SELECT institution_id, COALESCE(segmento, 'infantil') INTO v_inst, v_seg
    FROM turmas WHERE id = p_turma_id;

  SELECT ordem_atual INTO v_atual FROM turma_trilha
   WHERE turma_id = p_turma_id AND ano_letivo = v_ano
   FOR UPDATE;

  IF v_atual IS NOT NULL AND v_atual >= 1 THEN
    RETURN;
  END IF;

  v_intel1 := public.intel_da_posicao(p_turma_id, v_ano, 1::smallint);

  IF v_seg = 'fundamental2' THEN
    IF NOT (public.eh_mentor_principal_da_casa(auth.uid(), v_intel1, v_ano)
            OR public.eh_gestor_de_fase(auth.uid())) THEN
      RAISE EXCEPTION 'Sem permissão: apenas o mentor da Casa desta fase (ou a coordenação) pode iniciar';
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM professor_turma pt
                   WHERE pt.professor_id = auth.uid() AND pt.turma_id = p_turma_id AND pt.ativo) THEN
      RAISE EXCEPTION 'Sem permissão nesta turma';
    END IF;
  END IF;

  SELECT id INTO v_fase FROM fases
   WHERE institution_id = v_inst AND segmento = v_seg
     AND ano_letivo = v_ano AND inteligencia_id = v_intel1
   LIMIT 1;
  IF v_seg = 'fundamental2' AND v_fase IS NULL THEN
    RAISE EXCEPTION 'Fase inexistente para a Casa % (seg %, ano %): rode o seed de fases antes de iniciar',
      v_intel1, v_seg, v_ano;
  END IF;

  INSERT INTO turma_trilha (institution_id, turma_id, ano_letivo, ordem_atual, iniciada_em)
  VALUES (v_inst, p_turma_id, v_ano, 1, now())
  ON CONFLICT (turma_id, ano_letivo) DO UPDATE
    SET ordem_atual = 1, iniciada_em = now(), updated_at = now();

  INSERT INTO turma_fase_evento (institution_id, turma_id, ano_letivo, ordem, fase_id, evento, professor_id, ocorrido_em)
  VALUES (v_inst, p_turma_id, v_ano, 1, v_fase, 'iniciou', auth.uid(), now());
END $$;

-- -------------------------------------------------------------
-- finalizar_fase_turma : fecha a posição atual, abre a próxima do SUBCONJUNTO,
-- notifica o mentor. Se a atual é a ÚLTIMA (== total), a trilha completa.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalizar_fase_turma(p_turma_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inst        uuid;
  v_seg         text;
  v_ano         smallint := EXTRACT(YEAR FROM now())::smallint;
  v_total       smallint;
  v_atual       smallint;
  v_prox        smallint;
  v_agora       timestamptz := now();
  v_intel_atual smallint;
  v_intel_prox  smallint;
  v_fase_atual  uuid;
  v_fase_prox   uuid;
  v_cap_prox    uuid;
  v_mentor      uuid;
BEGIN
  SELECT institution_id, COALESCE(segmento, 'infantil') INTO v_inst, v_seg
    FROM turmas WHERE id = p_turma_id;

  -- Total de fases ATIVAS da turma (subconjunto configurado; 8 no fallback).
  v_total := public.total_fases_ativas_turma(p_turma_id, v_ano);

  -- Trava a linha da trilha ANTES de ler a posição (evita dupla virada concorrente).
  SELECT ordem_atual INTO v_atual FROM turma_trilha
   WHERE turma_id = p_turma_id AND ano_letivo = v_ano
   FOR UPDATE;
  IF v_atual IS NULL OR v_atual < 1 OR v_atual > v_total THEN
    RAISE EXCEPTION 'Nao ha fase em andamento para finalizar';
  END IF;

  v_intel_atual := public.intel_da_posicao(p_turma_id, v_ano, v_atual);

  -- PERMISSÃO
  IF v_seg = 'fundamental2' THEN
    IF NOT (public.eh_mentor_principal_da_casa(auth.uid(), v_intel_atual, v_ano)
            OR public.eh_gestor_de_fase(auth.uid())) THEN
      RAISE EXCEPTION 'Sem permissão: apenas o mentor da Casa desta fase (ou a coordenação) pode finalizar';
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM professor_turma pt
                   WHERE pt.professor_id = auth.uid() AND pt.turma_id = p_turma_id AND pt.ativo) THEN
      RAISE EXCEPTION 'Sem permissão nesta turma';
    END IF;
  END IF;

  v_prox := v_atual + 1;

  -- GUARD anti-fase-fantasma: SÓ F2. Só há próxima se v_prox <= total (dentro do
  -- subconjunto). Sem a `fases` da próxima Casa no F2, a virada é abortada.
  -- Infantil/F1: v_fase_prox pode ser NULL, loga 'iniciou' com fase_id NULL e
  -- PROSSEGUE (não aborta). Zero regressão.
  IF v_prox <= v_total THEN
    v_intel_prox := public.intel_da_posicao(p_turma_id, v_ano, v_prox);
    SELECT id INTO v_fase_prox FROM fases
     WHERE institution_id = v_inst AND segmento = v_seg
       AND ano_letivo = v_ano AND inteligencia_id = v_intel_prox
     LIMIT 1;
    IF v_seg = 'fundamental2' AND v_fase_prox IS NULL THEN
      RAISE EXCEPTION 'Fase inexistente para a proxima Casa % (seg %, ano %): virada abortada',
        v_intel_prox, v_seg, v_ano;
    END IF;
  END IF;

  -- Avança. Ao passar da última posição, ordem_atual = total + 1 (trilha completa)
  -- e iniciada_em = NULL. O CHECK (0..9) da turma_trilha comporta total+1 <= 9.
  UPDATE turma_trilha
    SET ordem_atual = v_prox,
        iniciada_em = CASE WHEN v_prox <= v_total THEN v_agora ELSE NULL END,
        updated_at  = v_agora
  WHERE turma_id = p_turma_id AND ano_letivo = v_ano;

  -- Log da Casa que fechou.
  SELECT id INTO v_fase_atual FROM fases
   WHERE institution_id = v_inst AND segmento = v_seg
     AND ano_letivo = v_ano AND inteligencia_id = v_intel_atual
   LIMIT 1;
  INSERT INTO turma_fase_evento (institution_id, turma_id, ano_letivo, ordem, fase_id, evento, professor_id, ocorrido_em)
  VALUES (v_inst, p_turma_id, v_ano, v_atual, v_fase_atual, 'finalizou', auth.uid(), v_agora);

  -- Próxima Casa auto-iniciada + notificação do mentor (só se a trilha continua).
  IF v_prox <= v_total THEN
    INSERT INTO turma_fase_evento (institution_id, turma_id, ano_letivo, ordem, fase_id, evento, professor_id, ocorrido_em)
    VALUES (v_inst, p_turma_id, v_ano, v_prox, v_fase_prox, 'iniciou', auth.uid(), v_agora);

    -- Mentor e notificacao sao conceito SO do F2 (Casas). No Infantil/F1 nao
    -- ha mentor, entao nada de notificacao (senao spam de 'sem mentor').
    IF v_seg = 'fundamental2' THEN
      SELECT id INTO v_cap_prox FROM capitulos
       WHERE fase_id = v_fase_prox AND institution_id = v_inst
       LIMIT 1;

      SELECT pc.professor_id INTO v_mentor
      FROM professor_casa pc
      WHERE pc.casa_id = v_intel_prox AND pc.ano_letivo = v_ano
        AND pc.ativo = true AND pc.eh_mentor_principal = true
        AND pc.institution_id = v_inst
      ORDER BY pc.created_at, pc.professor_id
      LIMIT 1;

      IF v_mentor IS NOT NULL THEN
        INSERT INTO notificacoes (institution_id, destinatario_id, tipo, titulo, corpo, ref_turma_id, ref_fase_id, ref_capitulo_id)
        VALUES (v_inst, v_mentor, 'fase_virada',
                'Sua Casa é a próxima nesta turma',
                'Uma turma acabou de entrar na fase da sua Casa. Abra a turma para conduzir.',
                p_turma_id, v_fase_prox, v_cap_prox);
      ELSE
        INSERT INTO notificacoes (institution_id, destinatario_id, tipo, titulo, corpo, ref_turma_id, ref_fase_id, ref_capitulo_id)
        SELECT v_inst, ur.user_id, 'sem_mentor',
               'Fase virou sem mentor definido',
               'Uma turma entrou numa fase cuja Casa não tem mentor principal ativo. Defina um mentor.',
               p_turma_id, v_fase_prox, v_cap_prox
        FROM public.user_roles ur
        WHERE ur.role = 'admin'::app_role
          AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ur.user_id AND p.institution_id = v_inst);
      END IF;
    END IF;
  END IF;
END $$;

-- -------------------------------------------------------------
-- reverter_fase_turma : desfaz a última virada. Restrita a coordenação/admin.
-- Log 'reverteu' append-only (nunca DELETE/UPDATE de evento).
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reverter_fase_turma(p_turma_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inst        uuid;
  v_seg         text;
  v_ano         smallint := EXTRACT(YEAR FROM now())::smallint;
  v_total       smallint;
  v_atual       smallint;
  v_novo        smallint;
  v_log_ordem   smallint;
  v_intel_log   smallint;
  v_fase_log    uuid;
  v_agora       timestamptz := now();
BEGIN
  IF NOT public.eh_gestor_de_fase(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão: reverter fase é restrito à coordenação/admin';
  END IF;

  SELECT institution_id, COALESCE(segmento, 'infantil') INTO v_inst, v_seg
    FROM turmas WHERE id = p_turma_id;

  v_total := public.total_fases_ativas_turma(p_turma_id, v_ano);

  SELECT ordem_atual INTO v_atual FROM turma_trilha
   WHERE turma_id = p_turma_id AND ano_letivo = v_ano
   FOR UPDATE;
  IF v_atual IS NULL OR v_atual < 1 THEN
    RAISE EXCEPTION 'Nada a reverter nesta turma';
  END IF;

  v_novo := v_atual - 1;  -- 0 = volta para "não começou"

  UPDATE turma_trilha
    SET ordem_atual = v_novo,
        iniciada_em = CASE WHEN v_novo BETWEEN 1 AND v_total THEN v_agora ELSE NULL END,
        updated_at  = v_agora
  WHERE turma_id = p_turma_id AND ano_letivo = v_ano;

  -- Log compensatório: a posição que estava ativa e foi desfeita (limitada ao
  -- total, caso a trilha estivesse "completa" em total+1).
  v_log_ordem := LEAST(v_atual, v_total);
  v_intel_log := public.intel_da_posicao(p_turma_id, v_ano, v_log_ordem);
  SELECT id INTO v_fase_log FROM fases
   WHERE institution_id = v_inst AND segmento = v_seg
     AND ano_letivo = v_ano AND inteligencia_id = v_intel_log
   LIMIT 1;

  INSERT INTO turma_fase_evento (institution_id, turma_id, ano_letivo, ordem, fase_id, evento, professor_id, ocorrido_em)
  VALUES (v_inst, p_turma_id, v_ano, v_log_ordem, v_fase_log, 'reverteu', auth.uid(), v_agora);
END $$;

GRANT EXECUTE ON FUNCTION public.total_fases_ativas_turma(uuid, smallint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.iniciar_fase_turma(uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalizar_fase_turma(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverter_fase_turma(uuid)  TO authenticated;

-- ============================================================
-- finalizar_fase_turma: TRAVA de nota (F2). A fase so finaliza se TODO grupo com
-- alunos (papel categoria 'time') tiver nota em capitulo_projeto_nota. Se falta
-- nota, bloqueia com mensagem clara. Pedido do Fundador 28/07.
--
-- Mantem tudo o que ja existia (virada + resumo do capitulo no diario). So
-- acrescenta a checagem da nota logo apos a permissao, antes de avancar.
-- ============================================================
CREATE OR REPLACE FUNCTION public.finalizar_fase_turma(p_turma_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_cap_atual   uuid;
  v_cap_nome    text;
  v_sem_nota    int;
BEGIN
  SELECT institution_id, COALESCE(segmento, 'infantil') INTO v_inst, v_seg
    FROM turmas WHERE id = p_turma_id;

  v_total := public.total_fases_ativas_turma(p_turma_id, v_ano);

  SELECT ordem_atual INTO v_atual FROM turma_trilha
   WHERE turma_id = p_turma_id AND ano_letivo = v_ano
   FOR UPDATE;
  IF v_atual IS NULL OR v_atual < 1 OR v_atual > v_total THEN
    RAISE EXCEPTION 'Nao ha fase em andamento para finalizar';
  END IF;

  v_intel_atual := public.intel_da_posicao(p_turma_id, v_ano, v_atual);

  -- PERMISSAO
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

  -- Fase atual (capitulo desta fase). Precisa cedo pra trava + resumo.
  SELECT id INTO v_fase_atual FROM fases
   WHERE institution_id = v_inst AND segmento = v_seg
     AND ano_letivo = v_ano AND inteligencia_id = v_intel_atual
   LIMIT 1;

  -- >>> TRAVA DA NOTA (so F2): nao finaliza se algum grupo com alunos esta sem nota.
  IF v_seg = 'fundamental2' THEN
    SELECT id, nome INTO v_cap_atual, v_cap_nome
      FROM capitulos WHERE fase_id = v_fase_atual AND institution_id = v_inst LIMIT 1;
    IF v_cap_atual IS NOT NULL THEN
      SELECT count(*) INTO v_sem_nota FROM (
        SELECT al.papel_id, COALESCE(al.grupo, 1) AS grupo
        FROM capitulo_alocacoes al
        JOIN capitulo_papeis pap ON pap.id = al.papel_id AND pap.categoria = 'time'
        WHERE al.capitulo_id = v_cap_atual AND al.turma_id = p_turma_id
        GROUP BY al.papel_id, COALESCE(al.grupo, 1)
      ) g
      WHERE NOT EXISTS (
        SELECT 1 FROM capitulo_projeto_nota n
        WHERE n.capitulo_id = v_cap_atual AND n.turma_id = p_turma_id
          AND n.papel_id = g.papel_id AND COALESCE(n.grupo, 1) = g.grupo
      );
      IF v_sem_nota > 0 THEN
        RAISE EXCEPTION 'Nao da pra finalizar: % grupo(s) ainda sem nota. Todo grupo precisa de nota antes de finalizar a fase.', v_sem_nota;
      END IF;
    END IF;
  END IF;
  -- <<< FIM da trava

  v_prox := v_atual + 1;

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

  UPDATE turma_trilha
    SET ordem_atual = v_prox,
        iniciada_em = CASE WHEN v_prox <= v_total THEN v_agora ELSE NULL END,
        updated_at  = v_agora
  WHERE turma_id = p_turma_id AND ano_letivo = v_ano;

  INSERT INTO turma_fase_evento (institution_id, turma_id, ano_letivo, ordem, fase_id, evento, professor_id, ocorrido_em)
  VALUES (v_inst, p_turma_id, v_ano, v_atual, v_fase_atual, 'finalizou', auth.uid(), v_agora);

  -- Resumo do capitulo no diario (so F2). Nao duplica em re-finalizacao.
  IF v_seg = 'fundamental2' AND v_cap_atual IS NOT NULL THEN
    INSERT INTO observacoes (institution_id, aluno_id, professor_id, turma_id, fase_id, capitulo_id,
                             observacao_texto, origem, origem_captura, data_observacao)
    SELECT v_inst, al.aluno_id, auth.uid(), p_turma_id, v_fase_atual, v_cap_atual,
           'Capítulo ' || v_cap_nome || ': participou como ' || pap.nome ||
             CASE WHEN al.grupo IS NOT NULL THEN ' (grupo ' || al.grupo || ')' ELSE '' END || '.',
           'manual', 'capitulo', CURRENT_DATE
    FROM capitulo_alocacoes al
    JOIN capitulo_papeis pap ON pap.id = al.papel_id AND pap.categoria = 'time'
    WHERE al.capitulo_id = v_cap_atual AND al.turma_id = p_turma_id
      AND NOT EXISTS (
        SELECT 1 FROM observacoes o
        WHERE o.aluno_id = al.aluno_id AND o.capitulo_id = v_cap_atual
          AND o.origem_captura = 'capitulo'
          AND o.observacao_texto LIKE 'Capítulo %participou como %'
          AND o.excluida_em IS NULL
      );
  END IF;

  IF v_prox <= v_total THEN
    INSERT INTO turma_fase_evento (institution_id, turma_id, ano_letivo, ordem, fase_id, evento, professor_id, ocorrido_em)
    VALUES (v_inst, p_turma_id, v_ano, v_prox, v_fase_prox, 'iniciou', auth.uid(), v_agora);

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
END $function$;

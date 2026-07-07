-- =============================================================
-- RPCs de fase reescritas para o F2 (mentor + ordem por turma + guardas),
-- PRESERVANDO Infantil/F1 por FALLBACK.
--
-- O QUÊ: nova versão de iniciar_fase_turma / finalizar_fase_turma e a NOVA
-- reverter_fase_turma. Toda a segurança pedida por Riscos:
--   - Trava de MENTOR no F2 (só o mentor principal da Casa atual, ou admin).
--   - SELECT ... FOR UPDATE na linha da turma_trilha (race na virada).
--   - Resolução da próxima Casa via turma_fase_ordem (fallback ordinal).
--   - GUARD anti-fase-fantasma: sem a `fases` da próxima Casa, aborta a virada.
--   - Notificação ao mentor da próxima Casa na MESMA transação (ou admin se não
--     houver mentor amarrado — nunca engole em silêncio).
--
-- PRESERVAÇÃO INFANTIL/F1: para segmento <> 'fundamental2' o comportamento é o
-- de HOJE: gate por professor_turma e posicao == inteligencia_id (fallback).
-- Nenhuma turma do Infantil/F1 passa pela trava de mentor.
--
-- ADITIVO: só CREATE OR REPLACE FUNCTION + widening de um CHECK (sem perda de
-- dado). Nenhuma coluna/linha é apagada.
-- =============================================================

-- -------------------------------------------------------------
-- (0) Widening do CHECK de turma_fase_evento.evento para aceitar 'reverteu'.
--     Append-only preservado: linhas existentes ('iniciou'/'finalizou') seguem
--     válidas. Idempotente: localiza o check atual pela coluna e recria nomeado.
--     >>> TOCA ESQUEMA de tabela de log (condução, não observação). Sinalizado
--         a Dados/Riscos no relatório. <<<
-- -------------------------------------------------------------
DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT c.conname INTO v_conname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'turma_fase_evento'
    AND c.contype = 'c'
    AND c.conname <> 'turma_fase_evento_evento_check2'   -- nunca dropa a nossa
    AND pg_get_constraintdef(c.oid) ILIKE '%evento%'
    AND pg_get_constraintdef(c.oid) ILIKE '%iniciou%'
  LIMIT 1;

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.turma_fase_evento DROP CONSTRAINT %I', v_conname);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'turma_fase_evento_evento_check2'
  ) THEN
    ALTER TABLE public.turma_fase_evento
      ADD CONSTRAINT turma_fase_evento_evento_check2
      CHECK (evento IN ('iniciou','finalizou','reverteu'));
  END IF;
END $$;

-- -------------------------------------------------------------
-- Helpers
-- -------------------------------------------------------------

-- É o mentor principal, ativo, da Casa p_casa no ano p_ano?
CREATE OR REPLACE FUNCTION public.eh_mentor_principal_da_casa(
  p_user_id uuid, p_casa smallint, p_ano smallint
)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.professor_casa pc
    WHERE pc.professor_id = p_user_id
      AND pc.casa_id = p_casa
      AND pc.ano_letivo = p_ano
      AND pc.ativo = true
      AND pc.eh_mentor_principal = true
  );
$$;

-- Tier "coordenador/admin". NOTA DE ESCOPO: não há app_role de coordenador-
-- educador hoje (ver 20260707000002). Enquanto não modelado, o tier é admin +
-- super_admin. Sinalizado ao Fundador.
CREATE OR REPLACE FUNCTION public.eh_gestor_de_fase(p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT public.has_role(p_user_id, 'admin'::app_role)
      OR public.has_role(p_user_id, 'super_admin'::app_role);
$$;

-- Resolve a inteligencia_id (Casa) de uma POSIÇÃO na trilha da turma.
-- Fallback: sem ordem configurada, posicao == inteligencia_id (Infantil/F1 e
-- turmas do F2 ainda não configuradas seguem o comportamento de hoje).
CREATE OR REPLACE FUNCTION public.intel_da_posicao(
  p_turma_id uuid, p_ano smallint, p_posicao smallint
)
RETURNS smallint LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT COALESCE(
    (SELECT tfo.inteligencia_id FROM public.turma_fase_ordem tfo
      WHERE tfo.turma_id = p_turma_id AND tfo.ano_letivo = p_ano AND tfo.posicao = p_posicao),
    p_posicao
  );
$$;

-- -------------------------------------------------------------
-- iniciar_fase_turma — começa a trilha (posição 1), idempotente.
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

  -- Trava a linha da trilha (se já existir) contra corrida na virada.
  SELECT ordem_atual INTO v_atual FROM turma_trilha
   WHERE turma_id = p_turma_id AND ano_letivo = v_ano
   FOR UPDATE;

  -- Já começou? no-op — não sobrescreve nem loga de novo.
  IF v_atual IS NOT NULL AND v_atual >= 1 THEN
    RETURN;
  END IF;

  -- Casa da posição 1 (fallback ordinal).
  v_intel1 := public.intel_da_posicao(p_turma_id, v_ano, 1::smallint);

  -- PERMISSÃO
  IF v_seg = 'fundamental2' THEN
    -- F2: mentor principal da Casa da posição 1, ou gestor (admin).
    IF NOT (public.eh_mentor_principal_da_casa(auth.uid(), v_intel1, v_ano)
            OR public.eh_gestor_de_fase(auth.uid())) THEN
      RAISE EXCEPTION 'Sem permissão: apenas o mentor da Casa desta fase (ou a coordenação) pode iniciar';
    END IF;
  ELSE
    -- Infantil/F1: comportamento de hoje (professor da turma).
    IF NOT EXISTS (SELECT 1 FROM professor_turma pt
                   WHERE pt.professor_id = auth.uid() AND pt.turma_id = p_turma_id AND pt.ativo) THEN
      RAISE EXCEPTION 'Sem permissão nesta turma';
    END IF;
  END IF;

  -- GUARD anti-fase-fantasma: SÓ F2. Sem a `fases` da Casa da posição 1, aborta.
  -- Infantil/F1 seguem EXATAMENTE o comportamento de produção: se v_fase for NULL,
  -- loga com fase_id NULL e PROSSEGUE (não aborta). Zero regressão no que está no ar.
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
-- finalizar_fase_turma — fecha a Casa atual, abre a próxima (mesmo instante),
-- notifica o mentor da próxima Casa. Aborta se a próxima fase for fantasma.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalizar_fase_turma(p_turma_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inst        uuid;
  v_seg         text;
  v_ano         smallint := EXTRACT(YEAR FROM now())::smallint;
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

  -- Trava a linha da trilha ANTES de ler a posição (evita dupla virada concorrente).
  SELECT ordem_atual INTO v_atual FROM turma_trilha
   WHERE turma_id = p_turma_id AND ano_letivo = v_ano
   FOR UPDATE;
  IF v_atual IS NULL OR v_atual < 1 OR v_atual > 8 THEN
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

  -- GUARD anti-fase-fantasma: SÓ F2. Se há próxima posição no F2, a `fases` dela
  -- TEM de existir ANTES de mexer na trilha; sem ela a transação inteira falha e
  -- nada avança. Infantil/F1 seguem EXATAMENTE a produção: v_fase_prox pode ser
  -- NULL, loga 'iniciou' com fase_id NULL e PROSSEGUE (não aborta). Zero regressão.
  IF v_prox <= 8 THEN
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
        iniciada_em = CASE WHEN v_prox <= 8 THEN v_agora ELSE NULL END,
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
  IF v_prox <= 8 THEN
    INSERT INTO turma_fase_evento (institution_id, turma_id, ano_letivo, ordem, fase_id, evento, professor_id, ocorrido_em)
    VALUES (v_inst, p_turma_id, v_ano, v_prox, v_fase_prox, 'iniciou', auth.uid(), v_agora);

    -- Capítulo da próxima fase (ponteiro opcional para a notificação).
    SELECT id INTO v_cap_prox FROM capitulos
     WHERE fase_id = v_fase_prox AND institution_id = v_inst
     LIMIT 1;

    -- Mentor principal da próxima Casa (ano corrente).
    SELECT pc.professor_id INTO v_mentor
    FROM professor_casa pc
    WHERE pc.casa_id = v_intel_prox AND pc.ano_letivo = v_ano
      AND pc.ativo = true AND pc.eh_mentor_principal = true
      AND pc.institution_id = v_inst
    ORDER BY pc.created_at, pc.professor_id   -- determinístico se houver >1 mentor principal
    LIMIT 1;

    IF v_mentor IS NOT NULL THEN
      INSERT INTO notificacoes (institution_id, destinatario_id, tipo, titulo, corpo, ref_turma_id, ref_fase_id, ref_capitulo_id)
      VALUES (v_inst, v_mentor, 'fase_virada',
              'Sua Casa é a próxima nesta turma',
              'Uma turma acabou de entrar na fase da sua Casa. Abra a turma para conduzir.',
              p_turma_id, v_fase_prox, v_cap_prox);
    ELSE
      -- Sem mentor amarrado: NUNCA engole em silêncio -> avisa os admins da instituição.
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
END $$;

-- -------------------------------------------------------------
-- reverter_fase_turma (NOVA) — desfaz a última virada.
-- Restrita a coordenador/admin (tier eh_gestor_de_fase). Devolve a posição e
-- grava evento COMPENSATÓRIO 'reverteu' (append-only; nunca DELETE/UPDATE de log).
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reverter_fase_turma(p_turma_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inst        uuid;
  v_seg         text;
  v_ano         smallint := EXTRACT(YEAR FROM now())::smallint;
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

  SELECT ordem_atual INTO v_atual FROM turma_trilha
   WHERE turma_id = p_turma_id AND ano_letivo = v_ano
   FOR UPDATE;
  IF v_atual IS NULL OR v_atual < 1 THEN
    RAISE EXCEPTION 'Nada a reverter nesta turma';
  END IF;

  v_novo := v_atual - 1;  -- 0 = volta para "não começou"

  UPDATE turma_trilha
    SET ordem_atual = v_novo,
        iniciada_em = CASE WHEN v_novo BETWEEN 1 AND 8 THEN v_agora ELSE NULL END,
        updated_at  = v_agora
  WHERE turma_id = p_turma_id AND ano_letivo = v_ano;

  -- Log compensatório: registra a Casa que estava ativa e foi desfeita (1..8).
  v_log_ordem := LEAST(v_atual, 8::smallint);
  v_intel_log := public.intel_da_posicao(p_turma_id, v_ano, v_log_ordem);
  SELECT id INTO v_fase_log FROM fases
   WHERE institution_id = v_inst AND segmento = v_seg
     AND ano_letivo = v_ano AND inteligencia_id = v_intel_log
   LIMIT 1;

  INSERT INTO turma_fase_evento (institution_id, turma_id, ano_letivo, ordem, fase_id, evento, professor_id, ocorrido_em)
  VALUES (v_inst, p_turma_id, v_ano, v_log_ordem, v_fase_log, 'reverteu', auth.uid(), v_agora);
END $$;

GRANT EXECUTE ON FUNCTION public.iniciar_fase_turma(uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalizar_fase_turma(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverter_fase_turma(uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.eh_mentor_principal_da_casa(uuid, smallint, smallint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eh_gestor_de_fase(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.intel_da_posicao(uuid, smallint, smallint) TO authenticated;

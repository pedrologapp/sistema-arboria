-- =============================================================
-- Histórico da trilha do Infantil — LOG APPEND-ONLY de início/fim de fase.
--
-- Fonte de verdade AUDITÁVEL do percurso da turma no ano. turma_trilha
-- (ordem_atual/iniciada_em) rebaixa a CACHE derivado da posição atual.
-- Serve o relatório do Coordenador = linha do tempo da CONDUÇÃO DA TURMA
-- (datas, duração, quem conduziu) — proibido cruzar com contagem de
-- observações da criança (Execução ≠ processamento; Silêncio ≠ ausência).
--
-- Aprovado por Dados + Riscos + Fundador (01/07/2026). Ver decisoes.md/riscos.md.
--
-- NOTA (follow-up conhecido): ano_letivo aqui usa EXTRACT(YEAR FROM now())
-- para casar EXATAMENTE com turma_trilha (mesma expressão → nunca divergem).
-- Dados sinalizou alinhar AMBOS a institution_settings numa passada futura
-- (risco na virada dez/jan). Não alterado agora pra não mexer na régua que
-- a trilha em produção já usa.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.turma_fase_evento (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  turma_id       uuid NOT NULL REFERENCES public.turmas(id)       ON DELETE CASCADE,
  ano_letivo     smallint NOT NULL,
  ordem          smallint NOT NULL CHECK (ordem BETWEEN 1 AND 8),      -- ordinal da fase (== inteligencia.id)
  fase_id        uuid REFERENCES public.fases(id) ON DELETE RESTRICT,  -- âncora do rio longitudinal; NUNCA cascade
  evento         text NOT NULL CHECK (evento IN ('iniciou','finalizou')),
  professor_id   uuid NOT NULL REFERENCES public.profiles(id),         -- quem agiu (auth.uid do momento)
  ocorrido_em    timestamptz NOT NULL DEFAULT now(),                   -- UTC; renderiza em America/Fortaleza
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tfe_turma_ano
  ON public.turma_fase_evento (turma_id, ano_letivo, ocorrido_em);

ALTER TABLE public.turma_fase_evento ENABLE ROW LEVEL SECURITY;

-- SELECT: educadores/admin da instituição (espelha turma_trilha; criança nunca lê).
-- SEM policy de INSERT/UPDATE/DELETE: escrita só via RPC SECURITY DEFINER (bypassa
-- RLS); tabela IMUTÁVEL por construção — "corrigir" = novo evento, jamais DELETE/UPDATE.
DROP POLICY IF EXISTS "Evento fase visivel educadores" ON public.turma_fase_evento;
CREATE POLICY "Evento fase visivel educadores" ON public.turma_fase_evento FOR SELECT TO public
USING (
  institution_id = get_user_institution_id()
  AND (has_role(auth.uid(), 'professor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- =============================================================
-- RPCs atualizados: gravam o log NA MESMA TRANSAÇÃO que movem o cache.
-- =============================================================

-- Começar a trilha (fase 1) — só se ainda não começou (idempotente, sem log duplicado)
CREATE OR REPLACE FUNCTION public.iniciar_fase_turma(p_turma_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inst  uuid;
  v_ano   smallint := EXTRACT(YEAR FROM now())::smallint;
  v_atual smallint;
  v_fase  uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM professor_turma pt
                 WHERE pt.professor_id = auth.uid() AND pt.turma_id = p_turma_id AND pt.ativo) THEN
    RAISE EXCEPTION 'Sem permissão nesta turma';
  END IF;

  SELECT institution_id INTO v_inst FROM turmas WHERE id = p_turma_id;

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
   WHERE institution_id = v_inst AND segmento = 'infantil'
     AND ano_letivo = v_ano AND inteligencia_id = 1
   LIMIT 1;

  INSERT INTO turma_fase_evento (institution_id, turma_id, ano_letivo, ordem, fase_id, evento, professor_id, ocorrido_em)
  VALUES (v_inst, p_turma_id, v_ano, 1, v_fase, 'iniciou', auth.uid(), now());
END $$;

-- Finalizar a fase atual — avança +1 (não pula). O auto-início da próxima é o
-- MESMO evento de negócio: loga 'finalizou N' + (se N<8) 'iniciou N+1' no mesmo instante.
CREATE OR REPLACE FUNCTION public.finalizar_fase_turma(p_turma_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inst       uuid;
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

  SELECT institution_id INTO v_inst FROM turmas WHERE id = p_turma_id;

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
   WHERE institution_id = v_inst AND segmento = 'infantil'
     AND ano_letivo = v_ano AND inteligencia_id = v_atual
   LIMIT 1;
  INSERT INTO turma_fase_evento (institution_id, turma_id, ano_letivo, ordem, fase_id, evento, professor_id, ocorrido_em)
  VALUES (v_inst, p_turma_id, v_ano, v_atual, v_fase_atual, 'finalizou', auth.uid(), v_agora);

  -- Próxima fase auto-iniciada (mesmo instante) — a menos que a trilha tenha acabado
  IF v_prox <= 8 THEN
    SELECT id INTO v_fase_prox FROM fases
     WHERE institution_id = v_inst AND segmento = 'infantil'
       AND ano_letivo = v_ano AND inteligencia_id = v_prox
     LIMIT 1;
    INSERT INTO turma_fase_evento (institution_id, turma_id, ano_letivo, ordem, fase_id, evento, professor_id, ocorrido_em)
    VALUES (v_inst, p_turma_id, v_ano, v_prox, v_fase_prox, 'iniciou', auth.uid(), v_agora);
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.iniciar_fase_turma(uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalizar_fase_turma(uuid) TO authenticated;

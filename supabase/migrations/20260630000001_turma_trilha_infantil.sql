-- =============================================================
-- Trilha do Infantil ("O ano") — persistência por STATUS, não por data.
-- Marcador por turma de "qual fase a turma está". NÃO mexe nas observações
-- (o rio longitudinal continua preso a fases.id). Aprovado por Dados + Riscos (30/06).
-- =============================================================

-- Marcador: 1 linha por turma/ano
CREATE TABLE IF NOT EXISTS public.turma_trilha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  ano_letivo smallint NOT NULL,
  ordem_atual smallint NOT NULL DEFAULT 0 CHECK (ordem_atual BETWEEN 0 AND 9), -- 0 = não começou; 9 = trilha concluída
  iniciada_em timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (turma_id, ano_letivo)
);

ALTER TABLE public.turma_trilha ENABLE ROW LEVEL SECURITY;

-- Leitura: educadores/admin da instituição (criança não usa o app). Escrita só via RPC.
DROP POLICY IF EXISTS "Trilha visivel educadores" ON public.turma_trilha;
CREATE POLICY "Trilha visivel educadores" ON public.turma_trilha FOR SELECT TO public
USING (
  institution_id = get_user_institution_id()
  AND (has_role(auth.uid(), 'professor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Começar a trilha (fase 1) — só se ainda não começou
CREATE OR REPLACE FUNCTION public.iniciar_fase_turma(p_turma_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inst uuid; v_ano smallint := EXTRACT(YEAR FROM now())::smallint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM professor_turma pt
                 WHERE pt.professor_id = auth.uid() AND pt.turma_id = p_turma_id AND pt.ativo) THEN
    RAISE EXCEPTION 'Sem permissão nesta turma';
  END IF;
  SELECT institution_id INTO v_inst FROM turmas WHERE id = p_turma_id;
  INSERT INTO turma_trilha (institution_id, turma_id, ano_letivo, ordem_atual, iniciada_em)
  VALUES (v_inst, p_turma_id, v_ano, 1, now())
  ON CONFLICT (turma_id, ano_letivo) DO UPDATE
    SET ordem_atual = CASE WHEN turma_trilha.ordem_atual = 0 THEN 1 ELSE turma_trilha.ordem_atual END,
        iniciada_em = CASE WHEN turma_trilha.ordem_atual = 0 THEN now() ELSE turma_trilha.iniciada_em END,
        updated_at = now();
END $$;

-- Finalizar a fase atual — avança +1 (não pula; se era 8, vira 9 = trilha concluída)
CREATE OR REPLACE FUNCTION public.finalizar_fase_turma(p_turma_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ano smallint := EXTRACT(YEAR FROM now())::smallint; v_atual smallint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM professor_turma pt
                 WHERE pt.professor_id = auth.uid() AND pt.turma_id = p_turma_id AND pt.ativo) THEN
    RAISE EXCEPTION 'Sem permissão nesta turma';
  END IF;
  SELECT ordem_atual INTO v_atual FROM turma_trilha WHERE turma_id = p_turma_id AND ano_letivo = v_ano;
  IF v_atual IS NULL OR v_atual < 1 OR v_atual > 8 THEN
    RAISE EXCEPTION 'Nao ha fase em andamento para finalizar';
  END IF;
  UPDATE turma_trilha
    SET ordem_atual = v_atual + 1,
        iniciada_em = CASE WHEN v_atual + 1 <= 8 THEN now() ELSE NULL END,
        updated_at = now()
  WHERE turma_id = p_turma_id AND ano_letivo = v_ano;
END $$;

GRANT EXECUTE ON FUNCTION public.iniciar_fase_turma(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalizar_fase_turma(uuid) TO authenticated;

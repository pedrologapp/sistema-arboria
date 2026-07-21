-- ============================================================
-- Vínculo observação -> atividade + canal de captura (aula/diário).
-- Decisão do Fundador 21/07 (pareceres Dados + Riscos, ver registros).
--
-- Objetivo: a observação feita no "Iniciar aula" fica ligada à ATIVIDADE da aula
-- (contexto pra IA + referência clicável no Diário), e a gente distingue de onde
-- ela foi capturada (aula x diário).
--
-- ADITIVO e de baixo risco (Riscos: sem veto). Regras dos pareceres embutidas:
--  - atividade_id ON DELETE SET NULL: apagar/desativar atividade NUNCA apaga a
--    observação da criança (o registro do menor prevalece).
--  - origem_captura é campo SEPARADO de `origem` (origem = autoria manual/ia, com
--    CHECK proprio; nao sobrecarregar). NULL = legado nao rotulado (sem backfill:
--    proibido inferir proveniencia retroativa).
--  - Trava de coerencia de instituicao (a atividade tem que ser da mesma escola).
--  - View v_observacoes_para_ia (security_invoker, LEFT JOIN, filtra excluidas).
-- ============================================================

-- 1. Vínculo com a atividade da aula.
ALTER TABLE public.observacoes
  ADD COLUMN IF NOT EXISTS atividade_id uuid REFERENCES public.atividades(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_obs_atividade
  ON public.observacoes(atividade_id) WHERE atividade_id IS NOT NULL;

COMMENT ON COLUMN public.observacoes.atividade_id IS
  'Atividade do banco em que a observacao foi feita (aula). ON DELETE SET NULL: apagar atividade nunca apaga a observacao. NULL = aula sem plano OU registro nao vinculado.';

-- 2. Canal de captura (ortogonal a `origem`, que e autoria manual/ia).
ALTER TABLE public.observacoes
  ADD COLUMN IF NOT EXISTS origem_captura text;

ALTER TABLE public.observacoes DROP CONSTRAINT IF EXISTS obs_origem_captura_check;
ALTER TABLE public.observacoes
  ADD CONSTRAINT obs_origem_captura_check
  CHECK (origem_captura IS NULL OR origem_captura IN ('aula', 'diario', 'capitulo'));

COMMENT ON COLUMN public.observacoes.origem_captura IS
  'Canal de captura: aula (rajada Iniciar aula), diario (registro no Diario), capitulo (avaliacao de capitulo). NULL = legado anterior a jul/2026, nao rotulado. Ortogonal a origem (autoria).';

-- 3. Trava de coerencia de instituicao (Riscos R44): a atividade apontada tem
--    que ser da MESMA instituicao da observacao. Barra insert malicioso via API.
CREATE OR REPLACE FUNCTION public.obs_atividade_mesma_instituicao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.atividade_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.atividades a
      WHERE a.id = NEW.atividade_id AND a.institution_id = NEW.institution_id
    ) THEN
      RAISE EXCEPTION 'atividade_id (%) nao pertence a instituicao da observacao', NEW.atividade_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_obs_atividade_inst ON public.observacoes;
CREATE TRIGGER trg_obs_atividade_inst
  BEFORE INSERT OR UPDATE OF atividade_id ON public.observacoes
  FOR EACH ROW EXECUTE FUNCTION public.obs_atividade_mesma_instituicao();

-- 4. View unica que a IA consome: junta o contexto da atividade, filtra excluidas
--    por construcao, respeita RLS (security_invoker). LEFT JOIN: observacao sem
--    atividade nunca some.
DROP VIEW IF EXISTS public.v_observacoes_para_ia;
CREATE VIEW public.v_observacoes_para_ia
WITH (security_invoker = on) AS
SELECT
  o.id, o.aluno_id, o.turma_id, o.fase_id, o.data_observacao,
  o.observacao_texto, o.sinal_id, o.origem, o.origem_captura,
  o.atividade_id,
  a.nome           AS atividade_nome,
  a.objetivo       AS atividade_objetivo,
  a.o_que_observar AS atividade_o_que_observar
FROM public.observacoes o
LEFT JOIN public.atividades a ON a.id = o.atividade_id
WHERE o.excluida_em IS NULL;

COMMENT ON VIEW public.v_observacoes_para_ia IS
  'Observacoes + contexto da atividade da aula, pra IA. security_invoker, filtra excluidas embutido. LEFT JOIN: observacao sem atividade continua aparecendo.';

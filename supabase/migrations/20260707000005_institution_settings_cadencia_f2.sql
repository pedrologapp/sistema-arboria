-- =============================================================
-- Cadência de projeção do calendário do F2 (config aditiva).
--
-- O QUÊ: coluna nullable f2_dias_por_encontro em institution_settings.
--
-- POR QUÊ: a reforma do F2 vai PROJETAR o calendário previsto dos encontros da
-- turma (v2). Essa projeção precisa de uma cadência-base (dias entre encontros).
-- Aqui só deixamos a config pronta; o cálculo do calendário é v2. Nullable =
-- sem cadência definida, sem projeção (comportamento neutro hoje).
--
-- ADITIVO: ADD COLUMN nullable. Nenhuma coluna existente é alterada/renomeada.
-- =============================================================

ALTER TABLE public.institution_settings
  ADD COLUMN IF NOT EXISTS f2_dias_por_encontro integer;

COMMENT ON COLUMN public.institution_settings.f2_dias_por_encontro IS
  'Cadência-base (dias entre encontros) para projetar o calendário previsto do F2. Nullable = sem projeção. Cálculo do calendário é v2.';

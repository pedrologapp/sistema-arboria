-- =============================================
-- Liberação das Missões do Capítulo POR TURMA
-- O professor responsável (mentor) clica "Liberar missões do capítulo" na turma;
-- isso marca a liberação e define o prazo = liberação + 7 dias.
-- O aluno só vê a missão do capítulo se a TURMA dele estiver liberada, e o prazo
-- exibido/cobrado é o missoes_data_prazo (não o data_prazo placeholder da missão).
-- Idempotente.
-- =============================================

ALTER TABLE public.capitulo_turma_config
  ADD COLUMN IF NOT EXISTS missoes_liberadas_em  timestamptz,
  ADD COLUMN IF NOT EXISTS missoes_data_prazo    timestamptz,
  ADD COLUMN IF NOT EXISTS missoes_liberadas_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.capitulo_turma_config.missoes_liberadas_em IS
  'Quando o professor liberou as Missões do Capítulo para esta turma. NULL = não liberadas (aluno não vê).';
COMMENT ON COLUMN public.capitulo_turma_config.missoes_data_prazo IS
  'Prazo de entrega das Missões do Capítulo desta turma (= missoes_liberadas_em + 7 dias).';
COMMENT ON COLUMN public.capitulo_turma_config.missoes_liberadas_por IS
  'Professor que liberou as Missões do Capítulo desta turma.';

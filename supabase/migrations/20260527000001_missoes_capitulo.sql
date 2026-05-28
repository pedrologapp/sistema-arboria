-- =============================================
-- Missões do Capítulo (ex: Grande Assembleia)
-- Uma missão pode ser amarrada a um CAPÍTULO e, opcionalmente, a um PAPEL.
--   capitulo_id preenchido  => é "Missão do Capítulo" (fora do tempo das fases)
--   papel_id preenchido     => só para quem ocupa esse papel (POR CARGO)
--   papel_id nulo           => vale para todos os participantes do capítulo (GERAL)
-- Idempotente. Aditivo e seguro (colunas nulas, não quebra nada existente).
--
-- Visibilidade: a RLS de SELECT de `missoes` já é institucional (todo aluno da
-- instituição lê qualquer missão); o filtro "só o cargo dele vê a do cargo" é
-- feito na CONSULTA da tela do aluno — mesma postura das missões de fase/casa.
-- =============================================

ALTER TABLE public.missoes
  ADD COLUMN IF NOT EXISTS capitulo_id uuid REFERENCES public.capitulos(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS papel_id    uuid REFERENCES public.capitulo_papeis(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS para_membros_delegacao boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.missoes.capitulo_id IS
  'Se preenchido, é uma Missão do Capítulo (aparece na seção "Missão do Capítulo", fora do tempo das fases).';
COMMENT ON COLUMN public.missoes.papel_id IS
  'Missão do Capítulo POR CARGO: só para quem ocupa este papel (Mesa/Mediador/Observatório, via capitulo_alocacoes).';
COMMENT ON COLUMN public.missoes.para_membros_delegacao IS
  'Missão do Capítulo para TODOS os membros de delegação (via capitulo_delegacao_membros), independente do papel interno. Genérica de delegação.';

CREATE INDEX IF NOT EXISTS idx_missoes_capitulo ON public.missoes(capitulo_id) WHERE capitulo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_missoes_papel    ON public.missoes(papel_id)    WHERE papel_id IS NOT NULL;

-- ============================================================
-- Pedido do Fundador (04/08/2026): prazo de TODAS as missões, de TODAS as
-- séries, até 06/08/2026 (23:59:59 de Brasília = 2026-08-07 02:59:59+00).
--
-- Precisa mexer em DOIS lugares, senão o prazo fica incoerente:
--  (a) missoes.data_prazo — usado pelas missões de Casa e pela tela de detalhe
--      da missão (é ele que decide se a entrega conta como no prazo);
--  (b) capitulo_turma_config.missoes_data_prazo — o prazo por turma das missões
--      de capítulo, que é o que a lista de missões do aluno mostra.
--      Estava em 03/08 nas 6 turmas: tinha VENCIDO.
--
-- Backup do estado anterior nas tabelas _bkp_* abaixo (reversível).
-- ============================================================

CREATE TABLE IF NOT EXISTS public._bkp_prazo_missoes_20260804 AS
SELECT id, data_prazo FROM public.missoes;

CREATE TABLE IF NOT EXISTS public._bkp_prazo_capitulo_turma_20260804 AS
SELECT id, missoes_data_prazo FROM public.capitulo_turma_config;

UPDATE public.missoes
SET data_prazo = '2026-08-07 02:59:59+00'::timestamptz,
    updated_at = now();

UPDATE public.capitulo_turma_config
SET missoes_data_prazo = '2026-08-07 02:59:59+00'::timestamptz,
    updated_at = now()
WHERE missoes_liberadas_em IS NOT NULL;

-- Reversão, se precisar:
--   UPDATE public.missoes m SET data_prazo = b.data_prazo
--     FROM public._bkp_prazo_missoes_20260804 b WHERE b.id = m.id;
--   UPDATE public.capitulo_turma_config c SET missoes_data_prazo = b.missoes_data_prazo
--     FROM public._bkp_prazo_capitulo_turma_20260804 b WHERE b.id = c.id;

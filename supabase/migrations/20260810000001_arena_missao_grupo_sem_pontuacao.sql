-- ============================================================
-- ARENA: a missão de GRUPO não avalia, apenas recebe. (Ordem do Fundador, 10/08/2026)
--
-- O QUE ACONTECEU. A missão coletiva "Apresentem seu projeto" estava configurada
-- com pontos_base = 100. Em 08/08 doze entregas coletivas foram aprovadas, e o
-- trigger processar_entrega_aprovada fez duas coisas em cada uma:
--   (a) lançou pontos em pontos_gerais para o aluno_id da entrega;
--   (b) inseriu uma linha em inteligencia_evidencias para esse mesmo aluno.
--
-- POR QUE ISSO É ERRADO. A entrega coletiva é UMA linha, com o aluno_id de quem
-- apertou enviar. Então:
--   - 590 pontos foram para 11 alunos; os colegas de time receberam zero pelo
--     mesmo trabalho, e o ranking de 7 Casas se moveu por sorteio de clique.
--   - pior: 12 EVIDÊNCIAS DE INTELIGÊNCIA foram criadas a partir de um texto
--     COLETIVO e grudadas em uma criança só. Um grupo não tem mecanismo. Isso
--     contraria o princípio de que execução não é processamento e alimentaria o
--     perfil da criança com evidência que não é dela.
--
-- O QUE ESTA MIGRAÇÃO FAZ. Zera a pontuação e a evidência da missão coletiva,
-- devolve as entregas ao estado "recebida" e tira o valor em pontos da missão,
-- para que aprovar de novo não conceda nada. A missão INDIVIDUAL não é tocada:
-- ali a entrega é de uma criança só e o ponto é justo por construção.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0. Alvo: as missões coletivas do capítulo Arena Arboria.
-- ------------------------------------------------------------
CREATE TEMP TABLE _alvo_missoes ON COMMIT DROP AS
SELECT m.id
FROM public.missoes m
JOIN public.capitulos c ON c.id = m.capitulo_id AND c.nome = 'Arena Arboria'
WHERE m.entrega_coletiva;

CREATE TEMP TABLE _alvo_entregas ON COMMIT DROP AS
SELECT e.id FROM public.entregas e WHERE e.missao_id IN (SELECT id FROM _alvo_missoes);

-- ------------------------------------------------------------
-- 1. Backup do que será apagado/alterado (permite reverter).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public._bkp_20260810_pontos_gerais_arena AS
SELECT * FROM public.pontos_gerais WHERE missao_id IN (SELECT id FROM _alvo_missoes);

CREATE TABLE IF NOT EXISTS public._bkp_20260810_evidencias_arena AS
SELECT * FROM public.inteligencia_evidencias WHERE entrega_id IN (SELECT id FROM _alvo_entregas);

CREATE TABLE IF NOT EXISTS public._bkp_20260810_entregas_arena AS
SELECT id, status, nota, pontos_concedidos, avaliado_por, data_avaliacao, feedback_professor
FROM public.entregas WHERE id IN (SELECT id FROM _alvo_entregas);

-- ------------------------------------------------------------
-- 2. Apaga a evidência de inteligência gerada por entrega COLETIVA.
--    (a razão mais forte desta migração)
-- ------------------------------------------------------------
DELETE FROM public.inteligencia_evidencias
WHERE entrega_id IN (SELECT id FROM _alvo_entregas);

-- ------------------------------------------------------------
-- 3. Apaga os pontos lançados pela missão coletiva.
-- ------------------------------------------------------------
DELETE FROM public.pontos_gerais
WHERE missao_id IN (SELECT id FROM _alvo_missoes);

-- ------------------------------------------------------------
-- 4. Devolve as entregas ao estado de recebida, sem nota e sem pontos.
--    Quem estava em 'refazer' ou 'pendente' não é tocado no status.
-- ------------------------------------------------------------
UPDATE public.entregas e
SET status = CASE WHEN e.status = 'aprovada' THEN 'pendente' ELSE e.status END,
    nota = NULL,
    pontos_concedidos = NULL,
    avaliado_por = NULL,
    data_avaliacao = NULL
WHERE e.id IN (SELECT id FROM _alvo_entregas);

-- ------------------------------------------------------------
-- 5. A missão coletiva deixa de valer pontos.
--    Se alguém aprovar no futuro, o trigger calcula ROUND(nota/10 * 0) = 0.
-- ------------------------------------------------------------
UPDATE public.missoes
SET pontos_base = 0
WHERE id IN (SELECT id FROM _alvo_missoes);

COMMIT;

-- ============================================================
-- Ordem do Fundador (05/08/2026): duas turmas do Infantil viraram de fase sem
-- querer. Voltar todas para a fase LINGUÍSTICA (posição 1 da trilha).
--
--   Grupo IV A   virou em 31/07 10:45, estava na posição 2 de 8
--   Maternal 3 A virou em 30/07 10:41, estava na posição 2 de 4
--
-- Nenhuma observação é tocada: no Infantil a virada só mexe na posição da
-- trilha e grava o evento. A criação de observações e as notificações da
-- virada são exclusivas do Fundamental 2.
--
-- O estado anterior fica em _bkp_trilha_infantil_20260805 e a reversão é
-- registrada em turma_fase_evento como 'reverteu', para não repetir o buraco
-- de rastro do Maternal 3 A (que já tinha sido revertido na mão, sem registro).
-- ============================================================

CREATE TABLE IF NOT EXISTS public._bkp_trilha_infantil_20260805 AS
SELECT tt.*, now() AS salvo_em
FROM public.turma_trilha tt
JOIN public.turmas t ON t.id = tt.turma_id
WHERE t.segmento = 'infantil' AND tt.ano_letivo = 2026;

-- Registra a reversão ANTES de mexer, usando a posição que está sendo desfeita.
INSERT INTO public.turma_fase_evento
  (institution_id, turma_id, ano_letivo, ordem, fase_id, evento, professor_id, ocorrido_em)
SELECT t.institution_id, t.id, 2026, tt.ordem_atual,
       (SELECT f.id FROM public.fases f
         WHERE f.institution_id = t.institution_id AND f.segmento = 'infantil'
           AND f.ano_letivo = 2026
           AND f.inteligencia_id = public.intel_da_posicao(t.id, 2026::smallint, tt.ordem_atual)
         LIMIT 1),
       'reverteu',
       '7471ae85-6f72-4810-bb57-c59600de47db',  -- Fundador, que ordenou a correção
       now()
FROM public.turma_trilha tt
JOIN public.turmas t ON t.id = tt.turma_id
WHERE t.segmento = 'infantil' AND tt.ano_letivo = 2026 AND tt.ordem_atual > 1;

-- Volta para a Linguística, devolvendo a data em que a fase 1 começou de fato.
UPDATE public.turma_trilha tt
SET ordem_atual = 1,
    iniciada_em = COALESCE(
      (SELECT max(fe.ocorrido_em) FROM public.turma_fase_evento fe
        WHERE fe.turma_id = tt.turma_id AND fe.evento = 'iniciou' AND fe.ordem = 1),
      tt.iniciada_em),
    updated_at = now()
FROM public.turmas t
WHERE t.id = tt.turma_id
  AND t.segmento = 'infantil'
  AND tt.ano_letivo = 2026
  AND tt.ordem_atual > 1;

-- Reversão, se precisar:
--   UPDATE public.turma_trilha tt SET ordem_atual = b.ordem_atual, iniciada_em = b.iniciada_em
--     FROM public._bkp_trilha_infantil_20260805 b WHERE b.id = tt.id;

-- ============================================================
-- Missões coletivas (entrega do GRUPO) — base das missões da Arena. Pedido do
-- Fundador 29/07. A missão GERAL da Arena é entregue UMA vez pelo grupo (um
-- integrante envia, vale pra todos). A INDIVIDUAL segue o modelo atual (1 por aluno).
--
-- NÃO reutiliza tipo_missao (que já significa geral/individual de ESCOPO DE CASA).
-- entrega_coletiva liga a trava de grupo na UI; grupo_ref amarra a entrega ao
-- grupo (tema+numero) do aluno que enviou, puxado de capitulo_alocacoes.
-- ============================================================
ALTER TABLE public.missoes
  ADD COLUMN IF NOT EXISTS entrega_coletiva boolean NOT NULL DEFAULT false;

ALTER TABLE public.entregas
  ADD COLUMN IF NOT EXISTS grupo_ref text;

-- Uma entrega por grupo por missão (barra a corrida de dois cliques simultâneos).
CREATE UNIQUE INDEX IF NOT EXISTS entregas_missao_grupo_uniq
  ON public.entregas (missao_id, grupo_ref)
  WHERE grupo_ref IS NOT NULL;

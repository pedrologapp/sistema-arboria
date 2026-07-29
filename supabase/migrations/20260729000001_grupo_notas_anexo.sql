-- ============================================================
-- capitulo_grupo_notas.anexo_url: foto da nota do GRUPO (ex: a maquete/projeto).
-- Antes so a nota de aluno aceitava foto; a nota do grupo passa a aceitar tambem,
-- pra registrar o TRABALHO do grupo (nao a crianca). Pedido do Fundador 29/07.
-- ============================================================
ALTER TABLE public.capitulo_grupo_notas
  ADD COLUMN IF NOT EXISTS anexo_url text;

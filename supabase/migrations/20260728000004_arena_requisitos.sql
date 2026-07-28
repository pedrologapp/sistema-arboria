-- ============================================================
-- capitulo_arena_projeto.requisitos: os 4 requisitos do projeto da Arena, avaliados
-- pelo mentor no "Observar" do grupo. Avalia o PROJETO (nao a crianca), por isso
-- fica aqui e NAO em observacoes (que vai pro diario/mecanismo). Pedido do Fundador 28/07.
--
-- Formato jsonb: { "resolve": {"ok": bool, "nota": text}, "funciona": {...},
--                  "usa": {...}, "quebra": {...} }
--   resolve  = O que resolve?
--   funciona = Como funciona?
--   usa      = O que usa?
--   quebra   = Onde pode quebrar?
-- ============================================================
ALTER TABLE public.capitulo_arena_projeto
  ADD COLUMN IF NOT EXISTS requisitos jsonb;

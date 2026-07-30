-- Marca as missoes que usam o layout "Palco" (visual novo do mockup da Arena).
-- Pedido do Fundador 30/07. Ligada nas 2 missoes da Arena.
ALTER TABLE public.missoes ADD COLUMN IF NOT EXISTS layout_palco boolean NOT NULL DEFAULT false;
UPDATE public.missoes SET layout_palco = true WHERE capitulo_id = '8338b36f-5c3c-48b4-84ad-8ee4773f3e4a';

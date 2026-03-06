
-- Add new columns to missoes table
ALTER TABLE public.missoes ADD COLUMN IF NOT EXISTS lente_especial text;
ALTER TABLE public.missoes ADD COLUMN IF NOT EXISTS itens jsonb;

-- Add new columns to entregas table
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS respostas_itens jsonb;
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS reflexao_resposta text;

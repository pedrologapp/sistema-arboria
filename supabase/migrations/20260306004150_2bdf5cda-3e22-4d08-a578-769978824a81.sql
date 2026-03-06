
ALTER TABLE public.canais_casa DROP CONSTRAINT canais_casa_tipo_check;
ALTER TABLE public.canais_casa ADD CONSTRAINT canais_casa_tipo_check 
  CHECK (tipo = ANY (ARRAY['texto', 'avisos', 'regras', 'conselho_lideres', 'lideranca_casa']));

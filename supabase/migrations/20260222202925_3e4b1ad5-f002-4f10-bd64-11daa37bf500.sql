ALTER TABLE public.fase_conteudos DROP CONSTRAINT fase_conteudos_semana_check;
ALTER TABLE public.fase_conteudos ADD CONSTRAINT fase_conteudos_semana_check CHECK (semana >= 0 AND semana <= 4);
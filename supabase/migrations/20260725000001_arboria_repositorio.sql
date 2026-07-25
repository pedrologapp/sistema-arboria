-- ============================================================
-- Repositório do dono (/arboria): abas por inteligência (+ abas custom) onde o
-- Fundador guarda IDEIAS e ARQUIVOS. Pedido 25/07. So super_admin.
--   arboria_espacos  = as abas (8 inteligencias semeadas + custom).
--   arboria_repo_itens = os itens de cada aba (ideia de texto OU arquivo).
--   bucket 'arboria-repositorio' = os arquivos (privado, so super_admin).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.arboria_espacos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text NOT NULL,
  cor             text,
  inteligencia_id smallint,            -- preenchido nas 8 seeds; NULL nas custom
  ordem           int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.arboria_repo_itens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  espaco_id    uuid NOT NULL REFERENCES public.arboria_espacos(id) ON DELETE CASCADE,
  tipo         text NOT NULL CHECK (tipo IN ('ideia','arquivo')),
  texto        text,          -- ideia
  arquivo_nome text,          -- arquivo: nome original
  arquivo_path text,          -- arquivo: caminho no storage
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_repo_itens_espaco ON public.arboria_repo_itens(espaco_id, created_at DESC);

ALTER TABLE public.arboria_espacos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arboria_repo_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS arboria_espacos_super ON public.arboria_espacos;
CREATE POLICY arboria_espacos_super ON public.arboria_espacos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS arboria_repo_itens_super ON public.arboria_repo_itens;
CREATE POLICY arboria_repo_itens_super ON public.arboria_repo_itens
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Semeia as 8 inteligencias como abas (uma vez).
INSERT INTO public.arboria_espacos (nome, cor, inteligencia_id, ordem)
SELECT * FROM (VALUES
  ('Linguística',          '#1E3A8A', 1::smallint, 1),
  ('Lógico-Matemática',    '#047857', 2::smallint, 2),
  ('Espacial',             '#7C3AED', 3::smallint, 3),
  ('Musical',              '#7F1D1D', 4::smallint, 4),
  ('Corporal-Cinestésica', '#B8860B', 5::smallint, 5),
  ('Naturalista',          '#78350F', 6::smallint, 6),
  ('Interpessoal',         '#0891B2', 7::smallint, 7),
  ('Intrapessoal',         '#EA580C', 8::smallint, 8)
) AS v(nome, cor, inteligencia_id, ordem)
WHERE NOT EXISTS (SELECT 1 FROM public.arboria_espacos);

-- Bucket privado dos arquivos do repositorio (so super_admin le/escreve/apaga).
INSERT INTO storage.buckets (id, name, public)
VALUES ('arboria-repositorio', 'arboria-repositorio', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS arboria_repo_read ON storage.objects;
CREATE POLICY arboria_repo_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'arboria-repositorio' AND public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS arboria_repo_write ON storage.objects;
CREATE POLICY arboria_repo_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'arboria-repositorio' AND public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS arboria_repo_delete ON storage.objects;
CREATE POLICY arboria_repo_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'arboria-repositorio' AND public.has_role(auth.uid(), 'super_admin'));

-- Tabela para armazenar conteúdos/PDFs das fases
CREATE TABLE IF NOT EXISTS public.fase_conteudos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  fase_id uuid NOT NULL REFERENCES fases(id) ON DELETE CASCADE,
  semana smallint NOT NULL CHECK (semana >= 1 AND semana <= 4),
  titulo text,
  descricao text,
  arquivo_nome text NOT NULL,
  arquivo_url text NOT NULL,
  arquivo_tamanho bigint,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(fase_id, semana)
);

-- Enable RLS
ALTER TABLE public.fase_conteudos ENABLE ROW LEVEL SECURITY;

-- Política: Admin pode gerenciar conteúdos da sua instituição
CREATE POLICY "Admin pode gerenciar conteúdos"
ON public.fase_conteudos FOR ALL
USING (
  institution_id = public.get_user_institution_id() 
  AND public.has_role(auth.uid(), 'admin')
);

-- Política: Professor pode ver conteúdos da sua instituição
CREATE POLICY "Professor pode ver conteúdos"
ON public.fase_conteudos FOR SELECT
USING (
  institution_id = public.get_user_institution_id() 
  AND public.has_role(auth.uid(), 'professor')
);

-- Criar bucket público para PDFs de fase
INSERT INTO storage.buckets (id, name, public)
VALUES ('fase-conteudos', 'fase-conteudos', true)
ON CONFLICT DO NOTHING;

-- Política: Leitura pública dos PDFs
CREATE POLICY "Acesso público aos PDFs de fase"
ON storage.objects FOR SELECT
USING (bucket_id = 'fase-conteudos');

-- Política: Upload por usuários autenticados
CREATE POLICY "Upload de PDFs por autenticados"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'fase-conteudos' AND auth.role() = 'authenticated');

-- Política: Update por usuários autenticados
CREATE POLICY "Update de PDFs por autenticados"
ON storage.objects FOR UPDATE
USING (bucket_id = 'fase-conteudos' AND auth.role() = 'authenticated');

-- Política: Delete por usuários autenticados
CREATE POLICY "Delete de PDFs por autenticados"
ON storage.objects FOR DELETE
USING (bucket_id = 'fase-conteudos' AND auth.role() = 'authenticated');
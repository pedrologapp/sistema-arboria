-- Criar tabela para conteúdos por inteligência/série/semana
CREATE TABLE public.conteudo_inteligencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  inteligencia_id smallint NOT NULL REFERENCES inteligencias(id) ON DELETE CASCADE,
  serie smallint NOT NULL CHECK (serie >= 1 AND serie <= 9),
  semana smallint NOT NULL CHECK (semana >= 1 AND semana <= 4),
  titulo text,
  descricao text,
  arquivo_nome text NOT NULL,
  arquivo_url text NOT NULL,
  arquivo_tamanho bigint,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(institution_id, inteligencia_id, serie, semana)
);

-- Índices para performance
CREATE INDEX idx_conteudo_inteligencia_institution ON public.conteudo_inteligencia(institution_id);
CREATE INDEX idx_conteudo_inteligencia_lookup ON public.conteudo_inteligencia(institution_id, inteligencia_id, serie);

-- Enable RLS
ALTER TABLE public.conteudo_inteligencia ENABLE ROW LEVEL SECURITY;

-- Admin pode gerenciar (ALL = SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admin pode gerenciar conteudo_inteligencia"
ON public.conteudo_inteligencia FOR ALL
USING (
  institution_id = public.get_user_institution_id() 
  AND public.has_role(auth.uid(), 'admin')
);

-- Professor pode ver
CREATE POLICY "Professor pode ver conteudo_inteligencia"
ON public.conteudo_inteligencia FOR SELECT
USING (
  institution_id = public.get_user_institution_id() 
  AND public.has_role(auth.uid(), 'professor')
);

-- Trigger para updated_at
CREATE TRIGGER update_conteudo_inteligencia_updated_at
BEFORE UPDATE ON public.conteudo_inteligencia
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket para os arquivos
INSERT INTO storage.buckets (id, name, public)
VALUES ('inteligencia-conteudos', 'inteligencia-conteudos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
CREATE POLICY "Arquivos de conteúdo são públicos para leitura"
ON storage.objects FOR SELECT
USING (bucket_id = 'inteligencia-conteudos');

CREATE POLICY "Admin pode fazer upload de conteúdo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'inteligencia-conteudos' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admin pode deletar conteúdo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'inteligencia-conteudos' 
  AND public.has_role(auth.uid(), 'admin')
);
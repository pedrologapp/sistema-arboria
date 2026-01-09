-- Tabela para rastrear última leitura de cada usuário em cada canal
CREATE TABLE public.canal_leituras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canal_id uuid NOT NULL REFERENCES public.canais_casa(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ultima_leitura timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(canal_id, usuario_id)
);

-- Índices para performance
CREATE INDEX idx_canal_leituras_canal ON public.canal_leituras(canal_id);
CREATE INDEX idx_canal_leituras_usuario ON public.canal_leituras(usuario_id);

-- RLS
ALTER TABLE public.canal_leituras ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver suas próprias leituras
CREATE POLICY "Usuários podem ver suas próprias leituras"
ON public.canal_leituras FOR SELECT
USING (auth.uid() = usuario_id);

-- Usuários podem inserir suas próprias leituras
CREATE POLICY "Usuários podem inserir suas próprias leituras"
ON public.canal_leituras FOR INSERT
WITH CHECK (auth.uid() = usuario_id);

-- Usuários podem atualizar suas próprias leituras
CREATE POLICY "Usuários podem atualizar suas próprias leituras"
ON public.canal_leituras FOR UPDATE
USING (auth.uid() = usuario_id);
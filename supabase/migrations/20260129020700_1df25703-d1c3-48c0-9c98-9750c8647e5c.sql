-- Adicionar colunas para importação rápida (sem Auth)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_gerado TEXT,
ADD COLUMN IF NOT EXISTS conta_criada BOOLEAN DEFAULT false;

-- Índice para busca rápida por email_gerado
CREATE INDEX IF NOT EXISTS idx_profiles_email_gerado ON public.profiles(email_gerado);

-- Índice para encontrar alunos sem conta
CREATE INDEX IF NOT EXISTS idx_profiles_conta_criada ON public.profiles(conta_criada) WHERE conta_criada = false;
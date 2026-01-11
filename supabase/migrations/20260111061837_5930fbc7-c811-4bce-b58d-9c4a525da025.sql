-- =====================================================
-- PARTE 1: Adicionar colunas na tabela arquetipos
-- =====================================================

ALTER TABLE public.arquetipos 
ADD COLUMN IF NOT EXISTS sugestao_conversa TEXT,
ADD COLUMN IF NOT EXISTS frases_evitar TEXT[],
ADD COLUMN IF NOT EXISTS frases_preferir TEXT[];

-- =====================================================
-- PARTE 2: Criar tabela acoes_celebracao
-- =====================================================

CREATE TABLE public.acoes_celebracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) NOT NULL,
  aluno_id UUID REFERENCES profiles(id) NOT NULL,
  professor_id UUID REFERENCES profiles(id) NOT NULL,
  alerta_id UUID REFERENCES alertas_alunos(id),
  tipo_acao TEXT NOT NULL CHECK (tipo_acao IN (
    'conversei_descoberta', 
    'propus_desafio', 
    'papel_mentor', 
    'ainda_nao_conversei'
  )),
  reacao_aluno TEXT CHECK (reacao_aluno IN (
    'animado', 
    'receptivo', 
    'indiferente', 
    'desconfortavel'
  )),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PARTE 3: Enable RLS and create policies
-- =====================================================

ALTER TABLE public.acoes_celebracao ENABLE ROW LEVEL SECURITY;

-- Professores podem inserir suas próprias ações
CREATE POLICY "Professores podem inserir ações de celebração"
ON public.acoes_celebracao
FOR INSERT
WITH CHECK (professor_id = auth.uid());

-- Professores podem ver suas próprias ações
CREATE POLICY "Professores podem ver suas ações de celebração"
ON public.acoes_celebracao
FOR SELECT
USING (professor_id = auth.uid());

-- Professores podem atualizar suas próprias ações
CREATE POLICY "Professores podem atualizar suas ações de celebração"
ON public.acoes_celebracao
FOR UPDATE
USING (professor_id = auth.uid());

-- =====================================================
-- PARTE 4: Adicionar índices para performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_acoes_celebracao_aluno ON public.acoes_celebracao(aluno_id);
CREATE INDEX IF NOT EXISTS idx_acoes_celebracao_professor ON public.acoes_celebracao(professor_id);
CREATE INDEX IF NOT EXISTS idx_acoes_celebracao_alerta ON public.acoes_celebracao(alerta_id);
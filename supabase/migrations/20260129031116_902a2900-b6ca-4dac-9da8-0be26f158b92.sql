-- Criar tabela professor_turma para vínculo de professores Infantil/F1 com turmas
CREATE TABLE public.professor_turma (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  ano_letivo SMALLINT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT,
  eh_regente BOOLEAN DEFAULT true,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(professor_id, turma_id, ano_letivo)
);

-- Habilitar RLS
ALTER TABLE public.professor_turma ENABLE ROW LEVEL SECURITY;

-- Policy: Professor vê seus próprios vínculos
CREATE POLICY "Professor vê suas turmas"
  ON public.professor_turma 
  FOR SELECT
  USING (professor_id = auth.uid());

-- Policy: Admin pode gerenciar todos os vínculos
CREATE POLICY "Admin gerencia vínculos professor_turma"
  ON public.professor_turma 
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND institution_id = get_user_institution_id()
  );

-- Função helper para evitar recursão em RLS
CREATE OR REPLACE FUNCTION public.get_professor_turma_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(ARRAY_AGG(turma_id), ARRAY[]::UUID[])
  FROM public.professor_turma 
  WHERE professor_id = auth.uid() AND ativo = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Índices para performance
CREATE INDEX idx_professor_turma_professor ON public.professor_turma(professor_id);
CREATE INDEX idx_professor_turma_turma ON public.professor_turma(turma_id);
CREATE INDEX idx_professor_turma_institution ON public.professor_turma(institution_id);
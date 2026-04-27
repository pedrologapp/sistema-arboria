-- =============================================
-- TABELA: missao_visualizacoes
-- Registra quais alunos abriram qual missão (1 linha por aluno+missão)
-- Idempotente: pode rodar várias vezes sem efeitos colaterais
-- =============================================

CREATE TABLE IF NOT EXISTS public.missao_visualizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  missao_id uuid NOT NULL REFERENCES public.missoes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT missao_visualizacoes_aluno_missao_unique UNIQUE (aluno_id, missao_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_missao_visualizacoes_aluno
  ON public.missao_visualizacoes(aluno_id);

CREATE INDEX IF NOT EXISTS idx_missao_visualizacoes_missao
  ON public.missao_visualizacoes(missao_id);

-- Trigger updated_at (reusa função padrão do projeto)
DROP TRIGGER IF EXISTS update_missao_visualizacoes_updated_at ON public.missao_visualizacoes;
CREATE TRIGGER update_missao_visualizacoes_updated_at
  BEFORE UPDATE ON public.missao_visualizacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS
-- =============================================
ALTER TABLE public.missao_visualizacoes ENABLE ROW LEVEL SECURITY;

-- Aluno pode registrar/atualizar a própria visualização
DROP POLICY IF EXISTS "Aluno pode registrar própria visualização" ON public.missao_visualizacoes;
CREATE POLICY "Aluno pode registrar própria visualização"
ON public.missao_visualizacoes FOR INSERT
WITH CHECK (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Aluno pode atualizar própria visualização" ON public.missao_visualizacoes;
CREATE POLICY "Aluno pode atualizar própria visualização"
ON public.missao_visualizacoes FOR UPDATE
USING (aluno_id = auth.uid());

-- Aluno vê a própria visualização
DROP POLICY IF EXISTS "Aluno vê própria visualização" ON public.missao_visualizacoes;
CREATE POLICY "Aluno vê própria visualização"
ON public.missao_visualizacoes FOR SELECT
USING (aluno_id = auth.uid());

-- Professor vê visualizações dos alunos da sua casa
DROP POLICY IF EXISTS "Professor vê visualizações da sua casa" ON public.missao_visualizacoes;
CREATE POLICY "Professor vê visualizações da sua casa"
ON public.missao_visualizacoes FOR SELECT
USING (
  has_role(auth.uid(), 'professor')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.professor_casa pc
      ON pc.professor_id = auth.uid()
     AND pc.casa_id = p.casa_id
     AND pc.ativo = true
    WHERE p.id = aluno_id
  )
);

-- Admin vê todas as visualizações da instituição
DROP POLICY IF EXISTS "Admin vê visualizações da instituição" ON public.missao_visualizacoes;
CREATE POLICY "Admin vê visualizações da instituição"
ON public.missao_visualizacoes FOR SELECT
USING (
  has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM public.missoes m
    WHERE m.id = missao_id
      AND m.institution_id = get_user_institution_id()
  )
);

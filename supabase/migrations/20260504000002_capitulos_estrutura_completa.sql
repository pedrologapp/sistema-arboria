-- =============================================
-- "O CAPÍTULO" — estrutura completa pra Grande Assembleia
-- Idempotente
-- =============================================

-- ---------------------------------------------
-- 1. capitulos: novos campos
-- ---------------------------------------------
ALTER TABLE public.capitulos
  ADD COLUMN IF NOT EXISTS tema_curto text,
  ADD COLUMN IF NOT EXISTS briefing_chamada text,
  ADD COLUMN IF NOT EXISTS briefing_o_que_aconteceu jsonb,
  ADD COLUMN IF NOT EXISTS briefing_porque_importa jsonb,
  ADD COLUMN IF NOT EXISTS regra_de_ouro text,
  ADD COLUMN IF NOT EXISTS fases_assembleia jsonb;

-- data_evento sai daqui (vai pra capitulo_turma_config)
ALTER TABLE public.capitulos
  DROP COLUMN IF EXISTS data_evento;

-- ---------------------------------------------
-- 2. capitulo_papeis: trocar roteiro_completo por 3 campos estruturados
-- ---------------------------------------------
ALTER TABLE public.capitulo_papeis
  ADD COLUMN IF NOT EXISTS roteiro_papel text,
  ADD COLUMN IF NOT EXISTS roteiro_como_fazer jsonb,
  ADD COLUMN IF NOT EXISTS roteiro_exemplos jsonb,
  ADD COLUMN IF NOT EXISTS time_label text;

ALTER TABLE public.capitulo_papeis
  DROP COLUMN IF EXISTS roteiro_completo;

-- ---------------------------------------------
-- 3. capitulo_delegacoes: as 6 delegações disponíveis
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.capitulo_delegacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capitulo_id uuid NOT NULL REFERENCES public.capitulos(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome text NOT NULL,
  quem_sao text,
  objetivo text,
  nao_cedem text,
  topam_negociar text,
  ordem smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT capitulo_delegacoes_codigo_unique UNIQUE (capitulo_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_capitulo_delegacoes_capitulo
  ON public.capitulo_delegacoes(capitulo_id);

DROP TRIGGER IF EXISTS update_capitulo_delegacoes_updated_at ON public.capitulo_delegacoes;
CREATE TRIGGER update_capitulo_delegacoes_updated_at
  BEFORE UPDATE ON public.capitulo_delegacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------
-- 4. capitulo_turma_config: data + delegações ativas POR TURMA
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.capitulo_turma_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capitulo_id uuid NOT NULL REFERENCES public.capitulos(id) ON DELETE CASCADE,
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  data_evento date,
  delegacoes_ativas jsonb NOT NULL DEFAULT '[]'::jsonb,
  configurado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT capitulo_turma_config_unique UNIQUE (capitulo_id, turma_id)
);

CREATE INDEX IF NOT EXISTS idx_capitulo_turma_config_capitulo
  ON public.capitulo_turma_config(capitulo_id);
CREATE INDEX IF NOT EXISTS idx_capitulo_turma_config_turma
  ON public.capitulo_turma_config(turma_id);

DROP TRIGGER IF EXISTS update_capitulo_turma_config_updated_at ON public.capitulo_turma_config;
CREATE TRIGGER update_capitulo_turma_config_updated_at
  BEFORE UPDATE ON public.capitulo_turma_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS
-- =============================================
ALTER TABLE public.capitulo_delegacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capitulo_turma_config ENABLE ROW LEVEL SECURITY;

-- ---------- capitulo_delegacoes ----------
DROP POLICY IF EXISTS "Todos veem delegações da instituição" ON public.capitulo_delegacoes;
CREATE POLICY "Todos veem delegações da instituição"
ON public.capitulo_delegacoes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.capitulos c
    WHERE c.id = capitulo_id
      AND c.institution_id = get_user_institution_id()
  )
);

DROP POLICY IF EXISTS "Admin gerencia delegações" ON public.capitulo_delegacoes;
CREATE POLICY "Admin gerencia delegações"
ON public.capitulo_delegacoes FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM public.capitulos c
    WHERE c.id = capitulo_id
      AND c.institution_id = get_user_institution_id()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM public.capitulos c
    WHERE c.id = capitulo_id
      AND c.institution_id = get_user_institution_id()
  )
);

-- ---------- capitulo_turma_config ----------
DROP POLICY IF EXISTS "Aluno vê config da própria turma" ON public.capitulo_turma_config;
CREATE POLICY "Aluno vê config da própria turma"
ON public.capitulo_turma_config FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.aluno_turma at
    WHERE at.aluno_id = auth.uid()
      AND at.turma_id = capitulo_turma_config.turma_id
      AND at.ativo = true
  )
);

DROP POLICY IF EXISTS "Professor vê config das turmas dele" ON public.capitulo_turma_config;
CREATE POLICY "Professor vê config das turmas dele"
ON public.capitulo_turma_config FOR SELECT
USING (
  has_role(auth.uid(), 'professor')
  AND EXISTS (
    SELECT 1 FROM public.professor_turma pt
    WHERE pt.professor_id = auth.uid()
      AND pt.turma_id = capitulo_turma_config.turma_id
      AND pt.ativo = true
  )
);

DROP POLICY IF EXISTS "Professor cria config das turmas dele" ON public.capitulo_turma_config;
CREATE POLICY "Professor cria config das turmas dele"
ON public.capitulo_turma_config FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'professor')
  AND EXISTS (
    SELECT 1 FROM public.professor_turma pt
    WHERE pt.professor_id = auth.uid()
      AND pt.turma_id = capitulo_turma_config.turma_id
      AND pt.ativo = true
  )
);

DROP POLICY IF EXISTS "Professor atualiza config das turmas dele" ON public.capitulo_turma_config;
CREATE POLICY "Professor atualiza config das turmas dele"
ON public.capitulo_turma_config FOR UPDATE
USING (
  has_role(auth.uid(), 'professor')
  AND EXISTS (
    SELECT 1 FROM public.professor_turma pt
    WHERE pt.professor_id = auth.uid()
      AND pt.turma_id = capitulo_turma_config.turma_id
      AND pt.ativo = true
  )
);

DROP POLICY IF EXISTS "Admin gerencia config" ON public.capitulo_turma_config;
CREATE POLICY "Admin gerencia config"
ON public.capitulo_turma_config FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM public.capitulos c
    WHERE c.id = capitulo_id
      AND c.institution_id = get_user_institution_id()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM public.capitulos c
    WHERE c.id = capitulo_id
      AND c.institution_id = get_user_institution_id()
  )
);

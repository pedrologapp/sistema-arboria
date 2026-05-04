-- =============================================
-- "O CAPÍTULO" - Grande Projeto da fase
-- 3 tabelas: capitulos, capitulo_papeis, capitulo_alocacoes
-- Idempotente: pode rodar várias vezes
-- =============================================

-- ---------------------------------------------
-- 1. capitulos: 1 capítulo por fase (per institution)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.capitulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  fase_id uuid NOT NULL REFERENCES public.fases(id) ON DELETE CASCADE,
  numero smallint NOT NULL,
  nome text NOT NULL,
  frase_ancora text,
  descricao_convocacao text,
  imagem_url text,
  data_evento date,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT capitulos_institution_fase_unique UNIQUE (institution_id, fase_id)
);

CREATE INDEX IF NOT EXISTS idx_capitulos_institution_ativo
  ON public.capitulos(institution_id, ativo);
CREATE INDEX IF NOT EXISTS idx_capitulos_fase
  ON public.capitulos(fase_id);

DROP TRIGGER IF EXISTS update_capitulos_updated_at ON public.capitulos;
CREATE TRIGGER update_capitulos_updated_at
  BEFORE UPDATE ON public.capitulos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------
-- 2. capitulo_papeis: papéis fixos do capítulo
--    categoria: mesa | mediador | observatorio | delegacao
--    delegacao: nome da delegação (NULL para mesa/mediador/observatorio)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.capitulo_papeis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capitulo_id uuid NOT NULL REFERENCES public.capitulos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  categoria text NOT NULL CHECK (categoria IN ('mesa','mediador','observatorio','delegacao')),
  delegacao text,
  descricao_curta text,
  roteiro_completo text,
  vagas_por_turma smallint NOT NULL DEFAULT 1 CHECK (vagas_por_turma > 0),
  ordem smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT capitulo_papeis_delegacao_consistencia CHECK (
    (categoria = 'delegacao' AND delegacao IS NOT NULL)
    OR (categoria <> 'delegacao' AND delegacao IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_capitulo_papeis_capitulo
  ON public.capitulo_papeis(capitulo_id);
CREATE INDEX IF NOT EXISTS idx_capitulo_papeis_categoria
  ON public.capitulo_papeis(capitulo_id, categoria);

DROP TRIGGER IF EXISTS update_capitulo_papeis_updated_at ON public.capitulo_papeis;
CREATE TRIGGER update_capitulo_papeis_updated_at
  BEFORE UPDATE ON public.capitulo_papeis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------
-- 3. capitulo_alocacoes: aluno X papel X turma
--    (papel pode ter várias vagas; aluno pode ter vários papéis SE for na mesma delegação)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.capitulo_alocacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capitulo_id uuid NOT NULL REFERENCES public.capitulos(id) ON DELETE CASCADE,
  papel_id uuid NOT NULL REFERENCES public.capitulo_papeis(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  alocado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT capitulo_alocacoes_unica UNIQUE (capitulo_id, papel_id, aluno_id)
);

CREATE INDEX IF NOT EXISTS idx_capitulo_alocacoes_capitulo_turma
  ON public.capitulo_alocacoes(capitulo_id, turma_id);
CREATE INDEX IF NOT EXISTS idx_capitulo_alocacoes_aluno
  ON public.capitulo_alocacoes(aluno_id);
CREATE INDEX IF NOT EXISTS idx_capitulo_alocacoes_papel_turma
  ON public.capitulo_alocacoes(papel_id, turma_id);

DROP TRIGGER IF EXISTS update_capitulo_alocacoes_updated_at ON public.capitulo_alocacoes;
CREATE TRIGGER update_capitulo_alocacoes_updated_at
  BEFORE UPDATE ON public.capitulo_alocacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- VALIDAÇÃO: regra de "1 frente por aluno"
--   - Se aluno já tem alocação em papel não-delegação, bloqueia novo papel.
--   - Se aluno tem alocação em delegação X, só pode acumular papéis na MESMA delegação X.
--   - Limite de vagas_por_turma por (papel, turma).
-- =============================================
CREATE OR REPLACE FUNCTION public.validar_capitulo_alocacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_categoria text;
  v_delegacao text;
  v_vagas_por_turma smallint;
  v_outras_categoria text;
  v_outras_delegacao text;
  v_count_no_papel int;
BEGIN
  -- Carrega dados do papel novo
  SELECT categoria, delegacao, vagas_por_turma
    INTO v_categoria, v_delegacao, v_vagas_por_turma
  FROM public.capitulo_papeis
  WHERE id = NEW.papel_id;

  IF v_categoria IS NULL THEN
    RAISE EXCEPTION 'Papel % não encontrado', NEW.papel_id;
  END IF;

  -- Verifica vagas no papel para a turma
  SELECT count(*) INTO v_count_no_papel
  FROM public.capitulo_alocacoes ca
  WHERE ca.capitulo_id = NEW.capitulo_id
    AND ca.papel_id = NEW.papel_id
    AND ca.turma_id = NEW.turma_id
    AND ca.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_count_no_papel >= v_vagas_por_turma THEN
    RAISE EXCEPTION 'Papel % já está com todas as vagas preenchidas nesta turma (% de %)',
      NEW.papel_id, v_count_no_papel, v_vagas_por_turma;
  END IF;

  -- Verifica "frente" das outras alocações desse aluno no mesmo capítulo
  FOR v_outras_categoria, v_outras_delegacao IN
    SELECT cp.categoria, cp.delegacao
    FROM public.capitulo_alocacoes ca
    JOIN public.capitulo_papeis cp ON cp.id = ca.papel_id
    WHERE ca.capitulo_id = NEW.capitulo_id
      AND ca.aluno_id = NEW.aluno_id
      AND ca.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  LOOP
    -- Se o aluno já está em mesa/mediador/observatorio, NÃO pode acumular nada
    IF v_outras_categoria <> 'delegacao' THEN
      RAISE EXCEPTION 'Aluno já possui papel em "%" e não pode acumular outros papéis', v_outras_categoria;
    END IF;

    -- Se já está em delegação, novo só pode ser na MESMA delegação
    IF v_categoria <> 'delegacao' OR v_delegacao <> v_outras_delegacao THEN
      RAISE EXCEPTION 'Aluno já está na delegação "%" e só pode acumular papéis nessa mesma delegação', v_outras_delegacao;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_capitulo_alocacao ON public.capitulo_alocacoes;
CREATE TRIGGER trg_validar_capitulo_alocacao
  BEFORE INSERT OR UPDATE ON public.capitulo_alocacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_capitulo_alocacao();

-- =============================================
-- RLS
-- =============================================
ALTER TABLE public.capitulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capitulo_papeis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capitulo_alocacoes ENABLE ROW LEVEL SECURITY;

-- ---------- capitulos ----------
DROP POLICY IF EXISTS "Aluno vê capítulos da instituição" ON public.capitulos;
CREATE POLICY "Aluno vê capítulos da instituição"
ON public.capitulos FOR SELECT
USING (
  institution_id = get_user_institution_id()
);

DROP POLICY IF EXISTS "Admin gerencia capítulos da instituição" ON public.capitulos;
CREATE POLICY "Admin gerencia capítulos da instituição"
ON public.capitulos FOR ALL
USING (has_role(auth.uid(), 'admin') AND institution_id = get_user_institution_id())
WITH CHECK (has_role(auth.uid(), 'admin') AND institution_id = get_user_institution_id());

-- ---------- capitulo_papeis ----------
DROP POLICY IF EXISTS "Todos veem papéis dos capítulos da instituição" ON public.capitulo_papeis;
CREATE POLICY "Todos veem papéis dos capítulos da instituição"
ON public.capitulo_papeis FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.capitulos c
    WHERE c.id = capitulo_id
      AND c.institution_id = get_user_institution_id()
  )
);

DROP POLICY IF EXISTS "Admin gerencia papéis" ON public.capitulo_papeis;
CREATE POLICY "Admin gerencia papéis"
ON public.capitulo_papeis FOR ALL
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

-- ---------- capitulo_alocacoes ----------
-- Aluno vê alocações da turma dele
DROP POLICY IF EXISTS "Aluno vê alocações da própria turma" ON public.capitulo_alocacoes;
CREATE POLICY "Aluno vê alocações da própria turma"
ON public.capitulo_alocacoes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.aluno_turma at
    WHERE at.aluno_id = auth.uid()
      AND at.turma_id = capitulo_alocacoes.turma_id
      AND at.ativo = true
  )
);

-- Professor vê alocações das turmas que leciona
DROP POLICY IF EXISTS "Professor vê alocações das turmas dele" ON public.capitulo_alocacoes;
CREATE POLICY "Professor vê alocações das turmas dele"
ON public.capitulo_alocacoes FOR SELECT
USING (
  has_role(auth.uid(), 'professor')
  AND EXISTS (
    SELECT 1 FROM public.professor_turma pt
    WHERE pt.professor_id = auth.uid()
      AND pt.turma_id = capitulo_alocacoes.turma_id
      AND pt.ativo = true
  )
);

-- Professor insere/atualiza/deleta alocações nas turmas dele
DROP POLICY IF EXISTS "Professor insere alocações nas turmas dele" ON public.capitulo_alocacoes;
CREATE POLICY "Professor insere alocações nas turmas dele"
ON public.capitulo_alocacoes FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'professor')
  AND EXISTS (
    SELECT 1 FROM public.professor_turma pt
    WHERE pt.professor_id = auth.uid()
      AND pt.turma_id = capitulo_alocacoes.turma_id
      AND pt.ativo = true
  )
);

DROP POLICY IF EXISTS "Professor atualiza alocações nas turmas dele" ON public.capitulo_alocacoes;
CREATE POLICY "Professor atualiza alocações nas turmas dele"
ON public.capitulo_alocacoes FOR UPDATE
USING (
  has_role(auth.uid(), 'professor')
  AND EXISTS (
    SELECT 1 FROM public.professor_turma pt
    WHERE pt.professor_id = auth.uid()
      AND pt.turma_id = capitulo_alocacoes.turma_id
      AND pt.ativo = true
  )
);

DROP POLICY IF EXISTS "Professor deleta alocações nas turmas dele" ON public.capitulo_alocacoes;
CREATE POLICY "Professor deleta alocações nas turmas dele"
ON public.capitulo_alocacoes FOR DELETE
USING (
  has_role(auth.uid(), 'professor')
  AND EXISTS (
    SELECT 1 FROM public.professor_turma pt
    WHERE pt.professor_id = auth.uid()
      AND pt.turma_id = capitulo_alocacoes.turma_id
      AND pt.ativo = true
  )
);

-- Admin gerencia tudo
DROP POLICY IF EXISTS "Admin gerencia alocações" ON public.capitulo_alocacoes;
CREATE POLICY "Admin gerencia alocações"
ON public.capitulo_alocacoes FOR ALL
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

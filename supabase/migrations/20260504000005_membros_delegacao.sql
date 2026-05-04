-- =============================================
-- "O CAPÍTULO" — alocação em 2 passos pra delegações
-- 1) Mentor escolhe os membros da delegação
-- 2) Mentor distribui os papéis entre os membros
-- =============================================

-- ---------------------------------------------
-- 1. capitulo_delegacao_membros
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.capitulo_delegacao_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capitulo_id uuid NOT NULL REFERENCES public.capitulos(id) ON DELETE CASCADE,
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  delegacao_codigo text NOT NULL,
  aluno_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  alocado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- aluno só em 1 delegação por capítulo+turma
  CONSTRAINT capitulo_membro_unico UNIQUE (capitulo_id, turma_id, aluno_id)
);

CREATE INDEX IF NOT EXISTS idx_membros_capitulo_turma_deleg
  ON public.capitulo_delegacao_membros(capitulo_id, turma_id, delegacao_codigo);
CREATE INDEX IF NOT EXISTS idx_membros_aluno
  ON public.capitulo_delegacao_membros(aluno_id);

DROP TRIGGER IF EXISTS update_membros_updated_at ON public.capitulo_delegacao_membros;
CREATE TRIGGER update_membros_updated_at
  BEFORE UPDATE ON public.capitulo_delegacao_membros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------
-- Trigger: validar inserção de membro
--   - aluno não pode estar em time fixo (Mesa/Mediador/Observatório) nessa turma+capítulo
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.validar_capitulo_membro()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.capitulo_alocacoes ca
    JOIN public.capitulo_papeis cp ON cp.id = ca.papel_id
    WHERE ca.capitulo_id = NEW.capitulo_id
      AND ca.turma_id = NEW.turma_id
      AND ca.aluno_id = NEW.aluno_id
      AND cp.categoria <> 'delegacao'
  ) THEN
    RAISE EXCEPTION 'Aluno já está alocado em Mesa/Mediador/Observatório e não pode entrar em delegação';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_membro ON public.capitulo_delegacao_membros;
CREATE TRIGGER trg_validar_membro
  BEFORE INSERT OR UPDATE ON public.capitulo_delegacao_membros
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_capitulo_membro();

-- ---------------------------------------------
-- Trigger: atualizar validação de capitulo_alocacoes
--   - vagas do papel
--   - se papel é de delegação: aluno DEVE estar nos membros dessa delegação
--   - se papel não é de delegação: aluno NÃO PODE estar em qualquer delegação
--   - aluno não pode ter papéis em "frentes" diferentes (mantém regra antiga ajustada)
-- ---------------------------------------------
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
  v_eh_membro boolean;
  v_membro_de_outra boolean;
BEGIN
  -- Carrega dados do papel
  SELECT categoria, delegacao, vagas_por_turma
    INTO v_categoria, v_delegacao, v_vagas_por_turma
  FROM public.capitulo_papeis
  WHERE id = NEW.papel_id;

  IF v_categoria IS NULL THEN
    RAISE EXCEPTION 'Papel % não encontrado', NEW.papel_id;
  END IF;

  -- Vagas no papel para essa turma
  SELECT count(*) INTO v_count_no_papel
  FROM public.capitulo_alocacoes ca
  WHERE ca.capitulo_id = NEW.capitulo_id
    AND ca.papel_id = NEW.papel_id
    AND ca.turma_id = NEW.turma_id
    AND ca.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_count_no_papel >= v_vagas_por_turma THEN
    RAISE EXCEPTION 'Papel já está com todas as vagas preenchidas nesta turma (% de %)',
      v_count_no_papel, v_vagas_por_turma;
  END IF;

  -- Se papel é de delegação: aluno tem que ser MEMBRO dessa delegação
  IF v_categoria = 'delegacao' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.capitulo_delegacao_membros m
      WHERE m.capitulo_id = NEW.capitulo_id
        AND m.turma_id = NEW.turma_id
        AND m.aluno_id = NEW.aluno_id
        AND m.delegacao_codigo = v_delegacao
    ) INTO v_eh_membro;

    IF NOT v_eh_membro THEN
      RAISE EXCEPTION 'Aluno precisa ser membro da delegação % antes de receber um papel', v_delegacao;
    END IF;

  ELSE
    -- Papel não é de delegação: aluno não pode ser membro de NENHUMA delegação nessa turma
    SELECT EXISTS (
      SELECT 1 FROM public.capitulo_delegacao_membros m
      WHERE m.capitulo_id = NEW.capitulo_id
        AND m.turma_id = NEW.turma_id
        AND m.aluno_id = NEW.aluno_id
    ) INTO v_membro_de_outra;

    IF v_membro_de_outra THEN
      RAISE EXCEPTION 'Aluno é membro de uma delegação e não pode receber papel de Mesa/Mediador/Observatório';
    END IF;
  END IF;

  -- Outras alocações desse aluno no mesmo capítulo
  -- Regra: dentro da delegação, pode acumular vários papéis. Fora dela, só 1 papel.
  FOR v_outras_categoria, v_outras_delegacao IN
    SELECT cp.categoria, cp.delegacao
    FROM public.capitulo_alocacoes ca
    JOIN public.capitulo_papeis cp ON cp.id = ca.papel_id
    WHERE ca.capitulo_id = NEW.capitulo_id
      AND ca.aluno_id = NEW.aluno_id
      AND ca.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  LOOP
    IF v_outras_categoria <> 'delegacao' THEN
      RAISE EXCEPTION 'Aluno já tem papel em "%" e não pode acumular', v_outras_categoria;
    END IF;

    IF v_categoria <> 'delegacao' OR v_delegacao <> v_outras_delegacao THEN
      RAISE EXCEPTION 'Aluno já está na delegação "%" e só pode acumular papéis nela', v_outras_delegacao;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- (trigger trg_validar_capitulo_alocacao já existe da migration 1, função foi reaproveitada)

-- ---------------------------------------------
-- RLS
-- ---------------------------------------------
ALTER TABLE public.capitulo_delegacao_membros ENABLE ROW LEVEL SECURITY;

-- Aluno vê membros da própria turma
DROP POLICY IF EXISTS "Aluno vê membros da própria turma" ON public.capitulo_delegacao_membros;
CREATE POLICY "Aluno vê membros da própria turma"
ON public.capitulo_delegacao_membros FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.aluno_turma at
    WHERE at.aluno_id = auth.uid()
      AND at.turma_id = capitulo_delegacao_membros.turma_id
      AND at.ativo = true
  )
);

-- Mentor vê/gerencia tudo
DROP POLICY IF EXISTS "Mentor vê membros do capítulo dele" ON public.capitulo_delegacao_membros;
CREATE POLICY "Mentor vê membros do capítulo dele"
ON public.capitulo_delegacao_membros FOR SELECT
USING ( public.eh_mentor_do_capitulo(capitulo_id, auth.uid()) );

DROP POLICY IF EXISTS "Mentor insere membros do capítulo dele" ON public.capitulo_delegacao_membros;
CREATE POLICY "Mentor insere membros do capítulo dele"
ON public.capitulo_delegacao_membros FOR INSERT
WITH CHECK ( public.eh_mentor_do_capitulo(capitulo_id, auth.uid()) );

DROP POLICY IF EXISTS "Mentor atualiza membros do capítulo dele" ON public.capitulo_delegacao_membros;
CREATE POLICY "Mentor atualiza membros do capítulo dele"
ON public.capitulo_delegacao_membros FOR UPDATE
USING ( public.eh_mentor_do_capitulo(capitulo_id, auth.uid()) );

DROP POLICY IF EXISTS "Mentor deleta membros do capítulo dele" ON public.capitulo_delegacao_membros;
CREATE POLICY "Mentor deleta membros do capítulo dele"
ON public.capitulo_delegacao_membros FOR DELETE
USING ( public.eh_mentor_do_capitulo(capitulo_id, auth.uid()) );

-- Admin tudo
DROP POLICY IF EXISTS "Admin gerencia membros" ON public.capitulo_delegacao_membros;
CREATE POLICY "Admin gerencia membros"
ON public.capitulo_delegacao_membros FOR ALL
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

-- ---------------------------------------------
-- CLEANUP: alocações antigas de delegação (modelo mudou)
-- ---------------------------------------------
DELETE FROM public.capitulo_alocacoes
WHERE papel_id IN (
  SELECT id FROM public.capitulo_papeis WHERE categoria = 'delegacao'
);

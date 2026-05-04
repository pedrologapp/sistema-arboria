-- =============================================
-- "O CAPÍTULO" — acesso do mentor da casa
-- Quem aloca/configura é o MENTOR da casa ligada à fase do capítulo.
-- Idempotente.
-- =============================================

-- ---------------------------------------------
-- Helper: é mentor da casa do capítulo?
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.eh_mentor_do_capitulo(p_capitulo_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.capitulos c
    JOIN public.fases f ON f.id = c.fase_id
    JOIN public.professor_casa pc
      ON pc.casa_id = f.inteligencia_id
     AND pc.professor_id = p_user_id
     AND pc.ativo = true
     AND pc.eh_mentor_principal = true
    WHERE c.id = p_capitulo_id
  );
$$;

-- ---------------------------------------------
-- capitulo_alocacoes: substitui policies de professor
-- ---------------------------------------------
DROP POLICY IF EXISTS "Professor vê alocações das turmas dele" ON public.capitulo_alocacoes;
DROP POLICY IF EXISTS "Professor insere alocações nas turmas dele" ON public.capitulo_alocacoes;
DROP POLICY IF EXISTS "Professor atualiza alocações nas turmas dele" ON public.capitulo_alocacoes;
DROP POLICY IF EXISTS "Professor deleta alocações nas turmas dele" ON public.capitulo_alocacoes;

CREATE POLICY "Mentor vê alocações do capítulo dele"
ON public.capitulo_alocacoes FOR SELECT
USING ( public.eh_mentor_do_capitulo(capitulo_id, auth.uid()) );

CREATE POLICY "Mentor insere alocações do capítulo dele"
ON public.capitulo_alocacoes FOR INSERT
WITH CHECK ( public.eh_mentor_do_capitulo(capitulo_id, auth.uid()) );

CREATE POLICY "Mentor atualiza alocações do capítulo dele"
ON public.capitulo_alocacoes FOR UPDATE
USING ( public.eh_mentor_do_capitulo(capitulo_id, auth.uid()) );

CREATE POLICY "Mentor deleta alocações do capítulo dele"
ON public.capitulo_alocacoes FOR DELETE
USING ( public.eh_mentor_do_capitulo(capitulo_id, auth.uid()) );

-- (Aluno vê alocações da própria turma — policy mantida)
-- (Admin gerencia tudo — policy mantida)

-- ---------------------------------------------
-- capitulo_turma_config: substitui policies de professor
-- ---------------------------------------------
DROP POLICY IF EXISTS "Professor vê config das turmas dele" ON public.capitulo_turma_config;
DROP POLICY IF EXISTS "Professor cria config das turmas dele" ON public.capitulo_turma_config;
DROP POLICY IF EXISTS "Professor atualiza config das turmas dele" ON public.capitulo_turma_config;

CREATE POLICY "Mentor vê config do capítulo dele"
ON public.capitulo_turma_config FOR SELECT
USING ( public.eh_mentor_do_capitulo(capitulo_id, auth.uid()) );

CREATE POLICY "Mentor cria config do capítulo dele"
ON public.capitulo_turma_config FOR INSERT
WITH CHECK ( public.eh_mentor_do_capitulo(capitulo_id, auth.uid()) );

CREATE POLICY "Mentor atualiza config do capítulo dele"
ON public.capitulo_turma_config FOR UPDATE
USING ( public.eh_mentor_do_capitulo(capitulo_id, auth.uid()) );

CREATE POLICY "Mentor deleta config do capítulo dele"
ON public.capitulo_turma_config FOR DELETE
USING ( public.eh_mentor_do_capitulo(capitulo_id, auth.uid()) );

-- (Aluno vê config da própria turma — policy mantida)
-- (Admin gerencia tudo — policy mantida)

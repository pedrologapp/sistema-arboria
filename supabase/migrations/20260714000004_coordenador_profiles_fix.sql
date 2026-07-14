-- =============================================================
-- COORDENADOR (fix): quebra a recursao de RLS na policy de profiles.
--
-- BUG: a policy "Coordenador le profiles do escopo" (parte B) fazia EXISTS
-- inline em aluno_turma/professor_turma. Como essas tabelas tem policies que,
-- por sua vez, referenciam profiles, o Postgres detecta recursao infinita
-- ("infinite recursion detected in policy for relation aluno_turma") e aborta
-- qualquer query que toque aluno_turma no escopo do coordenador (inclusive a
-- view do painel). Resultado: visor do coordenador vinha vazio.
--
-- FIX: computa os ids de pessoas (alunos + professores) do escopo numa funcao
-- SECURITY DEFINER (que ignora a RLS dessas tabelas, como get_professor_turma_ids
-- ja faz), e a policy de profiles passa a comparar id = ANY(...) sem subquery
-- que dispare RLS. Sem ciclo. Aditivo, so troca a propria policy do coordenador.
-- =============================================================

-- Pessoas (alunos + professores) das turmas do escopo do coordenador logado.
-- SECURITY DEFINER: le aluno_turma/professor_turma por baixo do RLS, evitando o
-- ciclo profiles <-> aluno_turma.
CREATE OR REPLACE FUNCTION public.get_coordenador_pessoa_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(DISTINCT pid), ARRAY[]::uuid[])
  FROM (
    SELECT at.aluno_id AS pid
    FROM public.aluno_turma at
    WHERE at.turma_id = ANY(public.get_coordenador_turma_ids())
    UNION
    SELECT pt.professor_id AS pid
    FROM public.professor_turma pt
    WHERE pt.turma_id = ANY(public.get_coordenador_turma_ids())
  ) s
  WHERE pid IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_coordenador_pessoa_ids() TO authenticated;

-- Troca a policy: sem EXISTS inline (que disparava a RLS de aluno_turma/
-- professor_turma e causava a recursao). Mesma intencao, sem ciclo.
DROP POLICY IF EXISTS "Coordenador le profiles do escopo" ON public.profiles;
CREATE POLICY "Coordenador le profiles do escopo" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'coordenador'::public.app_role)
    AND id = ANY(public.get_coordenador_pessoa_ids())
  );

-- ROLLBACK:
--   DROP POLICY IF EXISTS "Coordenador le profiles do escopo" ON public.profiles;
--   DROP FUNCTION IF EXISTS public.get_coordenador_pessoa_ids();
--   (e recriar a policy antiga com EXISTS, ciente da recursao).

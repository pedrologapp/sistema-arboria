-- =============================================================
-- COORDENADOR (F2): leitura de Casas e mentores, escopada às turmas do coord.
--
-- O F2 é por CASA (mentor conduz a Casa, que atravessa turmas). Para a lente
-- "Casas" do visor, o coordenador precisa ler os mentores (professor_casa) e os
-- vínculos mentor-casa-turma (professor_casa_turma), SEMPRE limitado às Casas
-- ligadas às turmas do seu escopo.
--
-- DOUTRINA: a Casa é TIME/pertencimento (mentoria), não a inteligência
-- diagnosticada. Esta migração só libera leitura; o enquadramento é da UI.
-- Aditivo: policies próprias do coordenador, não mexe nas dos mentores/alunos.
-- =============================================================

-- Casas ligadas às turmas do escopo do coordenador (via professor_casa_turma).
-- SECURITY DEFINER: cruza por baixo do RLS, igual get_coordenador_turma_ids.
CREATE OR REPLACE FUNCTION public.get_coordenador_casa_ids()
RETURNS smallint[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT pct.casa_id), ARRAY[]::smallint[])
  FROM public.professor_casa_turma pct
  WHERE pct.ativo IS TRUE
    AND pct.turma_id = ANY(public.get_coordenador_turma_ids());
$$;

GRANT EXECUTE ON FUNCTION public.get_coordenador_casa_ids() TO authenticated;

-- Mentores das Casas do escopo.
DROP POLICY IF EXISTS "Coordenador le professor_casa do escopo" ON public.professor_casa;
CREATE POLICY "Coordenador le professor_casa do escopo" ON public.professor_casa
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'coordenador'::public.app_role)
    AND casa_id = ANY(public.get_coordenador_casa_ids())
  );

-- Vínculos mentor-casa-turma das turmas do escopo.
DROP POLICY IF EXISTS "Coordenador le professor_casa_turma do escopo" ON public.professor_casa_turma;
CREATE POLICY "Coordenador le professor_casa_turma do escopo" ON public.professor_casa_turma
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'coordenador'::public.app_role)
    AND turma_id = ANY(public.get_coordenador_turma_ids())
  );

-- ROLLBACK:
--   DROP POLICY IF EXISTS "Coordenador le professor_casa_turma do escopo" ON public.professor_casa_turma;
--   DROP POLICY IF EXISTS "Coordenador le professor_casa do escopo" ON public.professor_casa;
--   DROP FUNCTION IF EXISTS public.get_coordenador_casa_ids();

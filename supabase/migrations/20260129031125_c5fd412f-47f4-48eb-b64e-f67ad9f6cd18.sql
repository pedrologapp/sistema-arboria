-- Corrigir a função para definir search_path
CREATE OR REPLACE FUNCTION public.get_professor_turma_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(ARRAY_AGG(turma_id), ARRAY[]::UUID[])
  FROM public.professor_turma 
  WHERE professor_id = auth.uid() AND ativo = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;
-- Política para professores de Infantil/F1 verem alunos das suas turmas vinculadas
-- Usa a função get_professor_turma_ids() que retorna os IDs das turmas do professor logado
CREATE POLICY "Professores veem aluno_turma das suas turmas vinculadas"
ON public.aluno_turma
FOR SELECT
USING (
  has_role(auth.uid(), 'professor'::app_role) 
  AND turma_id = ANY(public.get_professor_turma_ids())
);
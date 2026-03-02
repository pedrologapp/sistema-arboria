
-- Mentores veem aluno_turma de turmas da sua instituição
CREATE POLICY "Mentores veem aluno_turma da instituição"
ON aluno_turma FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND EXISTS (
    SELECT 1 FROM turmas t
    WHERE t.id = aluno_turma.turma_id
    AND t.institution_id = get_user_institution_id()
  )
  AND EXISTS (
    SELECT 1 FROM professor_casa pc
    WHERE pc.professor_id = auth.uid() AND pc.ativo = true
  )
);

-- Mentores veem entregas da instituição
CREATE POLICY "Mentores veem entregas da instituição"
ON entregas FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND EXISTS (
    SELECT 1 FROM missoes m
    WHERE m.id = entregas.missao_id
    AND m.institution_id = get_user_institution_id()
  )
  AND EXISTS (
    SELECT 1 FROM professor_casa pc
    WHERE pc.professor_id = auth.uid() AND pc.ativo = true
  )
);

-- Mentores podem avaliar entregas da instituição
CREATE POLICY "Mentores podem avaliar entregas da instituição"
ON entregas FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND EXISTS (
    SELECT 1 FROM missoes m
    WHERE m.id = entregas.missao_id
    AND m.institution_id = get_user_institution_id()
  )
  AND EXISTS (
    SELECT 1 FROM professor_casa pc
    WHERE pc.professor_id = auth.uid() AND pc.ativo = true
  )
);

-- Mentores veem observações da instituição
CREATE POLICY "Mentores veem observações da instituição"
ON observacoes FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND institution_id = get_user_institution_id()
  AND EXISTS (
    SELECT 1 FROM professor_casa pc
    WHERE pc.professor_id = auth.uid() AND pc.ativo = true
  )
);

-- Mentores veem arquivos de entregas da instituição
CREATE POLICY "Mentores veem arquivos entregas da instituição"
ON entrega_arquivos FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND EXISTS (
    SELECT 1 FROM entregas e
    JOIN missoes m ON m.id = e.missao_id
    WHERE e.id = entrega_arquivos.entrega_id
    AND m.institution_id = get_user_institution_id()
  )
  AND EXISTS (
    SELECT 1 FROM professor_casa pc
    WHERE pc.professor_id = auth.uid() AND pc.ativo = true
  )
);

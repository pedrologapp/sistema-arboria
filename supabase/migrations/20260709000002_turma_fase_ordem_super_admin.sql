-- turma_fase_ordem: permitir o SUPER_ADMIN (o dono da plataforma, sem
-- institution_id) configurar a trilha das turmas.
--
-- A policy original (20260707000002) exigia institution_id = get_user_institution_id()
-- AND has_role 'admin', o que barra o super_admin (get_user_institution_id() NULL).
-- Este ajuste adiciona um ramo super_admin, espelhando a RLS de turma_atividade_plano.
-- Aditivo: só troca a policy de escrita/gestao; nenhum dado tocado.

DROP POLICY IF EXISTS "Ordem gerenciada por admin" ON public.turma_fase_ordem;

CREATE POLICY "Ordem gerenciada por admin" ON public.turma_fase_ordem
  FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'::app_role))
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'::app_role))
  );

-- =============================================================
-- FIX: super_admin (o dono da plataforma) nao LIA turma_fase_ordem.
-- A migration 20260709000002 deu ao super_admin o WRITE (FOR ALL), mas esqueceu
-- o SELECT: a policy "Ordem visivel educadores" so permite professor/admin da
-- instituicao. Como o super_admin tem institution_id nulo, ele lia ZERO linhas.
-- Efeito na tela /arboria/trilha: o dono nao ve as trilhas que salva (tudo
-- aparece como "padrao"), embora as escritas persistam. Isso quebra a conferencia
-- e o "aplicar em lote".
--
-- Correcao: adicionar o ramo super_admin ao SELECT, espelhando turma_atividade_plano
-- (mig 20260708000001), que ja inclui super_admin no SELECT desde o inicio.
-- ADITIVO: preserva o ramo professor/admin; nenhuma leitura e removida.
-- Nao e dado de crianca (e a ORDEM das fases da turma, config).
-- =============================================================

DROP POLICY IF EXISTS "Ordem visivel educadores" ON public.turma_fase_ordem;
CREATE POLICY "Ordem visivel educadores"
ON public.turma_fase_ordem FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    institution_id = public.get_user_institution_id()
    AND (
      public.has_role(auth.uid(), 'professor'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

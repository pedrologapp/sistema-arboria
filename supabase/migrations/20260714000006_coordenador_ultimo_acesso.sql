-- =============================================================
-- COORDENADOR: último acesso REAL por turma (login do professor).
--
-- MOTIVO: o card da Gestão mostrava "sem acesso" / "há N dias" a partir de
-- profiles.ultima_atividade, que anda desatualizado (marca a última AÇÃO
-- rastreada, não o login). O sinal que o Fundador quer ver é o último LOGIN
-- daquele professor, que vive em auth.users.last_sign_in_at, fora do alcance do
-- front do coordenador.
--
-- SOLUÇÃO: função SECURITY DEFINER que devolve, por turma DO ESCOPO do
-- coordenador, o login mais recente entre os professores ativos da turma. Expõe
-- só o timestamp (nenhum outro dado de auth), e só das turmas concedidas
-- (get_coordenador_turma_ids() usa o auth.uid() do chamador). Read-only.
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_coordenador_turma_acesso()
RETURNS TABLE(turma_id uuid, ultimo_acesso timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT pt.turma_id, max(u.last_sign_in_at) AS ultimo_acesso
  FROM public.professor_turma pt
  JOIN auth.users u ON u.id = pt.professor_id
  WHERE pt.ativo IS TRUE
    AND pt.turma_id = ANY(public.get_coordenador_turma_ids())
  GROUP BY pt.turma_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_coordenador_turma_acesso() TO authenticated;

-- ROLLBACK: DROP FUNCTION IF EXISTS public.get_coordenador_turma_acesso();

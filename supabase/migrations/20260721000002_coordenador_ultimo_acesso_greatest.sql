-- ============================================================
-- "Ultimo acesso" do coordenador = MAIOR entre login e uso.
--
-- Problema (relatado 21/07): o 5o ano C abriu o app mas o visor seguia mostrando
-- 10/07. Causa: a funcao lia so `auth.users.last_sign_in_at`, que NAO se move
-- quando o professor reabre a sessao sem re-login (token refresh != sign-in).
--
-- Correcao: usar GREATEST(last_sign_in_at, profiles.ultima_atividade). A
-- ultima_atividade agora e' atualizada tambem no app do professor (Professor
-- Provider passou a chamar useUpdateActivity, antes so o aluno fazia). GREATEST
-- ignora NULLs, entao professor sem uma das datas nao quebra.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_coordenador_turma_acesso()
 RETURNS TABLE(turma_id uuid, ultimo_acesso timestamptz)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  SELECT pt.turma_id,
         max(GREATEST(u.last_sign_in_at, p.ultima_atividade)) AS ultimo_acesso
  FROM public.professor_turma pt
  JOIN auth.users u ON u.id = pt.professor_id
  LEFT JOIN public.profiles p ON p.id = pt.professor_id
  WHERE pt.ativo IS TRUE
    AND pt.turma_id = ANY(public.get_coordenador_turma_ids())
  GROUP BY pt.turma_id;
$function$;

-- Permitir que usuários autenticados vejam perfis da mesma instituição
CREATE POLICY "Usuários veem perfis da mesma instituição"
ON public.profiles
FOR SELECT
TO authenticated
USING (institution_id = get_user_institution_id());
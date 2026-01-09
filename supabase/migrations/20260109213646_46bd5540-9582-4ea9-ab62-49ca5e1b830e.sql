-- Remover policy atual de SELECT em conversa_participantes
DROP POLICY IF EXISTS "Ver próprias participações" ON public.conversa_participantes;

-- Criar nova policy que permite ver todos os participantes de conversas onde o usuário participa
-- Usando a função SECURITY DEFINER para evitar recursão
CREATE POLICY "Ver participantes da conversa"
ON public.conversa_participantes
FOR SELECT
TO authenticated
USING (public.user_participa_conversa(conversa_id));
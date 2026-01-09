-- Remover policy problemática de INSERT
DROP POLICY IF EXISTS "Criar conversa privada" ON public.conversas_privadas;

-- Criar nova policy permitindo INSERT para usuários autenticados
CREATE POLICY "Criar conversa privada"
ON public.conversas_privadas
FOR INSERT
TO authenticated
WITH CHECK (true);
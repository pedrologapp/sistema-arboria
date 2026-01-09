-- Permitir atualizar ultima_leitura do próprio participante
CREATE POLICY "Atualizar própria leitura"
ON public.conversa_participantes
FOR UPDATE
TO authenticated
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());

-- Permitir atualizar conversas onde o usuário participa
CREATE POLICY "Atualizar conversa privada"
ON public.conversas_privadas
FOR UPDATE
TO authenticated
USING (id IN (
  SELECT conversa_id FROM conversa_participantes
  WHERE usuario_id = auth.uid()
));
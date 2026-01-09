-- ================================================
-- 1. REMOVER POLICIES PROBLEMÁTICAS
-- ================================================

-- conversa_participantes
DROP POLICY IF EXISTS "Ver participantes" ON public.conversa_participantes;
DROP POLICY IF EXISTS "Adicionar participante" ON public.conversa_participantes;

-- conversas_privadas  
DROP POLICY IF EXISTS "Ver conversas privadas" ON public.conversas_privadas;
DROP POLICY IF EXISTS "Atualizar conversa privada" ON public.conversas_privadas;

-- ================================================
-- 2. CRIAR FUNÇÃO AUXILIAR (SECURITY DEFINER)
-- ================================================

CREATE OR REPLACE FUNCTION public.user_participa_conversa(p_conversa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversa_participantes
    WHERE conversa_id = p_conversa_id
    AND usuario_id = auth.uid()
  )
$$;

-- ================================================
-- 3. CRIAR POLICIES CORRETAS (SEM RECURSÃO)
-- ================================================

-- conversa_participantes: Ver apenas onde eu sou participante
-- Verificação direta sem subquery na própria tabela
CREATE POLICY "Ver próprias participações"
ON public.conversa_participantes
FOR SELECT
TO authenticated
USING (usuario_id = auth.uid());

-- conversa_participantes: Inserir participante
CREATE POLICY "Inserir participante"
ON public.conversa_participantes
FOR INSERT
TO authenticated
WITH CHECK (true);

-- conversas_privadas: Ver conversas onde participo (usa função SECURITY DEFINER)
CREATE POLICY "Ver conversas privadas"
ON public.conversas_privadas
FOR SELECT
TO authenticated
USING (public.user_participa_conversa(id));

-- conversas_privadas: Atualizar conversas onde participo
CREATE POLICY "Atualizar conversa privada"
ON public.conversas_privadas
FOR UPDATE
TO authenticated
USING (public.user_participa_conversa(id));
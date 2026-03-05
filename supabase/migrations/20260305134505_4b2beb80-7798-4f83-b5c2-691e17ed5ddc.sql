
-- 1. Make casa_id nullable on canais_casa
ALTER TABLE public.canais_casa ALTER COLUMN casa_id DROP NOT NULL;

-- 2. Create security definer function to check conselho access
CREATE OR REPLACE FUNCTION public.pode_acessar_conselho(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.cargos_casa WHERE aluno_id = p_user_id AND cargo = 'lider' AND ativo = true
  )
$$;

-- 3. Drop existing RLS policies on canais_casa that need updating
DROP POLICY IF EXISTS "Aluno ve canais da sua casa" ON public.canais_casa;

-- 4. Recreate canais_casa SELECT policy to include conselho for all users in institution
CREATE POLICY "Aluno ve canais da sua casa ou conselho"
ON public.canais_casa
FOR SELECT
TO authenticated
USING (
  institution_id = get_user_institution_id()
  AND (
    -- Canal de casa do aluno
    casa_id = (SELECT profiles.casa_id FROM profiles WHERE profiles.id = auth.uid())
    -- Canal conselho (visível para todos)
    OR (casa_id IS NULL AND tipo = 'conselho_lideres')
    -- Admin vê tudo
    OR has_role(auth.uid(), 'admin')
    -- Professor vê canais da sua casa
    OR has_role(auth.uid(), 'professor')
  )
);

-- 5. Drop existing RLS policies on mensagens_canal that need updating
DROP POLICY IF EXISTS "Ver mensagens do canal" ON public.mensagens_canal;
DROP POLICY IF EXISTS "Enviar mensagem no canal" ON public.mensagens_canal;

-- 6. Recreate mensagens_canal SELECT policy
CREATE POLICY "Ver mensagens do canal"
ON public.mensagens_canal
FOR SELECT
TO authenticated
USING (
  institution_id = get_user_institution_id()
  AND (
    -- Mensagens de canais da casa do usuário
    canal_id IN (
      SELECT c.id FROM canais_casa c
      WHERE c.casa_id = (SELECT profiles.casa_id FROM profiles WHERE profiles.id = auth.uid())
    )
    -- Mensagens do conselho (só admin/líder)
    OR (
      canal_id IN (SELECT c.id FROM canais_casa c WHERE c.tipo = 'conselho_lideres')
      AND pode_acessar_conselho(auth.uid())
    )
    -- Admin vê tudo
    OR has_role(auth.uid(), 'admin')
    -- Professor vê canais da casa
    OR has_role(auth.uid(), 'professor')
  )
);

-- 7. Recreate mensagens_canal INSERT policy
CREATE POLICY "Enviar mensagem no canal"
ON public.mensagens_canal
FOR INSERT
TO authenticated
WITH CHECK (
  autor_id = auth.uid()
  AND institution_id = get_user_institution_id()
  AND (
    -- Canal da casa do usuário
    canal_id IN (
      SELECT c.id FROM canais_casa c
      WHERE c.casa_id = (SELECT profiles.casa_id FROM profiles WHERE profiles.id = auth.uid())
    )
    -- Canal conselho (só admin/líder)
    OR (
      canal_id IN (SELECT c.id FROM canais_casa c WHERE c.tipo = 'conselho_lideres')
      AND pode_acessar_conselho(auth.uid())
    )
    -- Admin pode enviar em qualquer canal
    OR has_role(auth.uid(), 'admin')
  )
);

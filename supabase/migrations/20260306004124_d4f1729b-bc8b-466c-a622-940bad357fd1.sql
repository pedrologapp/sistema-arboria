
-- 1. Create function to check leadership access
CREATE OR REPLACE FUNCTION public.pode_acessar_lideranca_casa(p_user_id uuid, p_casa_id smallint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Admin
    SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin'
  )
  OR EXISTS (
    -- Líder ou Coordenador ativo na mesma casa
    SELECT 1 FROM public.cargos_casa
    WHERE aluno_id = p_user_id
      AND casa_id = p_casa_id
      AND cargo IN ('lider', 'coordenador')
      AND ativo = true
  )
  OR EXISTS (
    -- Professor mentor da casa
    SELECT 1 FROM public.professor_casa
    WHERE professor_id = p_user_id
      AND casa_id = p_casa_id
      AND ativo = true
  )
$$;

-- 2. Update RLS on canais_casa SELECT to include lideranca_casa channels
DROP POLICY IF EXISTS "Aluno ve canais da sua casa ou conselho" ON public.canais_casa;
CREATE POLICY "Aluno ve canais da sua casa ou conselho" ON public.canais_casa
FOR SELECT USING (
  (institution_id = get_user_institution_id()) AND (
    (casa_id = (SELECT profiles.casa_id FROM profiles WHERE profiles.id = auth.uid()))
    OR ((casa_id IS NULL) AND (tipo = 'conselho_lideres'))
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'professor')
  )
);

-- 3. Update RLS on mensagens_canal to support lideranca_casa
DROP POLICY IF EXISTS "Ver mensagens do canal" ON public.mensagens_canal;
CREATE POLICY "Ver mensagens do canal" ON public.mensagens_canal
FOR SELECT USING (
  (institution_id = get_user_institution_id()) AND (
    -- Canais normais da casa do aluno (excluindo lideranca_casa)
    (canal_id IN (
      SELECT c.id FROM canais_casa c
      WHERE c.casa_id = (SELECT profiles.casa_id FROM profiles WHERE profiles.id = auth.uid())
        AND (c.tipo IS DISTINCT FROM 'lideranca_casa')
    ))
    -- Conselho de líderes
    OR (canal_id IN (
      SELECT c.id FROM canais_casa c WHERE c.tipo = 'conselho_lideres'
    ) AND pode_acessar_conselho(auth.uid()))
    -- Liderança da casa
    OR (canal_id IN (
      SELECT c.id FROM canais_casa c WHERE c.tipo = 'lideranca_casa'
    ) AND pode_acessar_lideranca_casa(auth.uid(), (
      SELECT c.casa_id::smallint FROM canais_casa c WHERE c.id = mensagens_canal.canal_id
    )))
    -- Admin vê tudo
    OR has_role(auth.uid(), 'admin')
    -- Professor vê tudo
    OR has_role(auth.uid(), 'professor')
  )
);

DROP POLICY IF EXISTS "Enviar mensagem no canal" ON public.mensagens_canal;
CREATE POLICY "Enviar mensagem no canal" ON public.mensagens_canal
FOR INSERT WITH CHECK (
  (autor_id = auth.uid()) AND (institution_id = get_user_institution_id()) AND (
    -- Canais normais da casa (excluindo lideranca_casa)
    (canal_id IN (
      SELECT c.id FROM canais_casa c
      WHERE c.casa_id = (SELECT profiles.casa_id FROM profiles WHERE profiles.id = auth.uid())
        AND (c.tipo IS DISTINCT FROM 'lideranca_casa')
    ))
    -- Conselho de líderes
    OR (canal_id IN (
      SELECT c.id FROM canais_casa c WHERE c.tipo = 'conselho_lideres'
    ) AND pode_acessar_conselho(auth.uid()))
    -- Liderança da casa
    OR (canal_id IN (
      SELECT c.id FROM canais_casa c WHERE c.tipo = 'lideranca_casa'
    ) AND pode_acessar_lideranca_casa(auth.uid(), (
      SELECT c.casa_id::smallint FROM canais_casa c WHERE c.id = mensagens_canal.canal_id
    )))
    -- Admin
    OR has_role(auth.uid(), 'admin')
  )
);

-- Função que protege alteração do casa_id por não-admins
CREATE OR REPLACE FUNCTION public.protect_casa_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se casa_id não mudou, permite
  IF OLD.casa_id IS NOT DISTINCT FROM NEW.casa_id THEN
    RETURN NEW;
  END IF;
  
  -- Se é admin, permite alteração
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  
  -- Não-admin tentando alterar casa_id: bloqueia
  RAISE EXCEPTION 'Apenas administradores podem alterar a Casa do usuário';
END;
$$;

-- Trigger que dispara antes de UPDATE na tabela profiles
CREATE TRIGGER protect_casa_id_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_casa_id_change();
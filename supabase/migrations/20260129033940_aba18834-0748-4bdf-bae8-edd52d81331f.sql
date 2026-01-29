-- Atualizar trigger para permitir alterações via service role (auth.uid() IS NULL)
CREATE OR REPLACE FUNCTION public.protect_casa_id_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Se casa_id não mudou, permite
  IF OLD.casa_id IS NOT DISTINCT FROM NEW.casa_id THEN
    RETURN NEW;
  END IF;
  
  -- Se auth.uid() é NULL, significa que é uma operação via service role (admin edge function)
  -- Permite a alteração
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Se é admin, permite alteração
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  
  -- Não-admin tentando alterar casa_id: bloqueia
  RAISE EXCEPTION 'Apenas administradores podem alterar a Casa do usuário';
END;
$function$;
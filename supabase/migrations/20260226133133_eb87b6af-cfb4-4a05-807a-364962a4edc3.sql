
-- 1. Remover CHECK constraint que impede a conversão
ALTER TABLE public.turmas DROP CONSTRAINT turmas_serie_check;

-- 2. Alterar turmas.serie de smallint para text
ALTER TABLE public.turmas ALTER COLUMN serie TYPE text USING serie::text;

-- 3. Recriar ensure_turma_exists para trabalhar com serie como texto e segmento
CREATE OR REPLACE FUNCTION public.ensure_turma_exists(p_institution_id uuid, p_serie text, p_turma_letra text, p_ano_letivo smallint, p_segmento text DEFAULT 'fundamental2')
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_turma_id uuid;
  v_nome text;
BEGIN
  SELECT id INTO v_turma_id
  FROM public.turmas
  WHERE institution_id = p_institution_id
    AND serie = p_serie
    AND UPPER(TRIM(turma_letra)) = UPPER(TRIM(p_turma_letra))
    AND ano_letivo = p_ano_letivo
    AND segmento = p_segmento;
  
  IF v_turma_id IS NULL THEN
    IF p_segmento = 'infantil' THEN
      v_nome := p_serie || ' ' || UPPER(TRIM(p_turma_letra));
    ELSE
      v_nome := p_serie || 'º ' || UPPER(TRIM(p_turma_letra));
    END IF;

    INSERT INTO public.turmas (institution_id, nome, serie, turma_letra, ano_letivo, segmento)
    VALUES (
      p_institution_id,
      v_nome,
      p_serie,
      UPPER(TRIM(p_turma_letra)),
      p_ano_letivo,
      p_segmento
    )
    RETURNING id INTO v_turma_id;
  END IF;
  
  RETURN v_turma_id;
END;
$function$;

-- 4. Recriar sync_profile_to_aluno_turma para passar serie e segmento como texto
CREATE OR REPLACE FUNCTION public.sync_profile_to_aluno_turma()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_turma_id uuid;
  v_ano_letivo smallint;
  v_is_aluno boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.id AND role = 'user'
  ) INTO v_is_aluno;
  
  IF NOT v_is_aluno OR NEW.serie IS NULL OR NEW.turma IS NULL OR NEW.institution_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(ano_letivo_atual, EXTRACT(YEAR FROM CURRENT_DATE)::smallint)
  INTO v_ano_letivo
  FROM public.institution_settings
  WHERE institution_id = NEW.institution_id;
  
  IF v_ano_letivo IS NULL THEN
    v_ano_letivo := EXTRACT(YEAR FROM CURRENT_DATE)::smallint;
  END IF;
  
  v_turma_id := public.ensure_turma_exists(
    NEW.institution_id, 
    NEW.serie, 
    NEW.turma, 
    v_ano_letivo,
    COALESCE(NEW.segmento, 'fundamental2')
  );
  
  INSERT INTO public.aluno_turma (aluno_id, turma_id, ano_letivo, ativo)
  VALUES (NEW.id, v_turma_id, v_ano_letivo, true)
  ON CONFLICT (aluno_id, turma_id, ano_letivo) 
  DO UPDATE SET ativo = true;
  
  RETURN NEW;
END;
$function$;

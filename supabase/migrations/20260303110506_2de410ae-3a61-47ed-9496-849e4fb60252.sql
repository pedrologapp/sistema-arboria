-- 1. Dropar a versão ambígua (4 args)
DROP FUNCTION IF EXISTS public.ensure_turma_exists(uuid, text, text, smallint);

-- 2. Atualizar o trigger para passar segmento
CREATE OR REPLACE FUNCTION public.sync_user_role_to_aluno_turma()
RETURNS trigger AS $$
DECLARE
  v_profile RECORD;
  v_turma_id uuid;
  v_ano_letivo smallint;
BEGIN
  IF NEW.role != 'user' THEN RETURN NEW; END IF;
  
  SELECT id, serie, turma, institution_id, segmento
  INTO v_profile FROM public.profiles WHERE id = NEW.user_id;
  
  IF v_profile.serie IS NULL OR v_profile.turma IS NULL OR v_profile.institution_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(ano_letivo_atual, EXTRACT(YEAR FROM CURRENT_DATE)::smallint)
  INTO v_ano_letivo FROM public.institution_settings
  WHERE institution_id = v_profile.institution_id;
  
  IF v_ano_letivo IS NULL THEN
    v_ano_letivo := EXTRACT(YEAR FROM CURRENT_DATE)::smallint;
  END IF;
  
  v_turma_id := public.ensure_turma_exists(
    v_profile.institution_id, v_profile.serie, v_profile.turma, 
    v_ano_letivo, COALESCE(v_profile.segmento, 'fundamental2')
  );
  
  INSERT INTO public.aluno_turma (aluno_id, turma_id, ano_letivo, ativo)
  VALUES (v_profile.id, v_turma_id, v_ano_letivo, true)
  ON CONFLICT (aluno_id, turma_id, ano_letivo) DO UPDATE SET ativo = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
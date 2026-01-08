-- =====================================================
-- TABELA: score_ajustes_log (Log imutável de ajustes)
-- =====================================================
CREATE TABLE public.score_ajustes_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id uuid NOT NULL REFERENCES public.institutions(id),
  aluno_id uuid NOT NULL REFERENCES public.profiles(id),
  inteligencia_id smallint NOT NULL REFERENCES public.inteligencias(id),
  score_anterior decimal(5,2) NOT NULL,
  score_novo decimal(5,2) NOT NULL,
  motivo text NOT NULL,
  ajustado_por uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_ajustes_aluno ON public.score_ajustes_log(aluno_id);
CREATE INDEX idx_ajustes_data ON public.score_ajustes_log(created_at);

-- RLS: Log imutável - apenas admins podem ver/inserir, ninguém pode alterar/deletar
ALTER TABLE public.score_ajustes_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode ver ajustes da instituição"
  ON public.score_ajustes_log FOR SELECT
  USING (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode inserir ajustes"
  ON public.score_ajustes_log FOR INSERT
  WITH CHECK (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

-- UPDATE e DELETE bloqueados por padrão (sem políticas = bloqueado)

-- =====================================================
-- FUNÇÃO: inicializar_scores_aluno()
-- Cria 8 registros em inteligencia_scores quando aluno é criado
-- =====================================================
CREATE OR REPLACE FUNCTION public.inicializar_scores_aluno()
RETURNS TRIGGER AS $$
DECLARE
  v_ano_letivo smallint;
  v_im record;
BEGIN
  -- Só executa para alunos (quem tem casa_id)
  IF NEW.casa_id IS NOT NULL THEN
    -- Pega ano letivo da instituição
    SELECT COALESCE(ano_letivo_atual, EXTRACT(YEAR FROM NOW())::smallint)
    INTO v_ano_letivo
    FROM public.institution_settings
    WHERE institution_id = NEW.institution_id;
    
    -- Fallback se não encontrar settings
    IF v_ano_letivo IS NULL THEN
      v_ano_letivo := EXTRACT(YEAR FROM NOW())::smallint;
    END IF;
    
    -- Cria 8 registros (um para cada IM)
    FOR v_im IN SELECT id FROM public.inteligencias ORDER BY id LOOP
      INSERT INTO public.inteligencia_scores (
        aluno_id,
        inteligencia_id,
        score_atual,
        ano_letivo
      ) VALUES (
        NEW.id,
        v_im.id,
        35.00,
        v_ano_letivo
      )
      ON CONFLICT (aluno_id, inteligencia_id, ano_letivo) DO NOTHING;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para novos alunos
DROP TRIGGER IF EXISTS on_aluno_inicializar_scores ON public.profiles;
CREATE TRIGGER on_aluno_inicializar_scores
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.inicializar_scores_aluno();

-- =====================================================
-- FUNÇÃO: registrar_ajuste_score()
-- Loga alterações manuais nos scores
-- =====================================================
CREATE OR REPLACE FUNCTION public.registrar_ajuste_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Só loga se score_atual mudou
  IF OLD.score_atual IS DISTINCT FROM NEW.score_atual THEN
    INSERT INTO public.score_ajustes_log (
      institution_id,
      aluno_id,
      inteligencia_id,
      score_anterior,
      score_novo,
      motivo,
      ajustado_por
    ) VALUES (
      (SELECT institution_id FROM public.profiles WHERE id = NEW.aluno_id),
      NEW.aluno_id,
      NEW.inteligencia_id,
      OLD.score_atual,
      NEW.score_atual,
      COALESCE(current_setting('app.motivo_ajuste', true), 'Ajuste manual'),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para log de ajustes
DROP TRIGGER IF EXISTS on_score_ajustado ON public.inteligencia_scores;
CREATE TRIGGER on_score_ajustado
  AFTER UPDATE ON public.inteligencia_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_ajuste_score();

-- =====================================================
-- MIGRAÇÃO: Inicializa scores para alunos existentes
-- =====================================================
INSERT INTO public.inteligencia_scores (aluno_id, inteligencia_id, score_atual, ano_letivo)
SELECT 
  p.id, 
  i.id, 
  35.00,
  COALESCE(s.ano_letivo_atual, 2025)
FROM public.profiles p
CROSS JOIN public.inteligencias i
LEFT JOIN public.institution_settings s ON s.institution_id = p.institution_id
WHERE p.casa_id IS NOT NULL
ON CONFLICT (aluno_id, inteligencia_id, ano_letivo) DO NOTHING;
-- Ajustar trigger para permitir ajustes feitos pelo sistema (sem usuário autenticado)
CREATE OR REPLACE FUNCTION registrar_ajuste_score()
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
      COALESCE(current_setting('app.motivo_ajuste', true), 'Fechamento de fase'),
      auth.uid()  -- Pode ser null quando executado por função do sistema
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Permitir NULL em ajustado_por para ajustes automáticos do sistema
ALTER TABLE score_ajustes_log ALTER COLUMN ajustado_por DROP NOT NULL;
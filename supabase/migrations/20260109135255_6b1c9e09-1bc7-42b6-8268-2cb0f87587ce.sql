-- Renomear retorno da função para evitar conflito com nome de coluna
DROP FUNCTION IF EXISTS fechar_fase(uuid);

CREATE OR REPLACE FUNCTION fechar_fase(p_fase_id uuid)
RETURNS TABLE(total_alunos int, numero_da_fase smallint) AS $$
DECLARE
  v_fase record;
  v_aluno record;
  v_im record;
  v_evidencias record;
  v_score_fase decimal;
  v_score_anterior decimal;
  v_score_calculado decimal;
  v_score_novo decimal;
  v_variacao decimal;
  v_contador int := 0;
BEGIN
  -- Buscar dados da fase
  SELECT * INTO v_fase FROM fases WHERE id = p_fase_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fase não encontrada: %', p_fase_id;
  END IF;
  
  -- Para cada aluno da instituição (que tem casa_id = é aluno)
  FOR v_aluno IN
    SELECT p.id, p.casa_id
    FROM profiles p
    WHERE p.institution_id = v_fase.institution_id
    AND p.casa_id IS NOT NULL
  LOOP
    -- Para cada inteligência
    FOR v_im IN SELECT id FROM inteligencias ORDER BY id LOOP
      
      -- Buscar evidências desta fase para este aluno × IM
      SELECT
        COALESCE(SUM(pontos), 0) as total_pontos,
        COUNT(*) as total_evidencias
      INTO v_evidencias
      FROM inteligencia_evidencias
      WHERE aluno_id = v_aluno.id
      AND inteligencia_id = v_im.id
      AND fase_id = p_fase_id;
      
      -- Calcular Score_Fase (pontos / 50 * 100, max 100)
      v_score_fase := LEAST(100, (v_evidencias.total_pontos / 50.0) * 100);
      
      -- Buscar score anterior
      SELECT score_atual INTO v_score_anterior
      FROM inteligencia_scores
      WHERE aluno_id = v_aluno.id
      AND inteligencia_id = v_im.id
      AND ano_letivo = v_fase.ano_letivo;
      
      IF v_score_anterior IS NULL THEN
        v_score_anterior := 35.00;
      END IF;
      
      -- Aplicar fórmula de inércia (85/15)
      v_score_calculado := (v_score_anterior * 0.85) + (v_score_fase * 0.15);
      
      -- Aplicar limite de ±5
      v_variacao := v_score_calculado - v_score_anterior;
      IF v_variacao > 5 THEN
        v_score_novo := v_score_anterior + 5;
      ELSIF v_variacao < -5 THEN
        v_score_novo := v_score_anterior - 5;
      ELSE
        v_score_novo := v_score_calculado;
      END IF;
      
      -- Garantir limites 0-100
      v_score_novo := GREATEST(0, LEAST(100, v_score_novo));
      
      -- Atualizar inteligencia_scores
      INSERT INTO inteligencia_scores (
        aluno_id, inteligencia_id, score_atual,
        score_ultima_fase, total_evidencias,
        ano_letivo, fase_atual
      ) VALUES (
        v_aluno.id, v_im.id, v_score_novo,
        v_score_fase, v_evidencias.total_evidencias,
        v_fase.ano_letivo, v_fase.numero_fase
      )
      ON CONFLICT (aluno_id, inteligencia_id, ano_letivo)
      DO UPDATE SET
        score_atual = v_score_novo,
        score_ultima_fase = v_score_fase,
        total_evidencias = inteligencia_scores.total_evidencias + v_evidencias.total_evidencias,
        fase_atual = v_fase.numero_fase,
        updated_at = now();
      
      -- Salvar histórico (snapshot)
      INSERT INTO inteligencia_historico (
        aluno_id, inteligencia_id, ano_letivo,
        fase_numero, score_fase, score_apos_formula
      ) VALUES (
        v_aluno.id, v_im.id, v_fase.ano_letivo,
        v_fase.numero_fase, v_score_fase, v_score_novo
      )
      ON CONFLICT (aluno_id, inteligencia_id, ano_letivo, fase_numero)
      DO UPDATE SET
        score_fase = EXCLUDED.score_fase,
        score_apos_formula = EXCLUDED.score_apos_formula;
      
    END LOOP;
    
    v_contador := v_contador + 1;
  END LOOP;
  
  -- Marcar fase como fechada
  UPDATE fases SET ativo = false WHERE id = p_fase_id;
  
  RETURN QUERY SELECT v_contador, v_fase.numero_fase;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
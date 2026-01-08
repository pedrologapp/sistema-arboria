-- Função que processa quando professor registra observação
CREATE OR REPLACE FUNCTION processar_observacao()
RETURNS TRIGGER AS $$
DECLARE
  v_sinal record;
  v_fase record;
  v_tipo text;
  v_peso smallint;
  v_pontos decimal;
  v_ano_letivo smallint;
BEGIN
  -- Buscar dados do sinal
  SELECT * INTO v_sinal FROM sinais WHERE id = NEW.sinal_id;

  -- Buscar dados da fase
  SELECT f.*, COALESCE(s.ano_letivo_atual, 2025) as ano_letivo
  INTO v_fase
  FROM fases f
  LEFT JOIN institution_settings s ON s.institution_id = f.institution_id
  WHERE f.id = NEW.fase_id;

  v_ano_letivo := COALESCE(v_fase.ano_letivo, 2025);

  -- Só cria evidência para sinais positivos
  IF v_sinal.valencia = 'positivo' THEN
    
    -- Determinar tipo e peso baseado em cross-IM
    IF NEW.foi_cross_im THEN
      v_tipo := 'obs_cross';
      v_peso := 5;  -- Cross-IM tem peso maior (força fora da zona)
    ELSE
      v_tipo := 'obs_propria';
      v_peso := 3;  -- Na atividade da fase
    END IF;
    
    -- Calcular pontos baseado na intensidade
    v_pontos := v_sinal.peso_inteligencia;
    IF NEW.intensidade = 'alto' THEN
      v_pontos := v_pontos * 1.5;
    ELSIF NEW.intensidade = 'excepcional' THEN
      v_pontos := v_pontos * 2;
    END IF;
    
    -- Criar evidência para a IM EXPRESSA pelo aluno
    INSERT INTO inteligencia_evidencias (
      aluno_id, inteligencia_id, tipo, peso,
      pontos, observacao_id, fase_id, ano_letivo
    ) VALUES (
      NEW.aluno_id,
      NEW.inteligencia_expressa,  -- A IM que foi demonstrada
      v_tipo,
      v_peso,
      v_pontos,
      NEW.id,
      NEW.fase_id,
      v_ano_letivo
    );
    
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger AFTER INSERT para processar observação
DROP TRIGGER IF EXISTS on_observacao_criada ON observacoes;

CREATE TRIGGER on_observacao_criada
  AFTER INSERT ON observacoes
  FOR EACH ROW
  EXECUTE FUNCTION processar_observacao();
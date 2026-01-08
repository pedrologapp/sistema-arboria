-- Função que processa quando uma entrega é aprovada
CREATE OR REPLACE FUNCTION processar_entrega_aprovada()
RETURNS TRIGGER AS $$
DECLARE
  v_missao record;
  v_aluno record;
  v_pontos_calculados smallint;
  v_tipo_evidencia text;
  v_peso smallint;
BEGIN
  -- Só executa quando status muda para 'aprovada'
  IF NEW.status = 'aprovada' AND (OLD.status IS NULL OR OLD.status <> 'aprovada') THEN
    
    -- Buscar dados da missão
    SELECT m.*, f.inteligencia_id as fase_im
    INTO v_missao
    FROM missoes m
    LEFT JOIN fases f ON f.id = m.fase_id
    WHERE m.id = NEW.missao_id;
    
    -- Buscar dados do aluno
    SELECT p.*, COALESCE(s.ano_letivo_atual, 2025) as ano_letivo
    INTO v_aluno
    FROM profiles p
    LEFT JOIN institution_settings s ON s.institution_id = p.institution_id
    WHERE p.id = NEW.aluno_id;
    
    -- Calcular pontos: (nota / 10) * pontos_base
    v_pontos_calculados := ROUND((NEW.nota::decimal / 10) * v_missao.pontos_base);
    
    -- Atualizar pontos_concedidos na entrega
    NEW.pontos_concedidos := v_pontos_calculados;
    
    -- Inserir em pontos_gerais
    INSERT INTO pontos_gerais (
      institution_id, aluno_id, casa_id, tipo,
      missao_id, entrega_id, pontos, descricao,
      concedido_por, ano_letivo
    ) VALUES (
      v_missao.institution_id,
      NEW.aluno_id,
      v_aluno.casa_id,
      'missao',
      NEW.missao_id,
      NEW.id,
      v_pontos_calculados,
      'Missão: ' || v_missao.titulo,
      NEW.avaliado_por,
      v_aluno.ano_letivo
    );
    
    -- Criar evidência de inteligência (se missão tem fase)
    IF v_missao.fase_id IS NOT NULL THEN
      IF v_missao.fase_im = v_aluno.casa_id THEN
        v_tipo_evidencia := 'missao_propria';
        v_peso := 2;
      ELSE
        v_tipo_evidencia := 'missao_cross';
        v_peso := 1;
      END IF;
      
      -- Evidência para a IM da CASA do aluno
      INSERT INTO inteligencia_evidencias (
        aluno_id, inteligencia_id, tipo, peso,
        pontos, entrega_id, fase_id, ano_letivo
      ) VALUES (
        NEW.aluno_id,
        v_aluno.casa_id,
        v_tipo_evidencia,
        v_peso,
        NEW.nota * (v_peso::decimal / 10),
        NEW.id,
        v_missao.fase_id,
        v_aluno.ano_letivo
      );
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger BEFORE UPDATE para processar aprovação
DROP TRIGGER IF EXISTS on_entrega_aprovada ON entregas;

CREATE TRIGGER on_entrega_aprovada
  BEFORE UPDATE ON entregas
  FOR EACH ROW
  EXECUTE FUNCTION processar_entrega_aprovada();
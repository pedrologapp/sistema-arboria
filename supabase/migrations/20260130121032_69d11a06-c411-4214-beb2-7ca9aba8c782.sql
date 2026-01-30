-- Atualizar a função trigger para usar o novo endpoint do webhook
CREATE OR REPLACE FUNCTION public.trigger_notificar_n8n_observacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_aluno RECORD;
  v_casa RECORD;
  v_professor RECORD;
  v_sinal RECORD;
  v_im_expressa RECORD;
  v_im_fase RECORD;
  v_fase RECORD;
  v_turma RECORD;
  v_aluno_json JSONB;
  v_sinal_json JSONB;
  v_payload JSONB;
  v_request_id BIGINT;
  v_endpoint_url TEXT := 'https://webhook.escolaamadeus.com/webhook/projetoarboria';
BEGIN
  -- 1. Buscar dados do aluno (com FOUND check)
  SELECT id, full_name, nome, serie, turma, casa_id, 
         matricula_externa, segmento
  INTO v_aluno
  FROM profiles
  WHERE id = NEW.aluno_id;

  IF NOT FOUND THEN
    -- Fallback: criar objeto mínimo se aluno não encontrado
    v_aluno_json := jsonb_build_object(
      'id', NEW.aluno_id,
      '_status', 'not_found'
    );
  ELSE
    -- Buscar nome da casa do aluno
    SELECT nome, emoji INTO v_casa
    FROM inteligencias
    WHERE id = v_aluno.casa_id;

    v_aluno_json := jsonb_build_object(
      'id', v_aluno.id,
      'matricula_externa', v_aluno.matricula_externa,
      'nome', COALESCE(v_aluno.full_name, v_aluno.nome),
      'serie', v_aluno.serie,
      'turma', v_aluno.turma,
      'segmento', v_aluno.segmento,
      'casa_id', v_aluno.casa_id,
      'casa_nome', v_casa.nome
    );
  END IF;

  -- 2. Buscar dados do professor
  SELECT id, full_name, nome
  INTO v_professor
  FROM profiles
  WHERE id = NEW.professor_id;

  -- 3. Buscar dados do sinal (com FOUND check)
  SELECT id, codigo, emoji, label_pt, valencia, pilar, peso_inteligencia
  INTO v_sinal
  FROM sinais
  WHERE id = NEW.sinal_id;

  IF NOT FOUND THEN
    -- Fallback: criar objeto mínimo se sinal não encontrado
    v_sinal_json := jsonb_build_object(
      'id', NEW.sinal_id,
      '_status', 'not_found'
    );
  ELSE
    v_sinal_json := jsonb_build_object(
      'id', v_sinal.id,
      'codigo', v_sinal.codigo,
      'emoji', v_sinal.emoji,
      'label', v_sinal.label_pt,
      'valencia', v_sinal.valencia,
      'pilar', v_sinal.pilar,
      'peso', v_sinal.peso_inteligencia
    );
  END IF;

  -- 4. Buscar inteligência EXPRESSA
  SELECT id, nome, emoji INTO v_im_expressa
  FROM inteligencias
  WHERE id = NEW.inteligencia_expressa;

  -- 5. Buscar inteligência da FASE
  SELECT id, nome, emoji INTO v_im_fase
  FROM inteligencias
  WHERE id = NEW.inteligencia_fase;

  -- 6. Buscar dados da fase
  SELECT id, numero_fase INTO v_fase
  FROM fases
  WHERE id = NEW.fase_id;

  -- 7. Buscar dados da turma
  SELECT id, nome INTO v_turma
  FROM turmas
  WHERE id = NEW.turma_id;

  -- Montar payload JSON estruturado e enriquecido
  v_payload := jsonb_build_object(
    'evento', 'observacao_criada',
    'observacao_id', NEW.id,
    'timestamp', NEW.created_at,
    
    'aluno', v_aluno_json,
    
    'professor', jsonb_build_object(
      'id', v_professor.id,
      'nome', COALESCE(v_professor.full_name, v_professor.nome)
    ),
    
    'sinal', v_sinal_json,
    
    'inteligencias', jsonb_build_object(
      'expressa_id', v_im_expressa.id,
      'expressa_nome', v_im_expressa.nome,
      'expressa_emoji', v_im_expressa.emoji,
      'fase_id', v_im_fase.id,
      'fase_nome', v_im_fase.nome,
      'fase_emoji', v_im_fase.emoji,
      'foi_cross_im', NEW.foi_cross_im
    ),
    
    'observacao', jsonb_build_object(
      'texto', NEW.observacao_texto,
      'data', NEW.data_observacao,
      'intensidade', NEW.intensidade
    ),
    
    'contexto', jsonb_build_object(
      'institution_id', NEW.institution_id,
      'fase_id', NEW.fase_id,
      'fase_numero', v_fase.numero_fase,
      'turma_id', NEW.turma_id,
      'turma_completa', v_turma.nome
    )
  );

  -- Enviar para N8N via pg_net (assíncrono) e capturar request_id
  SELECT net.http_post(
    url := v_endpoint_url,
    body := v_payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  ) INTO v_request_id;

  -- Registrar no log de auditoria
  INSERT INTO public.webhook_n8n_logs (observacao_id, endpoint_url, request_id, payload)
  VALUES (NEW.id, v_endpoint_url, v_request_id, v_payload);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Salvar erro no log antes de falhar silenciosamente
  BEGIN
    INSERT INTO public.webhook_n8n_logs (observacao_id, endpoint_url, payload, error_msg)
    VALUES (NEW.id, v_endpoint_url, COALESCE(v_payload, '{}'::jsonb), SQLERRM);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignora erro no log
  END;
  
  RAISE WARNING 'Webhook N8N falhou: %', SQLERRM;
  RETURN NEW;
END;
$function$;
-- Corrigir função de webhook para usar JSONB diretamente (não TEXT)
CREATE OR REPLACE FUNCTION public.trigger_notificar_n8n_observacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_aluno RECORD;
  v_professor RECORD;
  v_sinal RECORD;
  v_payload JSONB;
BEGIN
  -- Buscar dados do aluno
  SELECT id, full_name, nome, serie, turma, casa_id
  INTO v_aluno
  FROM profiles
  WHERE id = NEW.aluno_id;

  -- Buscar dados do professor
  SELECT id, full_name, nome
  INTO v_professor
  FROM profiles
  WHERE id = NEW.professor_id;

  -- Buscar dados do sinal
  SELECT id, codigo, label_pt, valencia, pilar
  INTO v_sinal
  FROM sinais
  WHERE id = NEW.sinal_id;

  -- Montar payload JSON estruturado
  v_payload := jsonb_build_object(
    'evento', 'observacao_criada',
    'observacao_id', NEW.id,
    'timestamp', NEW.created_at,
    'aluno', jsonb_build_object(
      'id', v_aluno.id,
      'nome', COALESCE(v_aluno.full_name, v_aluno.nome),
      'serie', v_aluno.serie,
      'turma', v_aluno.turma,
      'casa_id', v_aluno.casa_id
    ),
    'professor', jsonb_build_object(
      'id', v_professor.id,
      'nome', COALESCE(v_professor.full_name, v_professor.nome)
    ),
    'sinal', jsonb_build_object(
      'id', v_sinal.id,
      'codigo', v_sinal.codigo,
      'label', v_sinal.label_pt,
      'valencia', v_sinal.valencia,
      'pilar', v_sinal.pilar
    ),
    'inteligencias', jsonb_build_object(
      'expressa', NEW.inteligencia_expressa,
      'fase', NEW.inteligencia_fase,
      'foi_cross_im', NEW.foi_cross_im
    ),
    'texto', NEW.observacao_texto,
    'data_observacao', NEW.data_observacao,
    'institution_id', NEW.institution_id,
    'fase_id', NEW.fase_id,
    'turma_id', NEW.turma_id
  );

  -- Enviar para N8N via pg_net (assíncrono) - CORREÇÃO: body como JSONB direto
  PERFORM net.http_post(
    url := 'https://n8n.escolaamadeus.com/webhook-test/projetoarboria',
    body := v_payload,  -- ✅ JSONB direto, não TEXT
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Falha silenciosa - não bloqueia o registro da observação
  RAISE WARNING 'Webhook N8N falhou: %', SQLERRM;
  RETURN NEW;
END;
$function$;
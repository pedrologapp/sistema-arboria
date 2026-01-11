
-- ═══════════════════════════════════════════════════════════════════
-- PARTE 1: Criar VIEW vw_estados_alunos (estados em tempo real)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vw_estados_alunos AS
WITH ultimas_obs AS (
  SELECT 
    o.aluno_id,
    s.valencia as tipo_sinal,
    s.label_pt as sinal,
    s.codigo as sinal_codigo,
    o.created_at,
    ROW_NUMBER() OVER (PARTITION BY o.aluno_id ORDER BY o.created_at DESC) as rn
  FROM observacoes o
  JOIN sinais s ON s.id = o.sinal_id
)
SELECT 
  p.id as aluno_id,
  p.nome,
  p.sobrenome,
  p.full_name,
  p.serie,
  p.turma,
  p.casa_id,
  i.nome as casa_nome,
  i.cor_hex as casa_cor,
  p.institution_id,
  p.avatar_url,
  u1.tipo_sinal as ultima_tipo,
  u1.sinal as ultima_sinal,
  u1.sinal_codigo as ultimo_sinal_codigo,
  u2.tipo_sinal as penultima_tipo,
  u2.sinal as penultima_sinal,
  u2.sinal_codigo as penultimo_sinal_codigo,
  CASE
    WHEN u1.tipo_sinal IS NULL THEN 'sem_observacao'
    WHEN u2.tipo_sinal IS NULL THEN 'primeira_obs'
    WHEN u1.tipo_sinal = 'atencao' AND u2.tipo_sinal = 'atencao' THEN 'precisa_atencao'
    WHEN u1.tipo_sinal = 'positivo' AND u2.tipo_sinal = 'positivo' THEN 'celebrar'
    WHEN u1.tipo_sinal = 'atencao' AND u2.tipo_sinal = 'positivo' THEN 'atencao_recente'
    WHEN u1.tipo_sinal = 'positivo' AND u2.tipo_sinal = 'atencao' THEN 'melhorando'
    ELSE 'neutro'
  END as estado_calculado,
  u1.created_at as data_ultima_obs
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'user'
LEFT JOIN inteligencias i ON i.id = p.casa_id
LEFT JOIN ultimas_obs u1 ON p.id = u1.aluno_id AND u1.rn = 1
LEFT JOIN ultimas_obs u2 ON p.id = u2.aluno_id AND u2.rn = 2;

-- ═══════════════════════════════════════════════════════════════════
-- PARTE 2: Função helper para buscar estados da casa do professor
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_estados_alunos_minha_casa(
  p_serie smallint DEFAULT NULL,
  p_turma_letra text DEFAULT NULL,
  p_estado text DEFAULT NULL
)
RETURNS TABLE (
  aluno_id uuid,
  nome text,
  sobrenome text,
  full_name text,
  serie text,
  turma text,
  casa_id smallint,
  casa_nome text,
  casa_cor text,
  avatar_url text,
  estado_calculado text,
  ultima_sinal text,
  penultima_sinal text,
  data_ultima_obs timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_minha_casa_id smallint;
  v_minha_institution_id uuid;
BEGIN
  -- Buscar casa do professor
  SELECT pc.casa_id, pc.institution_id 
  INTO v_minha_casa_id, v_minha_institution_id
  FROM professor_casa pc
  WHERE pc.professor_id = auth.uid() 
  AND pc.ativo = true
  LIMIT 1;
  
  IF v_minha_casa_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    v.aluno_id,
    v.nome,
    v.sobrenome,
    v.full_name,
    v.serie,
    v.turma,
    v.casa_id,
    v.casa_nome,
    v.casa_cor,
    v.avatar_url,
    v.estado_calculado,
    v.ultima_sinal,
    v.penultima_sinal,
    v.data_ultima_obs
  FROM vw_estados_alunos v
  WHERE v.institution_id = v_minha_institution_id
    AND v.casa_id = v_minha_casa_id
    AND (p_serie IS NULL OR CAST(REGEXP_REPLACE(v.serie, '[^0-9]', '', 'g') AS smallint) = p_serie)
    AND (p_turma_letra IS NULL OR UPPER(TRIM(v.turma)) = UPPER(TRIM(p_turma_letra)))
    AND (p_estado IS NULL OR v.estado_calculado = p_estado)
  ORDER BY 
    CASE v.estado_calculado
      WHEN 'precisa_atencao' THEN 1
      WHEN 'atencao_recente' THEN 2
      WHEN 'melhorando' THEN 3
      WHEN 'celebrar' THEN 4
      WHEN 'primeira_obs' THEN 5
      WHEN 'sem_observacao' THEN 6
      ELSE 7
    END,
    v.nome;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- PARTE 3: Habilitar pg_net para chamadas HTTP assíncronas
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ═══════════════════════════════════════════════════════════════════
-- PARTE 4: Criar trigger que chama edge function após cada observação
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION trigger_chamar_analise_observacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Chamar edge function assincronamente via pg_net
  PERFORM net.http_post(
    url := 'https://uoxcnkqjxthivsvxqonj.supabase.co/functions/v1/analisar-observacoes',
    body := jsonb_build_object('aluno_id', NEW.aluno_id)::text,
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the trigger
  RAISE WARNING 'Failed to call analisar-observacoes: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trg_analisar_apos_observacao ON observacoes;

-- Criar o trigger
CREATE TRIGGER trg_analisar_apos_observacao
  AFTER INSERT ON observacoes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_chamar_analise_observacao();

-- ═══════════════════════════════════════════════════════════════════
-- PARTE 5: Função para contagem de estados (para badges/filtros)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_contagem_estados_minha_casa()
RETURNS TABLE (
  estado text,
  quantidade bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_minha_casa_id smallint;
  v_minha_institution_id uuid;
BEGIN
  -- Buscar casa do professor
  SELECT pc.casa_id, pc.institution_id 
  INTO v_minha_casa_id, v_minha_institution_id
  FROM professor_casa pc
  WHERE pc.professor_id = auth.uid() 
  AND pc.ativo = true
  LIMIT 1;
  
  IF v_minha_casa_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    v.estado_calculado as estado,
    COUNT(*) as quantidade
  FROM vw_estados_alunos v
  WHERE v.institution_id = v_minha_institution_id
    AND v.casa_id = v_minha_casa_id
  GROUP BY v.estado_calculado;
END;
$$;

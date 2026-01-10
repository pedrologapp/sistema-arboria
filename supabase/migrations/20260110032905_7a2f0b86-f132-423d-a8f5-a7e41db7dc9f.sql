-- Dropar função existente para recriar com correção de série
DROP FUNCTION IF EXISTS public.get_missoes_do_aluno(uuid);

-- Recriar com comparação de série corrigida
CREATE OR REPLACE FUNCTION public.get_missoes_do_aluno(p_aluno_id uuid)
RETURNS TABLE(
  id uuid,
  titulo text,
  descricao text,
  tipo text,
  pontos_base integer,
  data_liberacao timestamp with time zone,
  data_prazo timestamp with time zone,
  requer_texto boolean,
  requer_arquivo boolean,
  permite_atrasada boolean,
  casa_id integer,
  casa_nome text,
  casa_emoji text,
  casa_cor text,
  ja_entregou boolean,
  status_entrega text,
  atrasada boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_now timestamp with time zone := now();
  v_serie_num smallint;  -- Variável para série numérica extraída
BEGIN
  -- Buscar perfil do aluno
  SELECT 
    p.id,
    p.institution_id,
    p.casa_id,
    COALESCE(p.serie, '') as serie,
    COALESCE(p.turma, '') as turma
  INTO v_profile
  FROM profiles p
  WHERE p.id = p_aluno_id;

  IF v_profile IS NULL THEN
    RETURN;
  END IF;

  -- Extrair número da série (ex: "6º ano" → 6, "7º" → 7)
  v_serie_num := NULLIF(REGEXP_REPLACE(v_profile.serie, '[^0-9]', '', 'g'), '')::smallint;

  RETURN QUERY
  SELECT 
    m.id,
    m.titulo,
    m.descricao,
    m.tipo,
    m.pontos_base::integer,
    m.data_liberacao,
    m.data_prazo,
    COALESCE(m.requer_texto, false) as requer_texto,
    COALESCE(m.requer_arquivo, false) as requer_arquivo,
    COALESCE(m.permite_entrega_atrasada, false) as permite_atrasada,
    i.id::integer as casa_id,
    i.nome as casa_nome,
    i.emoji as casa_emoji,
    i.cor_hex as casa_cor,
    EXISTS(
      SELECT 1 FROM entregas e 
      WHERE e.missao_id = m.id AND e.aluno_id = p_aluno_id
    ) as ja_entregou,
    COALESCE(
      (SELECT e.status FROM entregas e 
       WHERE e.missao_id = m.id AND e.aluno_id = p_aluno_id 
       ORDER BY e.created_at DESC LIMIT 1),
      'pendente'
    ) as status_entrega,
    (m.data_prazo < v_now) as atrasada
  FROM missoes m
  LEFT JOIN inteligencias i ON i.id = m.casa_id
  WHERE 
    -- Mesma instituição
    m.institution_id = v_profile.institution_id
    -- Status liberada
    AND m.status = 'liberada'
    -- Já passou da data de liberação
    AND m.data_liberacao <= v_now
    -- Filtro de série CORRIGIDO: compara smallint com smallint
    AND (
      m.serie_filtro IS NULL 
      OR m.serie_filtro = v_serie_num
    )
    -- Filtro de turma
    AND (
      m.turma_filtro IS NULL 
      OR m.turma_filtro = '' 
      OR UPPER(TRIM(v_profile.turma)) = ANY(
        SELECT UPPER(TRIM(t)) 
        FROM unnest(string_to_array(m.turma_filtro, ',')) AS t
      )
    )
    -- Lógica de visibilidade
    AND (
      -- 1. Missão global
      (
        m.casa_id IS NULL 
        AND COALESCE(m.para_todos_da_casa, true) = true
        AND NOT EXISTS(SELECT 1 FROM missao_destinatarios md WHERE md.missao_id = m.id)
      )
      OR
      -- 2. Missão da casa do aluno
      (
        m.casa_id = v_profile.casa_id 
        AND COALESCE(m.para_todos_da_casa, true) = true
      )
      OR
      -- 3. Aluno é destinatário específico
      EXISTS(
        SELECT 1 FROM missao_destinatarios md 
        WHERE md.missao_id = m.id AND md.aluno_id = p_aluno_id
      )
    )
  ORDER BY 
    CASE 
      WHEN NOT EXISTS(SELECT 1 FROM entregas e WHERE e.missao_id = m.id AND e.aluno_id = p_aluno_id) 
           AND m.data_prazo >= v_now THEN 0
      WHEN NOT EXISTS(SELECT 1 FROM entregas e WHERE e.missao_id = m.id AND e.aluno_id = p_aluno_id) 
           AND m.data_prazo < v_now THEN 1
      ELSE 2
    END,
    m.data_prazo ASC;
END;
$$;
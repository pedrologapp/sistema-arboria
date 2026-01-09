-- Função para buscar missões visíveis para um aluno específico
-- Aplica todos os filtros de destinação e retorna status de entrega

CREATE OR REPLACE FUNCTION get_missoes_do_aluno(p_aluno_id uuid)
RETURNS TABLE(
  id uuid,
  titulo text,
  descricao text,
  tipo text,
  pontos_base smallint,
  data_prazo timestamptz,
  data_liberacao timestamptz,
  requer_arquivo boolean,
  requer_texto boolean,
  permite_atrasada boolean,
  casa_id smallint,
  casa_nome text,
  casa_emoji text,
  casa_cor text,
  status_entrega text,
  ja_entregou boolean,
  atrasada boolean
) AS $$
DECLARE
  v_profile record;
  v_serie_num smallint;
BEGIN
  -- Buscar dados do aluno
  SELECT p.institution_id, p.casa_id, p.serie, p.turma
  INTO v_profile
  FROM profiles p
  WHERE p.id = p_aluno_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aluno não encontrado: %', p_aluno_id;
  END IF;

  -- Converter série para número (ex: "6º" -> 6)
  v_serie_num := CAST(NULLIF(REGEXP_REPLACE(COALESCE(v_profile.serie, ''), '[^0-9]', '', 'g'), '') AS smallint);

  RETURN QUERY
  SELECT 
    m.id,
    m.titulo,
    m.descricao,
    m.tipo,
    m.pontos_base,
    m.data_prazo,
    m.data_liberacao,
    COALESCE(m.requer_arquivo, false),
    COALESCE(m.requer_texto, true),
    COALESCE(m.permite_entrega_atrasada, false),
    m.casa_id,
    i.nome as casa_nome,
    i.emoji as casa_emoji,
    i.cor_hex as casa_cor,
    COALESCE(e.status, 'pendente') as status_entrega,
    (e.id IS NOT NULL) as ja_entregou,
    (m.data_prazo < now()) as atrasada
  FROM missoes m
  LEFT JOIN inteligencias i ON i.id = m.casa_id
  LEFT JOIN entregas e ON e.missao_id = m.id AND e.aluno_id = p_aluno_id
  WHERE 
    -- Mesma instituição
    m.institution_id = v_profile.institution_id
    -- Status liberada
    AND m.status = 'liberada'
    -- Já foi liberada
    AND m.data_liberacao <= now()
    -- Lógica de destinação (REGRA CRÍTICA)
    AND (
      -- GLOBAL: para todos da instituição (casa_id NULL e serie_filtro NULL)
      (m.casa_id IS NULL AND m.serie_filtro IS NULL)
      OR
      -- CASA DO ALUNO com filtros opcionais de série/turma
      (
        m.casa_id = v_profile.casa_id
        AND (m.serie_filtro IS NULL OR m.serie_filtro = v_serie_num)
        AND (m.turma_filtro IS NULL OR UPPER(TRIM(m.turma_filtro)) = UPPER(TRIM(v_profile.turma)))
      )
      OR
      -- DESTINATÁRIO MANUAL (aluno foi adicionado explicitamente)
      EXISTS (
        SELECT 1 FROM missao_destinatarios md
        WHERE md.missao_id = m.id AND md.aluno_id = p_aluno_id
      )
    )
  ORDER BY 
    -- Primeiro: não entregues e não atrasadas (urgentes)
    -- Segundo: não entregues mas atrasadas
    -- Terceiro: já entregues
    CASE 
      WHEN e.id IS NULL AND m.data_prazo >= now() THEN 0
      WHEN e.id IS NULL AND m.data_prazo < now() THEN 1
      ELSE 2 
    END,
    m.data_prazo ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
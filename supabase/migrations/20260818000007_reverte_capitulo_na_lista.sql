-- ============================================================
-- REVERTE: missao de capitulo volta a NAO aparecer na lista do aluno
--
-- Ordem do Fundador em 18/08: as missoes de capitulo saem da lista e da home e
-- continuam vivas dentro do Capitulo, que e a rota por onde os alunos sempre
-- chegaram nelas (as 112 entregas foram feitas assim). Nada e apagado e nenhuma
-- entrega e tocada: some so da listagem.
--
-- Isto desfaz o terceiro ramo criado em 20260818000006. A missao da 2a fase da
-- Arena NAO e afetada: ela nao tem capitulo, entra pelo ramo das missoes
-- normais via missao_destinatarios, e segue no pop-up e no cartao da home.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_missoes_do_aluno(p_aluno_id uuid)
 RETURNS TABLE(id uuid, titulo text, descricao text, tipo text, pontos_base integer, data_liberacao timestamp with time zone, data_prazo timestamp with time zone, requer_texto boolean, requer_arquivo boolean, permite_atrasada boolean, casa_id integer, casa_nome text, casa_emoji text, casa_cor text, ja_entregou boolean, status_entrega text, atrasada boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD;
  v_now timestamp with time zone := now();
  v_serie_num smallint;
BEGIN
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

  v_serie_num := NULLIF(REGEXP_REPLACE(v_profile.serie, '[^0-9]', '', 'g'), '')::smallint;

  RETURN QUERY
  SELECT
    m.id,
    m.titulo,
    m.descricao,
    m.tipo,
    m.pontos_base::integer,
    m.data_liberacao,
    COALESCE(
      (SELECT ctc.missoes_data_prazo
       FROM capitulo_turma_config ctc
       JOIN aluno_turma at2 ON at2.turma_id = ctc.turma_id AND at2.aluno_id = p_aluno_id AND at2.ativo = true
       WHERE ctc.capitulo_id = m.capitulo_id
       LIMIT 1),
      m.data_prazo
    ) as data_prazo,
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
    (
      COALESCE(
        (SELECT ctc.missoes_data_prazo
         FROM capitulo_turma_config ctc
         JOIN aluno_turma at2 ON at2.turma_id = ctc.turma_id AND at2.aluno_id = p_aluno_id AND at2.ativo = true
         WHERE ctc.capitulo_id = m.capitulo_id
         LIMIT 1),
        m.data_prazo
      ) < v_now
    ) as atrasada
  FROM missoes m
  LEFT JOIN inteligencias i ON i.id = m.casa_id
  WHERE
    m.institution_id = v_profile.institution_id
    AND m.status = 'liberada'
    AND m.data_liberacao <= v_now
    AND (
      -- ===================== MISSOES DO CAPITULO =====================
      (
        m.capitulo_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM capitulo_turma_config ctc
          JOIN aluno_turma at3 ON at3.turma_id = ctc.turma_id AND at3.aluno_id = p_aluno_id AND at3.ativo = true
          WHERE ctc.capitulo_id = m.capitulo_id
            AND ctc.missoes_liberadas_em IS NOT NULL
        )
        AND (
          -- por cargo
          (m.papel_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM capitulo_alocacoes ca
            WHERE ca.capitulo_id = m.capitulo_id
              AND ca.papel_id = m.papel_id
              AND ca.aluno_id = p_aluno_id
          ))
          OR
          -- membro de delegacao
          (m.para_membros_delegacao = true AND EXISTS (
            SELECT 1 FROM capitulo_delegacao_membros cdm
            WHERE cdm.capitulo_id = m.capitulo_id
              AND cdm.aluno_id = p_aluno_id
          ))
        )
      )
      OR
      -- ===================== MISSOES NORMAIS (fase) =====================
      (
        m.capitulo_id IS NULL
        AND (
          m.serie_filtro IS NULL
          OR m.serie_filtro = v_serie_num
        )
        AND (
          m.turma_filtro IS NULL
          OR m.turma_filtro = ''
          OR UPPER(TRIM(v_profile.turma)) = ANY(
            SELECT UPPER(TRIM(t))
            FROM unnest(string_to_array(m.turma_filtro, ',')) AS t
          )
        )
        AND (
          m.fase_id IS NULL
          OR EXISTS (
            SELECT 1 FROM fases f
            WHERE f.id = m.fase_id
              AND f.data_inicio <= v_now::date
              AND f.data_fim >= v_now::date
              AND (f.serie IS NULL OR f.serie = v_serie_num)
          )
        )
        AND (
          (
            m.casa_id IS NULL
            AND COALESCE(m.para_todos_da_casa, true) = true
            AND NOT EXISTS(SELECT 1 FROM missao_destinatarios md WHERE md.missao_id = m.id)
          )
          OR
          (
            m.casa_id = v_profile.casa_id
            AND COALESCE(m.para_todos_da_casa, true) = true
          )
          OR
          EXISTS(
            SELECT 1 FROM missao_destinatarios md
            WHERE md.missao_id = m.id AND md.aluno_id = p_aluno_id
          )
        )
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
$function$;


-- Confere: o Theo (6o B) volta a ver so a da 2a fase pela lista.
select titulo from public.get_missoes_do_aluno('53d55517-d271-495f-9ef5-0d55aece105b');

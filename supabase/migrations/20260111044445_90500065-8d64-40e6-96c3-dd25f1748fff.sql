-- ═══════════════════════════════════════════════════════════════════
-- CORREÇÃO: Lógica de Estados Exclusivos do Aluno
-- Regra: Estado é definido pelas 2 ÚLTIMAS observações
-- Aluno só pode ter UM tipo de alerta ativo por vez
-- ═══════════════════════════════════════════════════════════════════

-- 1. Adicionar 'arquivado' ao enum status_alerta (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'arquivado' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'status_alerta')
  ) THEN
    ALTER TYPE status_alerta ADD VALUE 'arquivado';
  END IF;
END $$;

-- 2. Arquivar alertas duplicados existentes (corrigir dados atuais)
-- Se aluno tem precisa_atencao ativo, arquivar celebrar
UPDATE alertas_alunos aa1
SET status = 'arquivado', updated_at = NOW()
WHERE aa1.tipo_alerta = 'celebrar'
  AND aa1.status = 'ativo'
  AND EXISTS (
    SELECT 1 FROM alertas_alunos aa2
    WHERE aa2.aluno_id = aa1.aluno_id
      AND aa2.tipo_alerta = 'precisa_atencao'
      AND aa2.status = 'ativo'
  );

-- 3. Reescrever função com nova lógica baseada nas 2 últimas observações
CREATE OR REPLACE FUNCTION public.analisar_e_gerar_alertas(p_aluno_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_institution_id UUID;
    v_fase_atual_id UUID;
    v_fase_inteligencia_id SMALLINT;
    v_casa_aluno_id SMALLINT;
    v_tipo_1 TEXT;
    v_tipo_2 TEXT;
    v_sinal_1 TEXT;
    v_sinal_2 TEXT;
    v_estado_atual TEXT;
    v_total_positivas INTEGER;
    v_tipo_celebracao TEXT;
    v_config_descoberta INTEGER;
    v_config_confirmacao INTEGER;
BEGIN
    -- Buscar dados do aluno (profiles)
    SELECT institution_id, casa_id INTO v_institution_id, v_casa_aluno_id
    FROM profiles WHERE id = p_aluno_id;
    
    IF v_institution_id IS NULL THEN RETURN; END IF;

    -- Buscar fase ativa da instituição
    SELECT id, inteligencia_id INTO v_fase_atual_id, v_fase_inteligencia_id
    FROM fases 
    WHERE institution_id = v_institution_id AND ativo = true
    LIMIT 1;

    -- Buscar configurações de thresholds
    SELECT COALESCE((SELECT valor FROM config_alertas WHERE chave = 'positivos_descoberta'), 3) INTO v_config_descoberta;
    SELECT COALESCE((SELECT valor FROM config_alertas WHERE chave = 'positivos_confirmacao'), 5) INTO v_config_confirmacao;

    -- ═══════════════════════════════════════════════════════════
    -- BUSCAR AS 2 ÚLTIMAS OBSERVAÇÕES
    -- ═══════════════════════════════════════════════════════════
    
    -- Última observação
    SELECT s.valencia, s.label_pt INTO v_tipo_1, v_sinal_1
    FROM observacoes o
    JOIN sinais s ON s.id = o.sinal_id
    WHERE o.aluno_id = p_aluno_id
    ORDER BY o.created_at DESC 
    LIMIT 1;

    -- Penúltima observação
    SELECT s.valencia, s.label_pt INTO v_tipo_2, v_sinal_2
    FROM observacoes o
    JOIN sinais s ON s.id = o.sinal_id
    WHERE o.aluno_id = p_aluno_id
    ORDER BY o.created_at DESC 
    OFFSET 1 LIMIT 1;

    -- Se não tem 2 observações ainda, não faz nada
    IF v_tipo_1 IS NULL OR v_tipo_2 IS NULL THEN
        RETURN;
    END IF;

    -- ═══════════════════════════════════════════════════════════
    -- DETERMINAR ESTADO BASEADO NAS 2 ÚLTIMAS
    -- ═══════════════════════════════════════════════════════════
    
    IF v_tipo_1 = 'atencao' AND v_tipo_2 = 'atencao' THEN
        -- 2 últimas são atenção → PRECISA DE ATENÇÃO
        v_estado_atual := 'precisa_atencao';
    ELSIF v_tipo_1 = 'positivo' AND v_tipo_2 = 'positivo' THEN
        -- 2 últimas são positivas → pode ser CELEBRAR
        v_estado_atual := 'celebrar';
    ELSE
        -- Misto (1 positivo, 1 atenção) → SEM ALERTA
        v_estado_atual := 'neutro';
    END IF;

    -- ═══════════════════════════════════════════════════════════
    -- ARQUIVAR ALERTAS QUE NÃO CORRESPONDEM AO ESTADO ATUAL
    -- ═══════════════════════════════════════════════════════════
    
    IF v_estado_atual = 'precisa_atencao' THEN
        -- Arquivar qualquer celebração ativa
        UPDATE alertas_alunos
        SET status = 'arquivado', updated_at = NOW()
        WHERE aluno_id = p_aluno_id
          AND tipo_alerta = 'celebrar'
          AND status = 'ativo';
          
    ELSIF v_estado_atual = 'celebrar' THEN
        -- Arquivar qualquer alerta de atenção
        UPDATE alertas_alunos
        SET status = 'arquivado', updated_at = NOW()
        WHERE aluno_id = p_aluno_id
          AND tipo_alerta = 'precisa_atencao'
          AND status = 'ativo';
          
    ELSE
        -- Estado neutro: arquivar AMBOS os tipos
        UPDATE alertas_alunos
        SET status = 'arquivado', updated_at = NOW()
        WHERE aluno_id = p_aluno_id
          AND tipo_alerta IN ('precisa_atencao', 'celebrar')
          AND status = 'ativo';
    END IF;

    -- ═══════════════════════════════════════════════════════════
    -- CRIAR/MANTER ALERTA DO ESTADO ATUAL
    -- ═══════════════════════════════════════════════════════════
    
    IF v_estado_atual = 'precisa_atencao' THEN
        -- Verificar se já existe alerta ativo de precisa_atencao
        IF NOT EXISTS (
            SELECT 1 FROM alertas_alunos
            WHERE aluno_id = p_aluno_id
              AND tipo_alerta = 'precisa_atencao'
              AND status = 'ativo'
        ) THEN
            -- Criar novo alerta
            INSERT INTO alertas_alunos (
                institution_id, aluno_id, tipo_alerta, motivo, status,
                notificacao_ativa, fase_id, dados_contexto
            ) VALUES (
                v_institution_id,
                p_aluno_id,
                'precisa_atencao',
                'ultimas_2_atencao',
                'ativo',
                true,
                v_fase_atual_id,
                jsonb_build_object(
                    'sinal_1', v_sinal_1,
                    'sinal_2', v_sinal_2,
                    'quantidade', 2
                )
            );
        ELSE
            -- Atualizar dados do alerta existente
            UPDATE alertas_alunos
            SET dados_contexto = jsonb_build_object(
                    'sinal_1', v_sinal_1,
                    'sinal_2', v_sinal_2,
                    'quantidade', 2
                ),
                updated_at = NOW()
            WHERE aluno_id = p_aluno_id
              AND tipo_alerta = 'precisa_atencao'
              AND status = 'ativo';
        END IF;

    ELSIF v_estado_atual = 'celebrar' THEN
        -- Contar positivas na fase para determinar descoberta/confirmação
        SELECT COUNT(*) INTO v_total_positivas
        FROM observacoes o
        JOIN sinais s ON s.id = o.sinal_id
        WHERE o.aluno_id = p_aluno_id
          AND o.fase_id = v_fase_atual_id
          AND s.valencia = 'positivo';

        -- Determinar tipo de celebração baseado em thresholds
        IF v_fase_inteligencia_id IS DISTINCT FROM v_casa_aluno_id AND v_total_positivas >= v_config_descoberta THEN
            v_tipo_celebracao := 'descoberta';
        ELSIF v_fase_inteligencia_id = v_casa_aluno_id AND v_total_positivas >= v_config_confirmacao THEN
            v_tipo_celebracao := 'confirmacao';
        ELSE
            v_tipo_celebracao := NULL; -- Ainda não atingiu threshold
        END IF;

        -- Criar alerta de celebração se atingiu threshold
        IF v_tipo_celebracao IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM alertas_alunos
                WHERE aluno_id = p_aluno_id
                  AND tipo_alerta = 'celebrar'
                  AND status = 'ativo'
            ) THEN
                INSERT INTO alertas_alunos (
                    institution_id, aluno_id, tipo_alerta, motivo, status,
                    notificacao_ativa, fase_id, dados_contexto
                ) VALUES (
                    v_institution_id,
                    p_aluno_id,
                    'celebrar',
                    v_tipo_celebracao,
                    'ativo',
                    true,
                    v_fase_atual_id,
                    jsonb_build_object(
                        'tipo_celebracao', v_tipo_celebracao,
                        'quantidade_positivos', v_total_positivas,
                        'casa_aluno_id', v_casa_aluno_id,
                        'fase_inteligencia_id', v_fase_inteligencia_id
                    )
                );
            END IF;
        END IF;
    END IF;
    -- Se estado é 'neutro', nenhum novo alerta é criado
END;
$$;
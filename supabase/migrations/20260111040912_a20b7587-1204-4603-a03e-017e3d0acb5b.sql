-- ═══════════════════════════════════════════════════════════════════
-- 1. ADICIONAR VALOR AO ENUM tipo_alerta
-- ═══════════════════════════════════════════════════════════════════

ALTER TYPE tipo_alerta ADD VALUE IF NOT EXISTS 'fase_anterior';

-- ═══════════════════════════════════════════════════════════════════
-- 2. CRIAR TABELA DE CONFIGURAÇÕES
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS config_alertas (
    chave TEXT PRIMARY KEY,
    valor INTEGER NOT NULL,
    descricao TEXT
);

INSERT INTO config_alertas (chave, valor, descricao) VALUES
('sinais_negativos_consecutivos', 3, 'Quantidade de sinais negativos consecutivos para gerar alerta'),
('dias_sem_observacao', 14, 'Dias sem observação para gerar lembrete'),
('positivos_descoberta', 3, 'Quantidade de positivos fora da casa para descoberta'),
('positivos_confirmacao', 5, 'Quantidade de positivos na casa para confirmação'),
('percentual_historico_positivo', 70, 'Percentual mínimo de histórico positivo para detectar mudança abrupta')
ON CONFLICT (chave) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- 3. FUNÇÃO PRINCIPAL: analisar_e_gerar_alertas
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION analisar_e_gerar_alertas(p_aluno_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_institution_id UUID;
    v_fase_atual_id UUID;
    v_fase_inteligencia_id SMALLINT;
    v_casa_aluno_id SMALLINT;
    v_contagem_negativas INTEGER;
    v_contagem_positivas INTEGER;
    v_sinal_predominante_id SMALLINT;
    v_sinal_predominante_label TEXT;
    v_sinal_predominante_codigo TEXT;
    v_alerta_existente UUID;
    v_historico_positivo NUMERIC;
    v_config_negativos INTEGER;
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

    -- Buscar configurações
    SELECT COALESCE((SELECT valor FROM config_alertas WHERE chave = 'sinais_negativos_consecutivos'), 3) INTO v_config_negativos;
    SELECT COALESCE((SELECT valor FROM config_alertas WHERE chave = 'positivos_descoberta'), 3) INTO v_config_descoberta;
    SELECT COALESCE((SELECT valor FROM config_alertas WHERE chave = 'positivos_confirmacao'), 5) INTO v_config_confirmacao;

    -- ═══════════════════════════════════════════════════════════
    -- DETECÇÃO 1: PADRÃO NEGATIVO CONSECUTIVO (3+ sinais de atenção)
    -- ═══════════════════════════════════════════════════════════
    
    -- Contar últimas 3 observações com valencia = 'atencao'
    SELECT COUNT(*) INTO v_contagem_negativas
    FROM (
        SELECT o.sinal_id
        FROM observacoes o
        JOIN sinais s ON s.id = o.sinal_id
        WHERE o.aluno_id = p_aluno_id
        ORDER BY o.created_at DESC
        LIMIT v_config_negativos
    ) ultimas
    JOIN sinais s ON s.id = ultimas.sinal_id
    WHERE s.valencia = 'atencao';

    -- Se últimas N são negativas, criar alerta
    IF v_contagem_negativas >= v_config_negativos THEN
        -- Buscar sinal mais frequente nas últimas observações negativas
        SELECT o.sinal_id, s.label_pt, s.codigo 
        INTO v_sinal_predominante_id, v_sinal_predominante_label, v_sinal_predominante_codigo
        FROM observacoes o
        JOIN sinais s ON s.id = o.sinal_id
        WHERE o.aluno_id = p_aluno_id AND s.valencia = 'atencao'
        GROUP BY o.sinal_id, s.label_pt, s.codigo
        ORDER BY COUNT(*) DESC, MAX(o.created_at) DESC
        LIMIT 1;

        -- Verificar se já existe alerta ativo
        SELECT id INTO v_alerta_existente
        FROM alertas_alunos
        WHERE aluno_id = p_aluno_id
          AND tipo_alerta = 'precisa_atencao'
          AND status IN ('ativo', 'em_acompanhamento');

        IF v_alerta_existente IS NULL THEN
            INSERT INTO alertas_alunos (
                institution_id, aluno_id, tipo_alerta, motivo, status, 
                notificacao_ativa, fase_id, dados_contexto
            ) VALUES (
                v_institution_id,
                p_aluno_id, 
                'precisa_atencao', 
                'padrao_negativo_consecutivo', 
                'ativo',
                true,
                v_fase_atual_id,
                jsonb_build_object(
                    'sinal_codigo', v_sinal_predominante_codigo,
                    'sinal_predominante', v_sinal_predominante_label,
                    'quantidade', v_contagem_negativas,
                    'padrao_codigo', 'mesmo_sinal_consecutivo'
                )
            );
        END IF;
    END IF;

    -- ═══════════════════════════════════════════════════════════
    -- DETECÇÃO 2: MUDANÇA ABRUPTA (era bom, ficou ruim)
    -- ═══════════════════════════════════════════════════════════
    
    SELECT 
        COALESCE(
            (COUNT(*) FILTER (WHERE s.valencia = 'positivo')::NUMERIC / 
             NULLIF(COUNT(*), 0) * 100), 0
        )
    INTO v_historico_positivo
    FROM observacoes o
    JOIN sinais s ON s.id = o.sinal_id
    WHERE o.aluno_id = p_aluno_id
      AND o.created_at > NOW() - INTERVAL '30 days'
      AND o.created_at < (
          SELECT created_at FROM observacoes 
          WHERE aluno_id = p_aluno_id 
          ORDER BY created_at DESC OFFSET 2 LIMIT 1
      );

    IF v_historico_positivo >= 70 AND v_contagem_negativas >= v_config_negativos THEN
        -- Atualizar alerta existente para indicar mudança abrupta
        UPDATE alertas_alunos
        SET dados_contexto = dados_contexto || 
            jsonb_build_object('padrao_codigo', 'mudanca_abrupta', 'historico_positivo_pct', v_historico_positivo)
        WHERE aluno_id = p_aluno_id
          AND tipo_alerta = 'precisa_atencao'
          AND status IN ('ativo', 'em_acompanhamento');
    END IF;

    -- ═══════════════════════════════════════════════════════════
    -- DETECÇÃO 3: DESCOBERTA (3+ positivos em fase ≠ casa)
    -- ═══════════════════════════════════════════════════════════
    
    IF v_fase_atual_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_contagem_positivas
        FROM observacoes o
        JOIN sinais s ON s.id = o.sinal_id
        WHERE o.aluno_id = p_aluno_id
          AND o.fase_id = v_fase_atual_id
          AND s.valencia = 'positivo';

        IF v_contagem_positivas >= v_config_descoberta AND v_fase_inteligencia_id IS DISTINCT FROM v_casa_aluno_id THEN
            SELECT id INTO v_alerta_existente
            FROM alertas_alunos
            WHERE aluno_id = p_aluno_id
              AND tipo_alerta = 'celebrar'
              AND fase_id = v_fase_atual_id
              AND dados_contexto->>'tipo_celebracao' = 'descoberta';

            IF v_alerta_existente IS NULL THEN
                INSERT INTO alertas_alunos (
                    institution_id, aluno_id, tipo_alerta, motivo, status,
                    notificacao_ativa, fase_id, dados_contexto
                ) VALUES (
                    v_institution_id,
                    p_aluno_id, 'celebrar', 'descoberta', 'ativo', true,
                    v_fase_atual_id,
                    jsonb_build_object(
                        'tipo_celebracao', 'descoberta',
                        'quantidade_positivos', v_contagem_positivas,
                        'casa_aluno_id', v_casa_aluno_id,
                        'fase_inteligencia_id', v_fase_inteligencia_id
                    )
                );
            END IF;
        END IF;

        -- ═══════════════════════════════════════════════════════════
        -- DETECÇÃO 4: CONFIRMAÇÃO (5+ positivos na casa do aluno)
        -- ═══════════════════════════════════════════════════════════
        
        IF v_contagem_positivas >= v_config_confirmacao AND v_fase_inteligencia_id = v_casa_aluno_id THEN
            SELECT id INTO v_alerta_existente
            FROM alertas_alunos
            WHERE aluno_id = p_aluno_id
              AND tipo_alerta = 'celebrar'
              AND fase_id = v_fase_atual_id
              AND dados_contexto->>'tipo_celebracao' = 'confirmacao';

            IF v_alerta_existente IS NULL THEN
                INSERT INTO alertas_alunos (
                    institution_id, aluno_id, tipo_alerta, motivo, status,
                    notificacao_ativa, fase_id, dados_contexto
                ) VALUES (
                    v_institution_id,
                    p_aluno_id, 'celebrar', 'confirmacao', 'ativo', true,
                    v_fase_atual_id,
                    jsonb_build_object(
                        'tipo_celebracao', 'confirmacao',
                        'quantidade_positivos', v_contagem_positivas,
                        'casa_aluno_id', v_casa_aluno_id
                    )
                );
            END IF;
        END IF;
    END IF;

END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 4. TRIGGER: Executar análise após cada observação
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION trigger_analisar_observacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    PERFORM analisar_e_gerar_alertas(NEW.aluno_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_analisar_observacao ON observacoes;
CREATE TRIGGER trg_analisar_observacao
AFTER INSERT ON observacoes
FOR EACH ROW
EXECUTE FUNCTION trigger_analisar_observacao();

-- ═══════════════════════════════════════════════════════════════════
-- 5. TRIGGER: Resolver "Não Esqueça" automaticamente
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION resolver_nao_esqueca()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    UPDATE alertas_alunos
    SET status = 'resolvido', resolved_at = NOW()
    WHERE aluno_id = NEW.aluno_id
      AND tipo_alerta = 'nao_esquecer'
      AND status = 'ativo';
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resolver_nao_esqueca ON observacoes;
CREATE TRIGGER trg_resolver_nao_esqueca
AFTER INSERT ON observacoes
FOR EACH ROW
EXECUTE FUNCTION resolver_nao_esqueca();

-- ═══════════════════════════════════════════════════════════════════
-- 6. FUNÇÃO: Migrar alertas da fase anterior
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION migrar_alertas_fase_anterior(
    p_fase_anterior_id UUID,
    p_fase_nova_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE alertas_alunos
    SET tipo_alerta = 'fase_anterior',
        fase_origem_id = fase_id,
        fase_id = p_fase_nova_id,
        dados_contexto = dados_contexto || 
            jsonb_build_object('migrado_de_fase', p_fase_anterior_id)
    WHERE fase_id = p_fase_anterior_id
      AND tipo_alerta = 'precisa_atencao'
      AND status IN ('ativo', 'em_acompanhamento');
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;
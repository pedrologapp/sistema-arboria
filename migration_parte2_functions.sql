-- ============================================================================
-- 4. FUNCOES CORE
-- ============================================================================

-- 4.1 has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4.2 get_user_institution_id
CREATE OR REPLACE FUNCTION public.get_user_institution_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT institution_id FROM profiles WHERE id = auth.uid()
$$;

-- 4.3 update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 4.4 handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, sobrenome, full_name, must_change_password)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'nome',
    NEW.raw_user_meta_data ->> 'sobrenome',
    COALESCE(NEW.raw_user_meta_data ->> 'full_name',
      CONCAT_WS(' ', NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'sobrenome')),
    COALESCE((NEW.raw_user_meta_data ->> 'must_change_password')::boolean, true)
  );
  RETURN NEW;
END;
$$;

-- 4.5 get_professor_turma_ids
CREATE OR REPLACE FUNCTION public.get_professor_turma_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(ARRAY_AGG(turma_id), ARRAY[]::UUID[])
  FROM public.professor_turma
  WHERE professor_id = auth.uid() AND ativo = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- 4.6 user_participa_conversa
CREATE OR REPLACE FUNCTION public.user_participa_conversa(p_conversa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversa_participantes
    WHERE conversa_id = p_conversa_id
    AND usuario_id = auth.uid()
  )
$$;

-- 4.7 pode_acessar_conselho
CREATE OR REPLACE FUNCTION public.pode_acessar_conselho(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.cargos_casa WHERE aluno_id = p_user_id AND cargo = 'lider' AND ativo = true
  )
$$;

-- 4.8 pode_acessar_lideranca_casa
CREATE OR REPLACE FUNCTION public.pode_acessar_lideranca_casa(p_user_id UUID, p_casa_id SMALLINT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.cargos_casa
    WHERE aluno_id = p_user_id
      AND casa_id = p_casa_id
      AND cargo IN ('lider', 'coordenador')
      AND ativo = true
  )
  OR EXISTS (
    SELECT 1 FROM public.professor_casa
    WHERE professor_id = p_user_id
      AND casa_id = p_casa_id
      AND ativo = true
  )
$$;

-- 4.9 create_default_institution_settings
CREATE OR REPLACE FUNCTION public.create_default_institution_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.institution_settings (institution_id)
  VALUES (NEW.id)
  ON CONFLICT (institution_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.10 sync_casa_to_casa_id
CREATE OR REPLACE FUNCTION public.sync_casa_to_casa_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.casa IS NOT NULL AND NEW.casa_id IS NULL THEN
    SELECT id INTO NEW.casa_id
    FROM public.inteligencias
    WHERE LOWER(TRIM(nome)) = LOWER(TRIM(NEW.casa))
       OR LOWER(TRIM(codigo)) = LOWER(TRIM(REPLACE(REPLACE(NEW.casa, '-', '_'), ' ', '_')));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 4.11 protect_casa_id_change
CREATE OR REPLACE FUNCTION public.protect_casa_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.casa_id IS NOT DISTINCT FROM NEW.casa_id THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Apenas administradores podem alterar a Casa do usuario';
END;
$$;

-- 4.12 ensure_turma_exists (5 args com segmento)
CREATE OR REPLACE FUNCTION public.ensure_turma_exists(
  p_institution_id UUID, p_serie TEXT, p_turma_letra TEXT,
  p_ano_letivo SMALLINT, p_segmento TEXT DEFAULT 'fundamental2'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_turma_id UUID;
  v_nome TEXT;
BEGIN
  SELECT id INTO v_turma_id
  FROM public.turmas
  WHERE institution_id = p_institution_id
    AND serie = p_serie
    AND UPPER(TRIM(turma_letra)) = UPPER(TRIM(p_turma_letra))
    AND ano_letivo = p_ano_letivo
    AND segmento = p_segmento;

  IF v_turma_id IS NULL THEN
    IF p_segmento = 'infantil' THEN
      v_nome := p_serie || ' ' || UPPER(TRIM(p_turma_letra));
    ELSE
      v_nome := p_serie || 'o ' || UPPER(TRIM(p_turma_letra));
    END IF;

    INSERT INTO public.turmas (institution_id, nome, serie, turma_letra, ano_letivo, segmento)
    VALUES (
      p_institution_id, v_nome, p_serie,
      UPPER(TRIM(p_turma_letra)), p_ano_letivo, p_segmento
    )
    RETURNING id INTO v_turma_id;
  END IF;

  RETURN v_turma_id;
END;
$$;

-- 4.13 sync_profile_to_aluno_turma
CREATE OR REPLACE FUNCTION public.sync_profile_to_aluno_turma()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_turma_id UUID;
  v_ano_letivo SMALLINT;
  v_is_aluno BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.id AND role = 'user'
  ) INTO v_is_aluno;

  IF NOT v_is_aluno OR NEW.serie IS NULL OR NEW.turma IS NULL OR NEW.institution_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(ano_letivo_atual, EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT)
  INTO v_ano_letivo
  FROM public.institution_settings
  WHERE institution_id = NEW.institution_id;

  IF v_ano_letivo IS NULL THEN
    v_ano_letivo := EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT;
  END IF;

  v_turma_id := public.ensure_turma_exists(
    NEW.institution_id, NEW.serie, NEW.turma, v_ano_letivo,
    COALESCE(NEW.segmento, 'fundamental2')
  );

  INSERT INTO public.aluno_turma (aluno_id, turma_id, ano_letivo, ativo)
  VALUES (NEW.id, v_turma_id, v_ano_letivo, true)
  ON CONFLICT (aluno_id, turma_id, ano_letivo)
  DO UPDATE SET ativo = true;

  RETURN NEW;
END;
$$;

-- 4.14 sync_user_role_to_aluno_turma
CREATE OR REPLACE FUNCTION public.sync_user_role_to_aluno_turma()
RETURNS TRIGGER AS $$
DECLARE
  v_profile RECORD;
  v_turma_id UUID;
  v_ano_letivo SMALLINT;
BEGIN
  IF NEW.role != 'user' THEN RETURN NEW; END IF;

  SELECT id, serie, turma, institution_id, segmento
  INTO v_profile FROM public.profiles WHERE id = NEW.user_id;

  IF v_profile.serie IS NULL OR v_profile.turma IS NULL OR v_profile.institution_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(ano_letivo_atual, EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT)
  INTO v_ano_letivo FROM public.institution_settings
  WHERE institution_id = v_profile.institution_id;

  IF v_ano_letivo IS NULL THEN
    v_ano_letivo := EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT;
  END IF;

  v_turma_id := public.ensure_turma_exists(
    v_profile.institution_id, v_profile.serie, v_profile.turma,
    v_ano_letivo, COALESCE(v_profile.segmento, 'fundamental2')
  );

  INSERT INTO public.aluno_turma (aluno_id, turma_id, ano_letivo, ativo)
  VALUES (v_profile.id, v_turma_id, v_ano_letivo, true)
  ON CONFLICT (aluno_id, turma_id, ano_letivo) DO UPDATE SET ativo = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.15 get_alunos_minha_casa
CREATE OR REPLACE FUNCTION public.get_alunos_minha_casa(
  p_serie SMALLINT DEFAULT NULL,
  p_turma_letra TEXT DEFAULT NULL
)
RETURNS TABLE (
  aluno_id UUID, nome TEXT, sobrenome TEXT, full_name TEXT,
  casa_id SMALLINT, casa_nome TEXT, serie TEXT, turma TEXT
) AS $$
DECLARE
  v_minha_casa_id SMALLINT;
  v_minha_institution_id UUID;
BEGIN
  SELECT pc.casa_id, pc.institution_id
  INTO v_minha_casa_id, v_minha_institution_id
  FROM public.professor_casa pc
  WHERE pc.professor_id = auth.uid() AND pc.ativo = true
  LIMIT 1;

  IF v_minha_casa_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    p.id as aluno_id, p.nome, p.sobrenome, p.full_name,
    p.casa_id, i.nome as casa_nome, p.serie, p.turma
  FROM public.profiles p
  JOIN public.inteligencias i ON i.id = p.casa_id
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'user'
  WHERE p.institution_id = v_minha_institution_id
    AND p.casa_id = v_minha_casa_id
    AND (p_serie IS NULL OR CAST(REGEXP_REPLACE(p.serie, '[^0-9]', '', 'g') AS SMALLINT) = p_serie)
    AND (p_turma_letra IS NULL OR UPPER(TRIM(p.turma)) = UPPER(TRIM(p_turma_letra)))
  ORDER BY p.serie, p.turma, p.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.16 inicializar_scores_aluno
CREATE OR REPLACE FUNCTION public.inicializar_scores_aluno()
RETURNS TRIGGER AS $$
DECLARE
  v_ano_letivo SMALLINT;
  v_im RECORD;
BEGIN
  IF NEW.casa_id IS NOT NULL THEN
    SELECT COALESCE(ano_letivo_atual, EXTRACT(YEAR FROM NOW())::SMALLINT)
    INTO v_ano_letivo
    FROM public.institution_settings
    WHERE institution_id = NEW.institution_id;

    IF v_ano_letivo IS NULL THEN
      v_ano_letivo := EXTRACT(YEAR FROM NOW())::SMALLINT;
    END IF;

    FOR v_im IN SELECT id FROM public.inteligencias ORDER BY id LOOP
      INSERT INTO public.inteligencia_scores (aluno_id, inteligencia_id, score_atual, ano_letivo)
      VALUES (NEW.id, v_im.id, 35.00, v_ano_letivo)
      ON CONFLICT (aluno_id, inteligencia_id, ano_letivo) DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.17 registrar_ajuste_score
CREATE OR REPLACE FUNCTION public.registrar_ajuste_score()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.score_atual IS DISTINCT FROM NEW.score_atual THEN
    INSERT INTO public.score_ajustes_log (
      institution_id, aluno_id, inteligencia_id,
      score_anterior, score_novo, motivo, ajustado_por
    ) VALUES (
      (SELECT institution_id FROM public.profiles WHERE id = NEW.aluno_id),
      NEW.aluno_id, NEW.inteligencia_id,
      OLD.score_atual, NEW.score_atual,
      COALESCE(current_setting('app.motivo_ajuste', true), 'Fechamento de fase'),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.18 processar_entrega_aprovada
CREATE OR REPLACE FUNCTION public.processar_entrega_aprovada()
RETURNS TRIGGER AS $$
DECLARE
  v_missao RECORD;
  v_aluno RECORD;
  v_pontos_calculados SMALLINT;
  v_tipo_evidencia TEXT;
  v_peso SMALLINT;
BEGIN
  IF NEW.status = 'aprovada' AND (OLD.status IS NULL OR OLD.status <> 'aprovada') THEN
    SELECT m.*, f.inteligencia_id as fase_im INTO v_missao
    FROM missoes m LEFT JOIN fases f ON f.id = m.fase_id
    WHERE m.id = NEW.missao_id;

    SELECT p.*, COALESCE(s.ano_letivo_atual, 2025) as ano_letivo INTO v_aluno
    FROM profiles p LEFT JOIN institution_settings s ON s.institution_id = p.institution_id
    WHERE p.id = NEW.aluno_id;

    v_pontos_calculados := ROUND((NEW.nota::DECIMAL / 10) * v_missao.pontos_base);
    NEW.pontos_concedidos := v_pontos_calculados;

    INSERT INTO pontos_gerais (
      institution_id, aluno_id, casa_id, tipo,
      missao_id, entrega_id, pontos, descricao,
      concedido_por, ano_letivo
    ) VALUES (
      v_missao.institution_id, NEW.aluno_id, v_aluno.casa_id, 'missao',
      NEW.missao_id, NEW.id, v_pontos_calculados,
      'Missao: ' || v_missao.titulo, NEW.avaliado_por, v_aluno.ano_letivo
    );

    IF v_missao.fase_id IS NOT NULL THEN
      IF v_missao.fase_im = v_aluno.casa_id THEN
        v_tipo_evidencia := 'missao_propria'; v_peso := 2;
      ELSE
        v_tipo_evidencia := 'missao_cross'; v_peso := 1;
      END IF;

      INSERT INTO inteligencia_evidencias (
        aluno_id, inteligencia_id, tipo, peso,
        pontos, entrega_id, fase_id, ano_letivo
      ) VALUES (
        NEW.aluno_id, v_aluno.casa_id, v_tipo_evidencia, v_peso,
        NEW.nota * (v_peso::DECIMAL / 10), NEW.id,
        v_missao.fase_id, v_aluno.ano_letivo
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.19 processar_observacao
CREATE OR REPLACE FUNCTION public.processar_observacao()
RETURNS TRIGGER AS $$
DECLARE
  v_sinal RECORD;
  v_fase RECORD;
  v_tipo TEXT;
  v_peso SMALLINT;
  v_pontos DECIMAL;
  v_ano_letivo SMALLINT;
BEGIN
  SELECT * INTO v_sinal FROM sinais WHERE id = NEW.sinal_id;
  SELECT f.*, COALESCE(s.ano_letivo_atual, 2025) as ano_letivo
  INTO v_fase FROM fases f
  LEFT JOIN institution_settings s ON s.institution_id = f.institution_id
  WHERE f.id = NEW.fase_id;

  v_ano_letivo := COALESCE(v_fase.ano_letivo, 2025);

  IF v_sinal.valencia = 'positivo' THEN
    IF NEW.foi_cross_im THEN
      v_tipo := 'obs_cross'; v_peso := 5;
    ELSE
      v_tipo := 'obs_propria'; v_peso := 3;
    END IF;

    v_pontos := v_sinal.peso_inteligencia;
    IF NEW.intensidade = 'alto' THEN v_pontos := v_pontos * 1.5;
    ELSIF NEW.intensidade = 'excepcional' THEN v_pontos := v_pontos * 2;
    END IF;

    INSERT INTO inteligencia_evidencias (
      aluno_id, inteligencia_id, tipo, peso,
      pontos, observacao_id, fase_id, ano_letivo
    ) VALUES (
      NEW.aluno_id, NEW.inteligencia_expressa, v_tipo, v_peso,
      v_pontos, NEW.id, NEW.fase_id, v_ano_letivo
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.20 fechar_fase
DROP FUNCTION IF EXISTS fechar_fase(UUID);
CREATE OR REPLACE FUNCTION public.fechar_fase(p_fase_id UUID)
RETURNS TABLE(total_alunos INT, numero_da_fase SMALLINT) AS $$
DECLARE
  v_fase RECORD; v_aluno RECORD; v_im RECORD; v_evidencias RECORD;
  v_score_fase DECIMAL; v_score_anterior DECIMAL;
  v_score_calculado DECIMAL; v_score_novo DECIMAL; v_variacao DECIMAL;
  v_contador INT := 0;
BEGIN
  SELECT * INTO v_fase FROM fases WHERE id = p_fase_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fase nao encontrada: %', p_fase_id; END IF;

  FOR v_aluno IN
    SELECT p.id, p.casa_id FROM profiles p
    WHERE p.institution_id = v_fase.institution_id AND p.casa_id IS NOT NULL
  LOOP
    FOR v_im IN SELECT id FROM inteligencias ORDER BY id LOOP
      SELECT COALESCE(SUM(pontos), 0) as total_pontos, COUNT(*) as total_evidencias
      INTO v_evidencias FROM inteligencia_evidencias
      WHERE aluno_id = v_aluno.id AND inteligencia_id = v_im.id AND fase_id = p_fase_id;

      v_score_fase := LEAST(100, (v_evidencias.total_pontos / 50.0) * 100);

      SELECT score_atual INTO v_score_anterior FROM inteligencia_scores
      WHERE aluno_id = v_aluno.id AND inteligencia_id = v_im.id AND ano_letivo = v_fase.ano_letivo;
      IF v_score_anterior IS NULL THEN v_score_anterior := 35.00; END IF;

      v_score_calculado := (v_score_anterior * 0.85) + (v_score_fase * 0.15);
      v_variacao := v_score_calculado - v_score_anterior;
      IF v_variacao > 5 THEN v_score_novo := v_score_anterior + 5;
      ELSIF v_variacao < -5 THEN v_score_novo := v_score_anterior - 5;
      ELSE v_score_novo := v_score_calculado; END IF;
      v_score_novo := GREATEST(0, LEAST(100, v_score_novo));

      INSERT INTO inteligencia_scores (
        aluno_id, inteligencia_id, score_atual,
        score_ultima_fase, total_evidencias, ano_letivo, fase_atual
      ) VALUES (
        v_aluno.id, v_im.id, v_score_novo,
        v_score_fase, v_evidencias.total_evidencias,
        v_fase.ano_letivo, v_fase.numero_fase
      )
      ON CONFLICT (aluno_id, inteligencia_id, ano_letivo)
      DO UPDATE SET
        score_atual = v_score_novo,
        score_ultima_fase = v_score_fase,
        total_evidencias = inteligencia_scores.total_evidencias + v_evidencias.total_evidencias,
        fase_atual = v_fase.numero_fase, updated_at = now();

      INSERT INTO inteligencia_historico (
        aluno_id, inteligencia_id, ano_letivo,
        fase_numero, score_fase, score_apos_formula
      ) VALUES (
        v_aluno.id, v_im.id, v_fase.ano_letivo,
        v_fase.numero_fase, v_score_fase, v_score_novo
      )
      ON CONFLICT (aluno_id, inteligencia_id, ano_letivo, fase_numero)
      DO UPDATE SET
        score_fase = EXCLUDED.score_fase,
        score_apos_formula = EXCLUDED.score_apos_formula;
    END LOOP;
    v_contador := v_contador + 1;
  END LOOP;

  UPDATE fases SET ativo = false WHERE id = p_fase_id;
  RETURN QUERY SELECT v_contador, v_fase.numero_fase;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.21 get_missoes_do_aluno (versao final)
DROP FUNCTION IF EXISTS public.get_missoes_do_aluno(UUID);
CREATE OR REPLACE FUNCTION public.get_missoes_do_aluno(p_aluno_id UUID)
RETURNS TABLE(
  id UUID, titulo TEXT, descricao TEXT, tipo TEXT,
  pontos_base INTEGER, data_liberacao TIMESTAMPTZ, data_prazo TIMESTAMPTZ,
  requer_texto BOOLEAN, requer_arquivo BOOLEAN, permite_atrasada BOOLEAN,
  casa_id INTEGER, casa_nome TEXT, casa_emoji TEXT, casa_cor TEXT,
  ja_entregou BOOLEAN, status_entrega TEXT, atrasada BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_now TIMESTAMPTZ := now();
  v_serie_num SMALLINT;
BEGIN
  SELECT p.id, p.institution_id, p.casa_id,
    COALESCE(p.serie, '') as serie, COALESCE(p.turma, '') as turma
  INTO v_profile FROM profiles p WHERE p.id = p_aluno_id;
  IF v_profile IS NULL THEN RETURN; END IF;
  v_serie_num := NULLIF(REGEXP_REPLACE(v_profile.serie, '[^0-9]', '', 'g'), '')::SMALLINT;

  RETURN QUERY
  SELECT
    m.id, m.titulo, m.descricao, m.tipo,
    m.pontos_base::INTEGER, m.data_liberacao, m.data_prazo,
    COALESCE(m.requer_texto, false), COALESCE(m.requer_arquivo, false),
    COALESCE(m.permite_entrega_atrasada, false),
    i.id::INTEGER, i.nome, i.emoji, i.cor_hex,
    EXISTS(SELECT 1 FROM entregas e WHERE e.missao_id = m.id AND e.aluno_id = p_aluno_id),
    COALESCE(
      (SELECT e.status FROM entregas e WHERE e.missao_id = m.id AND e.aluno_id = p_aluno_id ORDER BY e.created_at DESC LIMIT 1),
      'pendente'
    ),
    (m.data_prazo < v_now)
  FROM missoes m
  LEFT JOIN inteligencias i ON i.id = m.casa_id
  WHERE
    m.institution_id = v_profile.institution_id
    AND m.status = 'liberada'
    AND m.data_liberacao <= v_now
    AND (m.serie_filtro IS NULL OR m.serie_filtro = v_serie_num)
    AND (m.turma_filtro IS NULL OR m.turma_filtro = ''
         OR UPPER(TRIM(v_profile.turma)) = ANY(
           SELECT UPPER(TRIM(t)) FROM unnest(string_to_array(m.turma_filtro, ',')) AS t
         ))
    AND (
      m.fase_id IS NULL
      OR EXISTS (
        SELECT 1 FROM fases f
        WHERE f.id = m.fase_id
          AND f.data_inicio <= v_now::DATE
          AND f.data_fim >= v_now::DATE
          AND (f.serie IS NULL OR f.serie = v_serie_num)
      )
    )
    AND (
      (m.casa_id IS NULL AND COALESCE(m.para_todos_da_casa, true) = true
       AND NOT EXISTS(SELECT 1 FROM missao_destinatarios md WHERE md.missao_id = m.id))
      OR (m.casa_id = v_profile.casa_id AND COALESCE(m.para_todos_da_casa, true) = true)
      OR EXISTS(SELECT 1 FROM missao_destinatarios md WHERE md.missao_id = m.id AND md.aluno_id = p_aluno_id)
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

-- 4.22 validate_mapa_desenvolvimento
CREATE OR REPLACE FUNCTION public.validate_mapa_desenvolvimento()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quadrante NOT IN ('surpreendeu', 'foi_bem', 'teve_dificuldades', 'atencao') THEN
    RAISE EXCEPTION 'Quadrante invalido: %', NEW.quadrante;
  END IF;
  IF NEW.semana_numero < 1 OR NEW.semana_numero > 4 THEN
    RAISE EXCEPTION 'semana_numero deve ser entre 1 e 4';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 4.23 analisar_e_gerar_alertas (versao final com 2 ultimas obs)
CREATE OR REPLACE FUNCTION public.analisar_e_gerar_alertas(p_aluno_id UUID)
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
  v_tipo_1 TEXT; v_tipo_2 TEXT;
  v_sinal_1 TEXT; v_sinal_2 TEXT;
  v_estado_atual TEXT;
  v_total_positivas INTEGER;
  v_tipo_celebracao TEXT;
  v_config_descoberta INTEGER;
  v_config_confirmacao INTEGER;
BEGIN
  SELECT institution_id, casa_id INTO v_institution_id, v_casa_aluno_id
  FROM profiles WHERE id = p_aluno_id;
  IF v_institution_id IS NULL THEN RETURN; END IF;

  SELECT id, inteligencia_id INTO v_fase_atual_id, v_fase_inteligencia_id
  FROM fases WHERE institution_id = v_institution_id AND ativo = true LIMIT 1;

  SELECT COALESCE((SELECT valor FROM config_alertas WHERE chave = 'positivos_descoberta'), 3) INTO v_config_descoberta;
  SELECT COALESCE((SELECT valor FROM config_alertas WHERE chave = 'positivos_confirmacao'), 5) INTO v_config_confirmacao;

  SELECT s.valencia, s.label_pt INTO v_tipo_1, v_sinal_1
  FROM observacoes o JOIN sinais s ON s.id = o.sinal_id
  WHERE o.aluno_id = p_aluno_id ORDER BY o.created_at DESC LIMIT 1;

  SELECT s.valencia, s.label_pt INTO v_tipo_2, v_sinal_2
  FROM observacoes o JOIN sinais s ON s.id = o.sinal_id
  WHERE o.aluno_id = p_aluno_id ORDER BY o.created_at DESC OFFSET 1 LIMIT 1;

  IF v_tipo_1 IS NULL OR v_tipo_2 IS NULL THEN RETURN; END IF;

  IF v_tipo_1 = 'atencao' AND v_tipo_2 = 'atencao' THEN v_estado_atual := 'precisa_atencao';
  ELSIF v_tipo_1 = 'positivo' AND v_tipo_2 = 'positivo' THEN v_estado_atual := 'celebrar';
  ELSE v_estado_atual := 'neutro';
  END IF;

  IF v_estado_atual = 'precisa_atencao' THEN
    UPDATE alertas_alunos SET status = 'arquivado', updated_at = NOW()
    WHERE aluno_id = p_aluno_id AND tipo_alerta = 'celebrar' AND status = 'ativo';
  ELSIF v_estado_atual = 'celebrar' THEN
    UPDATE alertas_alunos SET status = 'arquivado', updated_at = NOW()
    WHERE aluno_id = p_aluno_id AND tipo_alerta = 'precisa_atencao' AND status = 'ativo';
  ELSE
    UPDATE alertas_alunos SET status = 'arquivado', updated_at = NOW()
    WHERE aluno_id = p_aluno_id AND tipo_alerta IN ('precisa_atencao', 'celebrar') AND status = 'ativo';
  END IF;

  IF v_estado_atual = 'precisa_atencao' THEN
    IF NOT EXISTS (
      SELECT 1 FROM alertas_alunos
      WHERE aluno_id = p_aluno_id AND tipo_alerta = 'precisa_atencao' AND status = 'ativo'
    ) THEN
      INSERT INTO alertas_alunos (
        institution_id, aluno_id, tipo_alerta, motivo, status,
        notificacao_ativa, fase_id, dados_contexto
      ) VALUES (
        v_institution_id, p_aluno_id, 'precisa_atencao', 'ultimas_2_atencao', 'ativo',
        true, v_fase_atual_id,
        jsonb_build_object('sinal_1', v_sinal_1, 'sinal_2', v_sinal_2, 'quantidade', 2)
      );
    ELSE
      UPDATE alertas_alunos
      SET dados_contexto = jsonb_build_object('sinal_1', v_sinal_1, 'sinal_2', v_sinal_2, 'quantidade', 2),
          updated_at = NOW()
      WHERE aluno_id = p_aluno_id AND tipo_alerta = 'precisa_atencao' AND status = 'ativo';
    END IF;
  ELSIF v_estado_atual = 'celebrar' THEN
    SELECT COUNT(*) INTO v_total_positivas
    FROM observacoes o JOIN sinais s ON s.id = o.sinal_id
    WHERE o.aluno_id = p_aluno_id AND o.fase_id = v_fase_atual_id AND s.valencia = 'positivo';

    IF v_fase_inteligencia_id IS DISTINCT FROM v_casa_aluno_id AND v_total_positivas >= v_config_descoberta THEN
      v_tipo_celebracao := 'descoberta';
    ELSIF v_fase_inteligencia_id = v_casa_aluno_id AND v_total_positivas >= v_config_confirmacao THEN
      v_tipo_celebracao := 'confirmacao';
    ELSE v_tipo_celebracao := NULL;
    END IF;

    IF v_tipo_celebracao IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM alertas_alunos
        WHERE aluno_id = p_aluno_id AND tipo_alerta = 'celebrar' AND status = 'ativo'
      ) THEN
        INSERT INTO alertas_alunos (
          institution_id, aluno_id, tipo_alerta, motivo, status,
          notificacao_ativa, fase_id, dados_contexto
        ) VALUES (
          v_institution_id, p_aluno_id, 'celebrar', v_tipo_celebracao, 'ativo',
          true, v_fase_atual_id,
          jsonb_build_object(
            'tipo_celebracao', v_tipo_celebracao, 'quantidade_positivos', v_total_positivas,
            'casa_aluno_id', v_casa_aluno_id, 'fase_inteligencia_id', v_fase_inteligencia_id
          )
        );
      END IF;
    END IF;
  END IF;
END;
$$;

-- 4.24 trigger_analisar_observacao
CREATE OR REPLACE FUNCTION public.trigger_analisar_observacao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM analisar_e_gerar_alertas(NEW.aluno_id);
  RETURN NEW;
END;
$$;

-- 4.25 resolver_nao_esqueca
CREATE OR REPLACE FUNCTION public.resolver_nao_esqueca()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE alertas_alunos SET status = 'resolvido', resolved_at = NOW()
  WHERE aluno_id = NEW.aluno_id AND tipo_alerta = 'nao_esquecer' AND status = 'ativo';
  RETURN NEW;
END;
$$;

-- 4.26 trigger_notificar_n8n_observacao (versao final com logging)
CREATE OR REPLACE FUNCTION public.trigger_notificar_n8n_observacao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_aluno RECORD; v_casa RECORD; v_professor RECORD; v_sinal RECORD;
  v_im_expressa RECORD; v_im_fase RECORD; v_fase RECORD; v_turma RECORD;
  v_aluno_json JSONB; v_sinal_json JSONB; v_payload JSONB;
  v_request_id BIGINT;
  v_endpoint_url TEXT := 'https://webhook.escolaamadeus.com/webhook/projetoarboria';
BEGIN
  SELECT id, full_name, nome, serie, turma, casa_id, matricula_externa, segmento
  INTO v_aluno FROM profiles WHERE id = NEW.aluno_id;
  IF NOT FOUND THEN
    v_aluno_json := jsonb_build_object('id', NEW.aluno_id, '_status', 'not_found');
  ELSE
    SELECT nome, emoji INTO v_casa FROM inteligencias WHERE id = v_aluno.casa_id;
    v_aluno_json := jsonb_build_object(
      'id', v_aluno.id, 'matricula_externa', v_aluno.matricula_externa,
      'nome', COALESCE(v_aluno.full_name, v_aluno.nome),
      'serie', v_aluno.serie, 'turma', v_aluno.turma,
      'segmento', v_aluno.segmento, 'casa_id', v_aluno.casa_id, 'casa_nome', v_casa.nome
    );
  END IF;
  SELECT id, full_name, nome INTO v_professor FROM profiles WHERE id = NEW.professor_id;
  SELECT id, codigo, emoji, label_pt, valencia, pilar, peso_inteligencia INTO v_sinal FROM sinais WHERE id = NEW.sinal_id;
  IF NOT FOUND THEN v_sinal_json := jsonb_build_object('id', NEW.sinal_id, '_status', 'not_found');
  ELSE v_sinal_json := jsonb_build_object('id', v_sinal.id, 'codigo', v_sinal.codigo, 'emoji', v_sinal.emoji, 'label', v_sinal.label_pt, 'valencia', v_sinal.valencia, 'pilar', v_sinal.pilar, 'peso', v_sinal.peso_inteligencia);
  END IF;
  SELECT id, nome, emoji INTO v_im_expressa FROM inteligencias WHERE id = NEW.inteligencia_expressa;
  SELECT id, nome, emoji INTO v_im_fase FROM inteligencias WHERE id = NEW.inteligencia_fase;
  SELECT id, numero_fase INTO v_fase FROM fases WHERE id = NEW.fase_id;
  SELECT id, nome INTO v_turma FROM turmas WHERE id = NEW.turma_id;

  v_payload := jsonb_build_object(
    'evento', 'observacao_criada', 'observacao_id', NEW.id, 'timestamp', NEW.created_at,
    'aluno', v_aluno_json,
    'professor', jsonb_build_object('id', v_professor.id, 'nome', COALESCE(v_professor.full_name, v_professor.nome)),
    'sinal', v_sinal_json,
    'inteligencias', jsonb_build_object('expressa_id', v_im_expressa.id, 'expressa_nome', v_im_expressa.nome, 'expressa_emoji', v_im_expressa.emoji, 'fase_id', v_im_fase.id, 'fase_nome', v_im_fase.nome, 'fase_emoji', v_im_fase.emoji, 'foi_cross_im', NEW.foi_cross_im),
    'observacao', jsonb_build_object('texto', NEW.observacao_texto, 'data', NEW.data_observacao, 'intensidade', NEW.intensidade),
    'contexto', jsonb_build_object('institution_id', NEW.institution_id, 'fase_id', NEW.fase_id, 'fase_numero', v_fase.numero_fase, 'turma_id', NEW.turma_id, 'turma_completa', v_turma.nome)
  );

  SELECT net.http_post(url := v_endpoint_url, body := v_payload, headers := jsonb_build_object('Content-Type', 'application/json'))
  INTO v_request_id;
  INSERT INTO public.webhook_n8n_logs (observacao_id, endpoint_url, request_id, payload) VALUES (NEW.id, v_endpoint_url, v_request_id, v_payload);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    INSERT INTO public.webhook_n8n_logs (observacao_id, endpoint_url, payload, error_msg)
    VALUES (NEW.id, v_endpoint_url, COALESCE(v_payload, '{}'::JSONB), SQLERRM);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RAISE WARNING 'Webhook N8N falhou: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 4.27 limpar_webhook_logs_antigos
CREATE OR REPLACE FUNCTION public.limpar_webhook_logs_antigos()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_deleted INTEGER;
BEGIN
  DELETE FROM public.webhook_n8n_logs WHERE created_at < NOW() - INTERVAL '14 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- 4.28 get_estados_alunos_minha_casa
CREATE OR REPLACE FUNCTION public.get_estados_alunos_minha_casa(
  p_serie SMALLINT DEFAULT NULL,
  p_turma_letra TEXT DEFAULT NULL,
  p_estado TEXT DEFAULT NULL
)
RETURNS TABLE (
  aluno_id UUID, nome TEXT, sobrenome TEXT, full_name TEXT,
  serie TEXT, turma TEXT, casa_id SMALLINT, casa_nome TEXT, casa_cor TEXT,
  avatar_url TEXT, estado_calculado TEXT,
  ultima_sinal TEXT, penultima_sinal TEXT, data_ultima_obs TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_minha_casa_id SMALLINT;
  v_minha_institution_id UUID;
BEGIN
  SELECT pc.casa_id, pc.institution_id INTO v_minha_casa_id, v_minha_institution_id
  FROM professor_casa pc WHERE pc.professor_id = auth.uid() AND pc.ativo = true LIMIT 1;
  IF v_minha_casa_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT v.aluno_id, v.nome, v.sobrenome, v.full_name, v.serie, v.turma,
    v.casa_id, v.casa_nome, v.casa_cor, v.avatar_url, v.estado_calculado,
    v.ultima_sinal, v.penultima_sinal, v.data_ultima_obs
  FROM vw_estados_alunos v
  WHERE v.institution_id = v_minha_institution_id
    AND v.casa_id = v_minha_casa_id
    AND (p_serie IS NULL OR CAST(REGEXP_REPLACE(v.serie, '[^0-9]', '', 'g') AS SMALLINT) = p_serie)
    AND (p_turma_letra IS NULL OR UPPER(TRIM(v.turma)) = UPPER(TRIM(p_turma_letra)))
    AND (p_estado IS NULL OR v.estado_calculado = p_estado)
  ORDER BY
    CASE v.estado_calculado
      WHEN 'precisa_atencao' THEN 1 WHEN 'atencao_recente' THEN 2
      WHEN 'melhorando' THEN 3 WHEN 'celebrar' THEN 4
      WHEN 'primeira_obs' THEN 5 WHEN 'sem_observacao' THEN 6 ELSE 7
    END, v.nome;
END;
$$;

-- 4.29 get_contagem_estados_minha_casa
CREATE OR REPLACE FUNCTION public.get_contagem_estados_minha_casa()
RETURNS TABLE (estado TEXT, quantidade BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_minha_casa_id SMALLINT;
  v_minha_institution_id UUID;
BEGIN
  SELECT pc.casa_id, pc.institution_id INTO v_minha_casa_id, v_minha_institution_id
  FROM professor_casa pc WHERE pc.professor_id = auth.uid() AND pc.ativo = true LIMIT 1;
  IF v_minha_casa_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT v.estado_calculado as estado, COUNT(*) as quantidade
  FROM vw_estados_alunos v
  WHERE v.institution_id = v_minha_institution_id AND v.casa_id = v_minha_casa_id
  GROUP BY v.estado_calculado;
END;
$$;

-- 4.30 get_hipoteses_para_alerta
CREATE OR REPLACE FUNCTION public.get_hipoteses_para_alerta(
  p_sinal_codigo TEXT, p_padrao_codigo TEXT DEFAULT NULL
)
RETURNS TABLE (ordem INTEGER, titulo TEXT, descricao TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_padrao_codigo IS NOT NULL THEN
    RETURN QUERY SELECT hp.ordem, hp.titulo, hp.descricao FROM hipoteses_por_padrao hp WHERE hp.padrao_codigo = p_padrao_codigo ORDER BY hp.ordem;
  ELSE
    RETURN QUERY SELECT hs.ordem, hs.titulo, hs.descricao FROM hipoteses_por_sinal hs WHERE hs.sinal_codigo = p_sinal_codigo ORDER BY hs.ordem;
  END IF;
END;
$$;

-- 4.31 get_arquetipo
CREATE OR REPLACE FUNCTION public.get_arquetipo(p_casa_codigo TEXT, p_fase_codigo TEXT)
RETURNS TABLE (nome_arquetipo TEXT, tipo TEXT, significado TEXT, potencializar TEXT[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT a.nome_arquetipo, a.tipo, a.significado, a.potencializar
  FROM arquetipos a WHERE a.casa_codigo = p_casa_codigo AND a.fase_codigo = p_fase_codigo;
END;
$$;

-- 4.32 migrar_alertas_fase_anterior
CREATE OR REPLACE FUNCTION public.migrar_alertas_fase_anterior(p_fase_anterior_id UUID, p_fase_nova_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE alertas_alunos
  SET fase_origem_id = fase_id, fase_id = p_fase_nova_id,
      dados_contexto = dados_contexto || jsonb_build_object('migrado_de_fase', p_fase_anterior_id)
  WHERE fase_id = p_fase_anterior_id
    AND tipo_alerta = 'precisa_atencao'
    AND status IN ('ativo', 'em_acompanhamento');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Trigger: new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: sync casa text to casa_id
DROP TRIGGER IF EXISTS on_profile_sync_casa ON public.profiles;
CREATE TRIGGER on_profile_sync_casa
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_casa_to_casa_id();

-- Trigger: protect casa_id change
DROP TRIGGER IF EXISTS protect_casa_id_change ON public.profiles;
CREATE TRIGGER protect_casa_id_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_casa_id_change();

-- Trigger: sync profile to aluno_turma
DROP TRIGGER IF EXISTS on_profile_sync_turma ON public.profiles;
CREATE TRIGGER on_profile_sync_turma
  AFTER INSERT OR UPDATE OF serie, turma, institution_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_aluno_turma();

-- Trigger: sync user role to aluno_turma
DROP TRIGGER IF EXISTS on_user_role_sync_turma ON public.user_roles;
CREATE TRIGGER on_user_role_sync_turma
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role_to_aluno_turma();

-- Trigger: institution settings
DROP TRIGGER IF EXISTS on_institution_created ON public.institutions;
CREATE TRIGGER on_institution_created
  AFTER INSERT ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION public.create_default_institution_settings();

-- Trigger: inicializar scores
DROP TRIGGER IF EXISTS on_aluno_inicializar_scores ON public.profiles;
CREATE TRIGGER on_aluno_inicializar_scores
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.inicializar_scores_aluno();

-- Trigger: registrar ajuste score
DROP TRIGGER IF EXISTS on_score_ajustado ON public.inteligencia_scores;
CREATE TRIGGER on_score_ajustado
  AFTER UPDATE ON public.inteligencia_scores
  FOR EACH ROW EXECUTE FUNCTION public.registrar_ajuste_score();

-- Trigger: fases updated_at
DROP TRIGGER IF EXISTS update_fases_updated_at ON public.fases;
CREATE TRIGGER update_fases_updated_at
  BEFORE UPDATE ON public.fases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: missoes updated_at
DROP TRIGGER IF EXISTS update_missoes_updated_at ON public.missoes;
CREATE TRIGGER update_missoes_updated_at
  BEFORE UPDATE ON public.missoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: entregas updated_at
DROP TRIGGER IF EXISTS update_entregas_updated_at ON public.entregas;
CREATE TRIGGER update_entregas_updated_at
  BEFORE UPDATE ON public.entregas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: entrega aprovada
DROP TRIGGER IF EXISTS on_entrega_aprovada ON public.entregas;
CREATE TRIGGER on_entrega_aprovada
  BEFORE UPDATE ON public.entregas
  FOR EACH ROW EXECUTE FUNCTION public.processar_entrega_aprovada();

-- Trigger: observacao -> evidencia
DROP TRIGGER IF EXISTS on_observacao_criada ON public.observacoes;
CREATE TRIGGER on_observacao_criada
  AFTER INSERT ON public.observacoes
  FOR EACH ROW EXECUTE FUNCTION public.processar_observacao();

-- Trigger: observacao -> alertas
DROP TRIGGER IF EXISTS trg_analisar_observacao ON public.observacoes;
CREATE TRIGGER trg_analisar_observacao
  AFTER INSERT ON public.observacoes
  FOR EACH ROW EXECUTE FUNCTION public.trigger_analisar_observacao();

-- Trigger: observacao -> resolver nao_esqueca
DROP TRIGGER IF EXISTS trg_resolver_nao_esqueca ON public.observacoes;
CREATE TRIGGER trg_resolver_nao_esqueca
  AFTER INSERT ON public.observacoes
  FOR EACH ROW EXECUTE FUNCTION public.resolver_nao_esqueca();

-- Trigger: observacao -> n8n webhook
DROP TRIGGER IF EXISTS trg_notificar_n8n_observacao ON public.observacoes;
CREATE TRIGGER trg_notificar_n8n_observacao
  AFTER INSERT ON public.observacoes
  FOR EACH ROW EXECUTE FUNCTION public.trigger_notificar_n8n_observacao();

-- Trigger: alertas updated_at
DROP TRIGGER IF EXISTS update_alertas_alunos_updated_at ON public.alertas_alunos;
CREATE TRIGGER update_alertas_alunos_updated_at
  BEFORE UPDATE ON public.alertas_alunos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: conteudo_inteligencia updated_at
DROP TRIGGER IF EXISTS update_conteudo_inteligencia_updated_at ON public.conteudo_inteligencia;
CREATE TRIGGER update_conteudo_inteligencia_updated_at
  BEFORE UPDATE ON public.conteudo_inteligencia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: mapa_desenvolvimento
DROP TRIGGER IF EXISTS update_mapa_desenvolvimento_updated_at ON public.mapa_desenvolvimento;
CREATE TRIGGER update_mapa_desenvolvimento_updated_at
  BEFORE UPDATE ON public.mapa_desenvolvimento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS validate_mapa_desenvolvimento_trigger ON public.mapa_desenvolvimento;
CREATE TRIGGER validate_mapa_desenvolvimento_trigger
  BEFORE INSERT OR UPDATE ON public.mapa_desenvolvimento
  FOR EACH ROW EXECUTE FUNCTION public.validate_mapa_desenvolvimento();



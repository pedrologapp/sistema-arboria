-- =============================================
-- RECUPERAÇÃO DE ACESSO (sem email)
-- Aluno solicita → Coordenador da casa+turma+série autoriza e entrega
-- Idempotente.
-- =============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------
-- Tabela de solicitações
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.recuperacao_solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  nome_digitado text NOT NULL,
  serie_digitada text NOT NULL,
  turma_digitada text NOT NULL,
  casa_id smallint NOT NULL REFERENCES public.inteligencias(id),
  aluno_resolvido_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','autorizada','recusada','expirada')),
  motivo_recusa text,
  solicitado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  autorizado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  autorizado_em timestamptz,
  log_ip text,
  log_user_agent text
);

CREATE INDEX IF NOT EXISTS idx_recup_inst_status
  ON public.recuperacao_solicitacoes(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_recup_casa_serie_turma
  ON public.recuperacao_solicitacoes(casa_id, serie_digitada, turma_digitada, status);

-- ---------------------------------------------
-- Helper: usuário X é coordenador competente pra a solicitação Y?
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.eh_coordenador_da_solicitacao(
  p_solicitacao_id uuid, p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.recuperacao_solicitacoes rs
    JOIN public.cargos_casa cc
      ON cc.casa_id = rs.casa_id
     AND cc.aluno_id = p_user_id
     AND cc.cargo = 'coordenador'
     AND cc.ativo = true
    JOIN public.profiles p
      ON p.id = p_user_id
     AND p.institution_id = rs.institution_id
     AND coalesce(regexp_replace(p.serie, '\D', '', 'g'), '') = rs.serie_digitada
     AND p.turma = rs.turma_digitada
    WHERE rs.id = p_solicitacao_id
  );
$$;

-- ---------------------------------------------
-- RLS
-- ---------------------------------------------
ALTER TABLE public.recuperacao_solicitacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coordenador vê suas solicitações" ON public.recuperacao_solicitacoes;
CREATE POLICY "Coordenador vê suas solicitações"
ON public.recuperacao_solicitacoes FOR SELECT
USING ( public.eh_coordenador_da_solicitacao(id, auth.uid()) );

DROP POLICY IF EXISTS "Admin vê solicitações" ON public.recuperacao_solicitacoes;
CREATE POLICY "Admin vê solicitações"
ON public.recuperacao_solicitacoes FOR SELECT
USING (
  has_role(auth.uid(), 'admin')
  AND institution_id = get_user_institution_id()
);

DROP POLICY IF EXISTS "Admin gerencia solicitações" ON public.recuperacao_solicitacoes;
CREATE POLICY "Admin gerencia solicitações"
ON public.recuperacao_solicitacoes FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  AND institution_id = get_user_institution_id()
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  AND institution_id = get_user_institution_id()
);

-- =============================================
-- RPC 1: criar solicitação (sem auth)
-- =============================================
CREATE OR REPLACE FUNCTION public.criar_solicitacao_recuperacao(
  p_institution_id uuid,
  p_nome text,
  p_serie text,
  p_turma text,
  p_casa_id smallint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recente_count int;
BEGIN
  IF p_nome IS NULL OR length(trim(p_nome)) < 3 THEN
    RAISE EXCEPTION 'Informe seu nome completo';
  END IF;
  IF p_serie IS NULL OR p_turma IS NULL OR p_casa_id IS NULL OR p_institution_id IS NULL THEN
    RAISE EXCEPTION 'Preencha todos os campos';
  END IF;

  -- Rate limit grosseiro: máximo 5 solicitações pendentes do mesmo nome+turma+casa por hora
  SELECT count(*) INTO v_recente_count
  FROM public.recuperacao_solicitacoes
  WHERE lower(nome_digitado) = lower(trim(p_nome))
    AND turma_digitada = p_turma
    AND casa_id = p_casa_id
    AND solicitado_em > now() - interval '1 hour';

  IF v_recente_count >= 5 THEN
    RAISE EXCEPTION 'Muitas tentativas recentes. Aguarde 1 hora ou procure a coordenação.';
  END IF;

  INSERT INTO public.recuperacao_solicitacoes (
    institution_id, nome_digitado, serie_digitada, turma_digitada, casa_id,
    log_ip, log_user_agent
  ) VALUES (
    p_institution_id, trim(p_nome), regexp_replace(p_serie, '\D', '', 'g'), p_turma, p_casa_id,
    coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for',
             current_setting('request.headers', true)::json->>'cf-connecting-ip',
             ''),
    coalesce(current_setting('request.headers', true)::json->>'user-agent', '')
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_solicitacao_recuperacao(uuid, text, text, text, smallint)
  TO anon, authenticated;

-- =============================================
-- RPC 2: listar candidatos da solicitação (coordenador escolhe quem é)
-- =============================================
CREATE OR REPLACE FUNCTION public.listar_candidatos_recuperacao(p_solicitacao_id uuid)
RETURNS TABLE(id uuid, full_name text, nome text, avatar_url text, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.eh_coordenador_da_solicitacao(p_solicitacao_id, auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.nome, p.avatar_url, u.email::text
  FROM public.recuperacao_solicitacoes rs
  JOIN public.profiles p
    ON p.institution_id = rs.institution_id
   AND p.casa_id = rs.casa_id
   AND coalesce(regexp_replace(p.serie, '\D', '', 'g'), '') = rs.serie_digitada
   AND p.turma = rs.turma_digitada
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE rs.id = p_solicitacao_id
  ORDER BY p.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.listar_candidatos_recuperacao(uuid) TO authenticated;

-- =============================================
-- RPC 3: autorizar — gera senha e entrega
-- =============================================
CREATE OR REPLACE FUNCTION public.autorizar_recuperacao(
  p_solicitacao_id uuid,
  p_aluno_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_senha text;
  v_email text;
  v_status text;
BEGIN
  IF NOT public.eh_coordenador_da_solicitacao(p_solicitacao_id, auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT status INTO v_status
  FROM public.recuperacao_solicitacoes
  WHERE id = p_solicitacao_id;

  IF v_status <> 'pendente' THEN
    RAISE EXCEPTION 'Solicitação já foi processada (status: %)', v_status;
  END IF;

  -- Confirma que aluno escolhido bate com casa+turma+série da solicitação
  IF NOT EXISTS (
    SELECT 1
    FROM public.recuperacao_solicitacoes rs
    JOIN public.profiles p ON p.id = p_aluno_id
    WHERE rs.id = p_solicitacao_id
      AND p.casa_id = rs.casa_id
      AND coalesce(regexp_replace(p.serie, '\D', '', 'g'), '') = rs.serie_digitada
      AND p.turma = rs.turma_digitada
      AND p.institution_id = rs.institution_id
  ) THEN
    RAISE EXCEPTION 'Aluno escolhido não corresponde aos dados da solicitação';
  END IF;

  -- Gera senha temporária (6 dígitos)
  v_senha := lpad(floor(random() * 1000000)::text, 6, '0');

  -- Atualiza senha no auth
  UPDATE auth.users
  SET encrypted_password = crypt(v_senha, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_aluno_id;

  SELECT email::text INTO v_email FROM auth.users WHERE id = p_aluno_id;

  -- Força troca no próximo login
  UPDATE public.profiles
  SET must_change_password = true
  WHERE id = p_aluno_id;

  -- Marca solicitação como autorizada
  UPDATE public.recuperacao_solicitacoes
  SET status = 'autorizada',
      aluno_resolvido_id = p_aluno_id,
      autorizado_por = auth.uid(),
      autorizado_em = now()
  WHERE id = p_solicitacao_id;

  RETURN jsonb_build_object('email', v_email, 'senha', v_senha);
END;
$$;

GRANT EXECUTE ON FUNCTION public.autorizar_recuperacao(uuid, uuid) TO authenticated;

-- =============================================
-- RPC 4: recusar
-- =============================================
CREATE OR REPLACE FUNCTION public.recusar_recuperacao(
  p_solicitacao_id uuid,
  p_motivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.eh_coordenador_da_solicitacao(p_solicitacao_id, auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  UPDATE public.recuperacao_solicitacoes
  SET status = 'recusada',
      motivo_recusa = p_motivo,
      autorizado_por = auth.uid(),
      autorizado_em = now()
  WHERE id = p_solicitacao_id AND status = 'pendente';

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.recusar_recuperacao(uuid, text) TO authenticated;

-- =============================================
-- RPC 5: dados públicos pra montar formulário (instituições, casas, etc)
-- (sem auth)
-- =============================================
CREATE OR REPLACE FUNCTION public.opcoes_recuperacao()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inst jsonb;
  v_casas jsonb;
  v_turmas jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name) ORDER BY name), '[]'::jsonb)
    INTO v_inst FROM public.institutions;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'nome', nome, 'codigo', codigo, 'cor_hex', cor_hex, 'brasao_url', brasao_url
  ) ORDER BY ordem), '[]'::jsonb)
    INTO v_casas FROM public.inteligencias;

  -- Lista turmas distintas por instituição (pra popular select de série e turma)
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'institution_id', institution_id, 'serie', serie, 'turma_letra', turma_letra
  )), '[]'::jsonb)
    INTO v_turmas
  FROM (
    SELECT DISTINCT institution_id, serie, turma_letra
    FROM public.turmas
    WHERE serie IS NOT NULL AND turma_letra IS NOT NULL
    ORDER BY institution_id, serie, turma_letra
  ) t;

  RETURN jsonb_build_object(
    'institutions', v_inst,
    'casas', v_casas,
    'turmas', v_turmas
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.opcoes_recuperacao() TO anon, authenticated;

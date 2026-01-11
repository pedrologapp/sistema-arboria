-- =============================================
-- SISTEMA DE ALERTAS E AÇÕES - Projeto Arboria
-- =============================================

-- 1. CRIAR ENUMS
-- =============================================

-- Tipo de alerta
CREATE TYPE tipo_alerta AS ENUM (
  'precisa_atencao',   -- 🔴 3+ sinais de atenção consecutivos ou mudança abrupta
  'celebrar',          -- ✨ Descoberta (3x fora da casa) ou Confirmação (5x na casa)
  'nao_esquecer'       -- 🟡 Aluno sem observação há 14+ dias
);

-- Status do alerta
CREATE TYPE status_alerta AS ENUM (
  'ativo',       -- Alerta novo, não visto
  'visualizado', -- Professor viu mas não agiu
  'resolvido',   -- Professor tomou ação
  'arquivado'    -- Não relevante mais
);

-- Categoria da descoberta após ação
CREATE TYPE categoria_descoberta AS ENUM (
  'fator_escolar',  -- Problema acadêmico
  'fator_externo',  -- Problema familiar/pessoal
  'fator_social',   -- Problema com colegas
  'indefinido'      -- Ainda investigando
);

-- 2. TABELA alertas_alunos
-- =============================================

CREATE TABLE public.alertas_alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo_alerta tipo_alerta NOT NULL,
  motivo text NOT NULL,
  dados_contexto jsonb DEFAULT '{}',
  status status_alerta DEFAULT 'ativo',
  acao_tomada text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id)
);

-- Habilitar RLS
ALTER TABLE public.alertas_alunos ENABLE ROW LEVEL SECURITY;

-- 3. TABELA acoes_professor
-- =============================================

CREATE TABLE public.acoes_professor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  alerta_id uuid NOT NULL REFERENCES public.alertas_alunos(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo_acao text NOT NULL,
  descoberta text,
  categoria_descoberta categoria_descoberta DEFAULT 'indefinido',
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.acoes_professor ENABLE ROW LEVEL SECURITY;

-- 4. ÍNDICES PARA PERFORMANCE
-- =============================================

-- alertas_alunos
CREATE INDEX idx_alertas_aluno ON public.alertas_alunos(aluno_id);
CREATE INDEX idx_alertas_status ON public.alertas_alunos(status);
CREATE INDEX idx_alertas_tipo ON public.alertas_alunos(tipo_alerta);
CREATE INDEX idx_alertas_institution ON public.alertas_alunos(institution_id);
CREATE INDEX idx_alertas_created ON public.alertas_alunos(created_at DESC);
CREATE INDEX idx_alertas_status_ativo ON public.alertas_alunos(status) WHERE status = 'ativo';

-- acoes_professor
CREATE INDEX idx_acoes_alerta ON public.acoes_professor(alerta_id);
CREATE INDEX idx_acoes_professor ON public.acoes_professor(professor_id);

-- 5. TRIGGER PARA updated_at
-- =============================================

CREATE TRIGGER update_alertas_alunos_updated_at
  BEFORE UPDATE ON public.alertas_alunos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. RLS POLICIES - alertas_alunos
-- =============================================

-- Professor vê alertas de alunos da sua casa
CREATE POLICY "Professor vê alertas da sua casa"
  ON public.alertas_alunos
  FOR SELECT
  USING (
    has_role(auth.uid(), 'professor'::app_role) 
    AND institution_id = get_user_institution_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.professor_casa pc ON pc.casa_id = p.casa_id
      WHERE p.id = alertas_alunos.aluno_id
      AND pc.professor_id = auth.uid()
      AND pc.ativo = true
    )
  );

-- Admin vê todos alertas da instituição
CREATE POLICY "Admin vê todos alertas da instituição"
  ON public.alertas_alunos
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND institution_id = get_user_institution_id()
  );

-- Professor pode atualizar alertas da sua casa
CREATE POLICY "Professor pode atualizar alertas da sua casa"
  ON public.alertas_alunos
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'professor'::app_role) 
    AND institution_id = get_user_institution_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.professor_casa pc ON pc.casa_id = p.casa_id
      WHERE p.id = alertas_alunos.aluno_id
      AND pc.professor_id = auth.uid()
      AND pc.ativo = true
    )
  );

-- Admin pode atualizar qualquer alerta
CREATE POLICY "Admin pode atualizar alertas"
  ON public.alertas_alunos
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND institution_id = get_user_institution_id()
  );

-- Sistema pode inserir alertas (via trigger/function)
CREATE POLICY "Sistema pode inserir alertas"
  ON public.alertas_alunos
  FOR INSERT
  WITH CHECK (institution_id = get_user_institution_id());

-- 7. RLS POLICIES - acoes_professor
-- =============================================

-- Professor pode criar suas próprias ações
CREATE POLICY "Professor pode criar ações"
  ON public.acoes_professor
  FOR INSERT
  WITH CHECK (
    professor_id = auth.uid()
    AND has_role(auth.uid(), 'professor'::app_role)
    AND institution_id = get_user_institution_id()
  );

-- Professor vê suas próprias ações
CREATE POLICY "Professor vê suas ações"
  ON public.acoes_professor
  FOR SELECT
  USING (professor_id = auth.uid());

-- Admin vê todas ações da instituição
CREATE POLICY "Admin vê todas ações da instituição"
  ON public.acoes_professor
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND institution_id = get_user_institution_id()
  );

-- Professor pode atualizar suas ações
CREATE POLICY "Professor pode atualizar suas ações"
  ON public.acoes_professor
  FOR UPDATE
  USING (professor_id = auth.uid());

-- Admin pode atualizar qualquer ação
CREATE POLICY "Admin pode atualizar ações"
  ON public.acoes_professor
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND institution_id = get_user_institution_id()
  );
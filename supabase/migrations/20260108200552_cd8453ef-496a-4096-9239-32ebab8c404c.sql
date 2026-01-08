-- ============================================
-- SISTEMA DE PONTUAÇÃO ARBORIA
-- 5 Tabelas: pontos_gerais, inteligencia_evidencias, 
--            inteligencia_scores, inteligencia_historico, bonus_solicitacoes
-- ============================================

-- 1. TABELA: pontos_gerais
-- Registro de todos os pontos XP ganhos
CREATE TABLE public.pontos_gerais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  casa_id smallint NOT NULL REFERENCES public.inteligencias(id),
  tipo text NOT NULL CHECK (tipo IN ('missao', 'bonus_professor', 'bonus_lideranca', 'penalidade', 'ajuste')),
  missao_id uuid REFERENCES public.missoes(id) ON DELETE SET NULL,
  entrega_id uuid REFERENCES public.entregas(id) ON DELETE SET NULL,
  pontos integer NOT NULL,
  descricao text,
  concedido_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ano_letivo smallint NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Índices pontos_gerais
CREATE INDEX idx_pontos_aluno ON public.pontos_gerais(aluno_id);
CREATE INDEX idx_pontos_casa ON public.pontos_gerais(casa_id);
CREATE INDEX idx_pontos_institution_ano ON public.pontos_gerais(institution_id, ano_letivo);

-- RLS pontos_gerais
ALTER TABLE public.pontos_gerais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem pontos da instituição"
ON public.pontos_gerais FOR SELECT
USING (institution_id = get_user_institution_id());

CREATE POLICY "Admin pode inserir pontos"
ON public.pontos_gerais FOR INSERT
WITH CHECK (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode atualizar pontos"
ON public.pontos_gerais FOR UPDATE
USING (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode deletar pontos"
ON public.pontos_gerais FOR DELETE
USING (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

-- ============================================
-- 2. TABELA: inteligencia_evidencias
-- Evidências para cálculo do score de cada IM
CREATE TABLE public.inteligencia_evidencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  inteligencia_id smallint NOT NULL REFERENCES public.inteligencias(id),
  tipo text NOT NULL CHECK (tipo IN ('obs_propria', 'obs_cross', 'missao_propria', 'missao_cross')),
  peso smallint NOT NULL,
  pontos decimal(5,2) NOT NULL,
  observacao_id uuid REFERENCES public.observacoes(id) ON DELETE CASCADE,
  entrega_id uuid REFERENCES public.entregas(id) ON DELETE CASCADE,
  fase_id uuid NOT NULL REFERENCES public.fases(id) ON DELETE CASCADE,
  ano_letivo smallint NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Índices inteligencia_evidencias
CREATE INDEX idx_evidencias_aluno_im ON public.inteligencia_evidencias(aluno_id, inteligencia_id);
CREATE INDEX idx_evidencias_fase ON public.inteligencia_evidencias(fase_id);

-- RLS inteligencia_evidencias
ALTER TABLE public.inteligencia_evidencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem evidências da instituição"
ON public.inteligencia_evidencias FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.fases f
  WHERE f.id = inteligencia_evidencias.fase_id
  AND f.institution_id = get_user_institution_id()
));

CREATE POLICY "Admin pode inserir evidências"
ON public.inteligencia_evidencias FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode deletar evidências"
ON public.inteligencia_evidencias FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- 3. TABELA: inteligencia_scores
-- Score atual de cada aluno em cada IM (0-100%)
CREATE TABLE public.inteligencia_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  inteligencia_id smallint NOT NULL REFERENCES public.inteligencias(id),
  score_atual decimal(5,2) NOT NULL DEFAULT 35.00,
  score_ultima_fase decimal(5,2),
  total_evidencias smallint DEFAULT 0,
  ano_letivo smallint NOT NULL,
  fase_atual smallint DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(aluno_id, inteligencia_id, ano_letivo),
  CHECK(score_atual >= 0 AND score_atual <= 100)
);

-- Índice inteligencia_scores
CREATE INDEX idx_scores_aluno ON public.inteligencia_scores(aluno_id);

-- RLS inteligencia_scores
ALTER TABLE public.inteligencia_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno vê próprios scores"
ON public.inteligencia_scores FOR SELECT
USING (aluno_id = auth.uid());

CREATE POLICY "Professor vê scores da sua casa"
ON public.inteligencia_scores FOR SELECT
USING (
  has_role(auth.uid(), 'professor') AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.professor_casa pc ON pc.professor_id = auth.uid() 
      AND pc.casa_id = p.casa_id AND pc.ativo = true
    WHERE p.id = inteligencia_scores.aluno_id
  )
);

CREATE POLICY "Admin vê todos scores da instituição"
ON public.inteligencia_scores FOR SELECT
USING (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = inteligencia_scores.aluno_id
    AND p.institution_id = get_user_institution_id()
  )
);

CREATE POLICY "Admin pode inserir scores"
ON public.inteligencia_scores FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode atualizar scores"
ON public.inteligencia_scores FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode deletar scores"
ON public.inteligencia_scores FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- 4. TABELA: inteligencia_historico
-- Snapshots para gráfico de evolução
CREATE TABLE public.inteligencia_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  inteligencia_id smallint NOT NULL REFERENCES public.inteligencias(id),
  ano_letivo smallint NOT NULL,
  fase_numero smallint NOT NULL CHECK (fase_numero >= 1 AND fase_numero <= 8),
  score_fase decimal(5,2) NOT NULL,
  score_apos_formula decimal(5,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(aluno_id, inteligencia_id, ano_letivo, fase_numero)
);

-- RLS inteligencia_historico
ALTER TABLE public.inteligencia_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno vê próprio histórico"
ON public.inteligencia_historico FOR SELECT
USING (aluno_id = auth.uid());

CREATE POLICY "Professor vê histórico da sua casa"
ON public.inteligencia_historico FOR SELECT
USING (
  has_role(auth.uid(), 'professor') AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.professor_casa pc ON pc.professor_id = auth.uid() 
      AND pc.casa_id = p.casa_id AND pc.ativo = true
    WHERE p.id = inteligencia_historico.aluno_id
  )
);

CREATE POLICY "Admin vê todo histórico da instituição"
ON public.inteligencia_historico FOR SELECT
USING (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = inteligencia_historico.aluno_id
    AND p.institution_id = get_user_institution_id()
  )
);

CREATE POLICY "Admin pode inserir histórico"
ON public.inteligencia_historico FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode deletar histórico"
ON public.inteligencia_historico FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- 5. TABELA: bonus_solicitacoes
-- Bônus solicitados por professores (aguardando aprovação)
CREATE TABLE public.bonus_solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  solicitado_por uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  aluno_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  casa_id smallint REFERENCES public.inteligencias(id),
  tipo text NOT NULL CHECK (tipo IN ('pontos_gerais', 'inteligencia')),
  inteligencia_id smallint REFERENCES public.inteligencias(id),
  pontos smallint NOT NULL,
  motivo text NOT NULL,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  avaliado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  data_avaliacao timestamptz,
  feedback_avaliador text,
  created_at timestamptz DEFAULT now()
);

-- Índices bonus_solicitacoes
CREATE INDEX idx_bonus_status ON public.bonus_solicitacoes(status) WHERE status = 'pendente';
CREATE INDEX idx_bonus_institution ON public.bonus_solicitacoes(institution_id);

-- RLS bonus_solicitacoes
ALTER TABLE public.bonus_solicitacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professor vê próprias solicitações"
ON public.bonus_solicitacoes FOR SELECT
USING (solicitado_por = auth.uid());

CREATE POLICY "Admin vê todas solicitações da instituição"
ON public.bonus_solicitacoes FOR SELECT
USING (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Professor pode criar solicitação"
ON public.bonus_solicitacoes FOR INSERT
WITH CHECK (
  solicitado_por = auth.uid() AND
  has_role(auth.uid(), 'professor') AND
  institution_id = get_user_institution_id()
);

CREATE POLICY "Admin pode atualizar solicitações"
ON public.bonus_solicitacoes FOR UPDATE
USING (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Criador pode deletar pendente"
ON public.bonus_solicitacoes FOR DELETE
USING (solicitado_por = auth.uid() AND status = 'pendente');

CREATE POLICY "Admin pode deletar qualquer solicitação"
ON public.bonus_solicitacoes FOR DELETE
USING (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));
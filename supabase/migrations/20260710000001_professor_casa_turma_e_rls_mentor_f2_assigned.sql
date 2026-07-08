-- =============================================================
-- MENTOR F2 - PARTE ADITIVA (segura para aplicar antes do go-live).
-- Parecer Dados & Analytics 08/07/2026, modelo ASSIGNED-only aprovado pelo Fundador.
--
-- Cria: professor_casa_turma (recorte de turma do vinculo mentor<->Casa),
-- coluna criado_por (auditoria pedida por Riscos) em professor_casa_turma E
-- professor_casa, helper get_mentor_turma_ids, e as policies ASSIGNED de leitura
-- de aluno_turma e observacoes.
--
-- NAO dropa NENHUMA policy. A R18 institution-wide (mig 20260302202306) segue
-- viva de proposito: o F2 ANTIGO em producao depende dela. O assigned-only so
-- fica EFETIVO na Migration 2 (go-live), que dropa a R18.
--
-- RLS e OR: estas policies SOMAM leitura (subconjunto), nao restringem nada.
-- Zero regressao para Infantil/F1/aluno. Aluno nunca alcanca. Soft-delete intacto.
-- =============================================================

-- ---------- Auditoria: quem atribuiu (Riscos) ----------
ALTER TABLE public.professor_casa
  ADD COLUMN IF NOT EXISTS criado_por uuid REFERENCES public.profiles(id);
COMMENT ON COLUMN public.professor_casa.criado_por IS
  'Auditoria: quem atribuiu o mentor a Casa. NULL = linha anterior a este rastro.';

-- ---------- FK composta anti-cross-institution (aditiva) ----------
ALTER TABLE public.turmas
  ADD CONSTRAINT turmas_id_institution_uk UNIQUE (id, institution_id);

-- ---------- Tabela professor_casa_turma ----------
CREATE TABLE IF NOT EXISTS public.professor_casa_turma (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id    uuid     NOT NULL REFERENCES public.profiles(id)      ON DELETE CASCADE,
  casa_id         smallint NOT NULL REFERENCES public.inteligencias(id),
  turma_id        uuid     NOT NULL REFERENCES public.turmas(id)        ON DELETE CASCADE,
  institution_id  uuid     NOT NULL REFERENCES public.institutions(id)  ON DELETE CASCADE,
  ano_letivo      smallint NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::smallint,
  ativo           boolean  NOT NULL DEFAULT true,
  criado_por      uuid REFERENCES public.profiles(id) DEFAULT auth.uid(),
  created_at      timestamptz DEFAULT now(),
  UNIQUE (professor_id, casa_id, turma_id, ano_letivo),
  CONSTRAINT professor_casa_turma_turma_inst_fk
    FOREIGN KEY (turma_id, institution_id)
    REFERENCES public.turmas (id, institution_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pct_professor    ON public.professor_casa_turma(professor_id, ativo);
CREATE INDEX IF NOT EXISTS idx_pct_turma        ON public.professor_casa_turma(turma_id);
CREATE INDEX IF NOT EXISTS idx_pct_casa         ON public.professor_casa_turma(casa_id);
CREATE INDEX IF NOT EXISTS idx_pct_institution  ON public.professor_casa_turma(institution_id);

COMMENT ON TABLE public.professor_casa_turma IS
  'Recorte de TURMA do vinculo mentor<->Casa (F2). professor_casa = identidade de Casa do mentor (por ano); esta tabela = quais turmas esse mentor conduz. Escrita: so admin. Fonte da verdade do escopo de leitura assigned do mentor F2.';
COMMENT ON COLUMN public.professor_casa_turma.criado_por IS
  'Auditoria (Riscos): quem atribuiu (caller.id da aba Casas). DEFAULT auth.uid() como rede de seguranca.';

ALTER TABLE public.professor_casa_turma ENABLE ROW LEVEL SECURITY;

-- Leitura do vinculo: o proprio mentor ve os seus; admin ve os da instituicao.
DROP POLICY IF EXISTS "Mentor ve seus vinculos de turma" ON public.professor_casa_turma;
CREATE POLICY "Mentor ve seus vinculos de turma"
ON public.professor_casa_turma FOR SELECT
USING (professor_id = auth.uid());

DROP POLICY IF EXISTS "Admin ve vinculos de turma da instituicao" ON public.professor_casa_turma;
CREATE POLICY "Admin ve vinculos de turma da instituicao"
ON public.professor_casa_turma FOR SELECT
USING (
  institution_id = public.get_user_institution_id()
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Escrita: SO admin da instituicao, E o professor tem de deter a Casa (linha ativa
-- em professor_casa no mesmo ano) -> o recorte nunca diverge da identidade.
DROP POLICY IF EXISTS "Admin gerencia vinculos de turma" ON public.professor_casa_turma;
CREATE POLICY "Admin gerencia vinculos de turma"
ON public.professor_casa_turma FOR ALL
USING (
  institution_id = public.get_user_institution_id()
  AND public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  institution_id = public.get_user_institution_id()
  AND public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.professor_casa pc
    WHERE pc.professor_id   = professor_casa_turma.professor_id
      AND pc.casa_id        = professor_casa_turma.casa_id
      AND pc.institution_id = professor_casa_turma.institution_id
      AND pc.ano_letivo     = professor_casa_turma.ano_letivo
      AND pc.ativo = true
  )
);

-- ---------- Helper: turmas que o mentor conduz ----------
CREATE OR REPLACE FUNCTION public.get_mentor_turma_ids()
RETURNS uuid[]
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(turma_id), ARRAY[]::uuid[])
  FROM public.professor_casa_turma
  WHERE professor_id = auth.uid() AND ativo = true;
$$;
GRANT EXECUTE ON FUNCTION public.get_mentor_turma_ids() TO authenticated;

-- ---------- Policies ASSIGNED de leitura (aditivas) ----------
-- aluno_turma (roster das turmas conduzidas)
DROP POLICY IF EXISTS "Mentor F2 ve aluno_turma das turmas que conduz" ON public.aluno_turma;
CREATE POLICY "Mentor F2 ve aluno_turma das turmas que conduz"
ON public.aluno_turma FOR SELECT
USING (
  public.has_role(auth.uid(), 'professor'::app_role)
  AND turma_id = ANY (public.get_mentor_turma_ids())
);

-- observacoes (historia COMPLETA das criancas das turmas conduzidas; match por
-- enrollment). NAO filtra excluida_em (paridade com as demais); leitores filtram.
-- Somente SELECT: escrita/edicao/borracha do mentor seguem pelas policies atuais.
DROP POLICY IF EXISTS "Mentor F2 ve observacoes das turmas que conduz" ON public.observacoes;
CREATE POLICY "Mentor F2 ve observacoes das turmas que conduz"
ON public.observacoes FOR SELECT
USING (
  public.has_role(auth.uid(), 'professor'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.aluno_turma at
    WHERE at.aluno_id = observacoes.aluno_id
      AND at.turma_id = ANY (public.get_mentor_turma_ids())
  )
);

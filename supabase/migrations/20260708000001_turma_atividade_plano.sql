-- =============================================================
-- turma_atividade_plano: QUAIS atividades do banco entram em cada fase
-- de UMA TURMA, e em que ORDEM (o vínculo turma + fase + atividade).
--
-- O QUÊ: uma linha por (turma, ano, inteligência/fase, atividade). Define o
-- "caminho da fase" que a professora vê no cockpit: as atividades escolhidas
-- pelo dono da plataforma na tela "Definição de Trilha" (/arboria/trilha),
-- na sequência que ele montar (coluna `ordem`).
--
-- POR QUÊ: hoje a atividade cadastrada no banco (public.atividades) é
-- compartilhada por instituição + inteligência + segmento + faixa, mas NÃO
-- tem vínculo com a TURMA. Resultado: a atividade que o Fundador cria não
-- chega à professora, porque nada diz "esta atividade, nesta turma, nesta
-- fase, nesta posição". Esta tabela é esse vínculo.
--
-- ADITIVO: tabela nova. Não altera, renomeia nem dropa nada existente. O
-- banco `atividades` continua a fonte de verdade do CONTEÚDO; aqui só entra
-- a CURADORIA por turma (seleção + ordem). Uma turma sem plano para a fase
-- mantém o comportamento atual do app (fallback), então nada quebra para as
-- turmas já em uso.
--
-- SURFACING: o app lê este plano de forma TOLERANTE (ver
-- src/hooks/useTurmaAtividadePlano.ts): enquanto esta migration não estiver
-- aplicada, a leitura degrada para vazio e a aula segue no comportamento de
-- hoje. Só depois de aplicada é que o plano passa a aparecer.
--
-- ROLLBACK: por ser puramente aditiva, o rollback é
--   DROP TABLE IF EXISTS public.turma_atividade_plano;
-- Nenhuma observação histórica depende desta tabela (ela guarda curadoria de
-- atividades, não dado longitudinal de criança). Ainda assim: revisão de
-- Riscos + Dados antes do merge (mudança de esquema).
-- =============================================================

CREATE TABLE IF NOT EXISTS public.turma_atividade_plano (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  turma_id        uuid NOT NULL REFERENCES public.turmas(id)       ON DELETE CASCADE,
  ano_letivo      smallint NOT NULL,
  inteligencia_id smallint NOT NULL REFERENCES public.inteligencias(id),
  atividade_id    uuid NOT NULL
    CONSTRAINT turma_atividade_plano_atividade_id_fkey
    REFERENCES public.atividades(id) ON DELETE CASCADE,
  ordem           smallint NOT NULL DEFAULT 1,   -- posição da atividade dentro da fase
  ativo           boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  -- uma atividade não entra duas vezes na mesma fase da mesma turma/ano
  CONSTRAINT turma_atividade_plano_unico
    UNIQUE (turma_id, ano_letivo, inteligencia_id, atividade_id)
);

-- Leitura da aula: "as atividades desta turma, nesta fase, em ordem".
CREATE INDEX IF NOT EXISTS idx_turma_atividade_plano_lookup
  ON public.turma_atividade_plano (turma_id, ano_letivo, inteligencia_id, ordem);

DROP TRIGGER IF EXISTS update_turma_atividade_plano_updated_at ON public.turma_atividade_plano;
CREATE TRIGGER update_turma_atividade_plano_updated_at
  BEFORE UPDATE ON public.turma_atividade_plano
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.turma_atividade_plano ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- RLS
-- LÊ: educador da instituição (professor OU admin) e o dono (super_admin).
--     ALUNO NUNCA: o papel de aluno é 'user' e não entra em nenhuma policy.
--     (Não basta filtrar por institution_id: o aluno também pertence à
--      instituição; por isso a exigência EXPLÍCITA do papel professor/admin,
--      mesmo padrão de turma_fase_ordem.)
-- ESCREVE: admin da instituição e super_admin (a curadoria da trilha).
-- =============================================================
DROP POLICY IF EXISTS "Plano visivel educadores" ON public.turma_atividade_plano;
CREATE POLICY "Plano visivel educadores" ON public.turma_atividade_plano
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      institution_id = public.get_user_institution_id()
      AND (
        public.has_role(auth.uid(), 'professor'::public.app_role)
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
    )
  );

DROP POLICY IF EXISTS "Plano gerenciado por admin" ON public.turma_atividade_plano;
CREATE POLICY "Plano gerenciado por admin" ON public.turma_atividade_plano
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      institution_id = public.get_user_institution_id()
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      institution_id = public.get_user_institution_id()
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

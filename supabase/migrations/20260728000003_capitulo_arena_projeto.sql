-- ============================================================
-- capitulo_arena_projeto: os projetos da ARENA (capitulo da Casa Logico-Matematica).
-- Guarda (a) a MARCA de que o grupo concorre na Arena e (b) a DESCRICAO do projeto
-- (rascunho da IA ou escrita a mao pelo mentor) que vai pro site publico de votacao.
-- So o mentor da Casa Logico-Matematica (inteligencia_id=2) mexe nisso; a UI ja
-- gateia por casaMentor.id===2, e a RLS espelha a tabela de nota (professor/admin
-- da instituicao + super_admin). Pedido do Fundador 28/07.
--
-- Chave: capitulo + turma + papel(tema) + grupo. Um projeto por grupo.
-- publicado_em: setado quando o mentor clica "Gerar o site" (null = ainda nao no ar).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.capitulo_arena_projeto (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   uuid NOT NULL,
  capitulo_id      uuid NOT NULL,
  turma_id         uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  papel_id         uuid NOT NULL,
  grupo            smallint NOT NULL DEFAULT 1,
  concorre         boolean NOT NULL DEFAULT false,
  titulo           text,
  descricao        text,
  descricao_origem text NOT NULL DEFAULT 'manual' CHECK (descricao_origem IN ('manual','ia')),
  ordem            smallint,
  publicado_em     timestamptz,
  criado_por       uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (capitulo_id, turma_id, papel_id, grupo)
);

ALTER TABLE public.capitulo_arena_projeto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS caparenaproj_rw ON public.capitulo_arena_projeto;
CREATE POLICY caparenaproj_rw ON public.capitulo_arena_projeto
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (institution_id = public.get_user_institution_id()
        AND (public.has_role(auth.uid(), 'professor') OR public.has_role(auth.uid(), 'admin')))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (institution_id = public.get_user_institution_id()
        AND (public.has_role(auth.uid(), 'professor') OR public.has_role(auth.uid(), 'admin')))
  );

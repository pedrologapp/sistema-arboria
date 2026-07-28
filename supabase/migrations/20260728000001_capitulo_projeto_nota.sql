-- ============================================================
-- capitulo_projeto_nota: a NOTA do professor no PROJETO do grupo (F2). NAO e'
-- boletim: e' o ponderador da votacao (melhor projeto = votos x nota) e a trava
-- pra finalizar a fase (todo grupo precisa de nota). Pedido do Fundador 28/07.
-- Avalia o PROJETO (coletivo), nao a crianca -> nao viola a doutrina anti-score.
--
-- Chave: capitulo + turma + papel(tema) + grupo. Uma nota por grupo.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.capitulo_projeto_nota (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  capitulo_id    uuid NOT NULL,
  turma_id       uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  papel_id       uuid NOT NULL,
  grupo          smallint NOT NULL DEFAULT 1,
  nota           numeric(4,1) NOT NULL,
  criado_por     uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (capitulo_id, turma_id, papel_id, grupo)
);

ALTER TABLE public.capitulo_projeto_nota ENABLE ROW LEVEL SECURITY;

-- Mesma regra do bloco de notas: professor/admin da instituicao (+ super_admin).
DROP POLICY IF EXISTS capprojnota_rw ON public.capitulo_projeto_nota;
CREATE POLICY capprojnota_rw ON public.capitulo_projeto_nota
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

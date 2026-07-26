-- ============================================================
-- capitulo_grupo_notas: as notas de GRUPO do bloco de observacao ao vivo do F2.
-- Pedido do Fundador 26/07. A nota sobre um ALUNO vira observacao normal
-- (observacoes, com origem_captura='capitulo' + capitulo_id, ja existentes); a
-- nota sobre o GRUPO fica aqui (nao e' dado identificado de crianca, e' o olhar
-- do professor sobre a apresentacao coletiva). Nao forca o texto em cada crianca.
--
-- Chave do grupo (espelha capitulo_alocacoes): capitulo + turma + papel + grupo.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.capitulo_grupo_notas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  capitulo_id    uuid NOT NULL,
  turma_id       uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  papel_id       uuid,
  grupo          smallint,
  texto          text NOT NULL,
  criado_por     uuid,
  aluno_nome_avulso text,   -- nota sobre pessoa sem grupo / nao cadastrada (nome a mao)
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_capgruponotas ON public.capitulo_grupo_notas(capitulo_id, turma_id, papel_id, grupo);

ALTER TABLE public.capitulo_grupo_notas ENABLE ROW LEVEL SECURITY;

-- Espelha a RLS de observacoes: professor/admin da instituicao (+ super_admin).
-- O mentor do F2 tem role 'professor' mas NAO esta em professor_turma (mentoria
-- por Casa), entao checar professor_turma quebrava.
DROP POLICY IF EXISTS capgruponotas_rw ON public.capitulo_grupo_notas;
CREATE POLICY capgruponotas_rw ON public.capitulo_grupo_notas
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

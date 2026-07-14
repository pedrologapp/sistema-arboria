-- =============================================================
-- COORDENADOR (parte D): diario proprio do coordenador.
--
-- O QUE E: caderno de coordenacao. O coordenador escreve as anotacoes DELE,
-- organizadas por segmento e (opcionalmente) por turma. NAO e observacao de
-- crianca: nao tem fase do ciclo, nao tem nivel da curva, nao aponta pra aluno,
-- e NAO alimenta nenhum pipeline de IA. Dono do dado = o proprio coordenador
-- (coordenador_id = auth.uid()).
--
-- ESCOPO NO BANCO: reusa get_coordenador_segmentos() e get_coordenador_turma_ids()
-- (20260714000002). A entrada so nasce/edita dentro do escopo da concessao.
-- Turma nula = anotacao de segmento inteiro.
--
-- SEM aluno_id (v1): decisao Riscos + Dados 14/07. Registro sobre crianca e do
-- professor, na tabela observacoes, com contexto completo. Aqui NAO se duplica -
-- e a barreira central que impede o diario de virar trilho paralelo de laudo.
--
-- QUEM LE: so o proprio coordenador autor e o super_admin (suporte/auditoria).
-- Admin da escola, professor e aluno: NAO (default deny). Decisao do Fundador
-- (Opcao A, 14/07): o diario e caderno pessoal de trabalho, nao documento
-- institucional.
--
-- ADITIVO: tabela nova + trigger + policies novas. Nada existente e tocado.
-- Soft-delete (excluida_em/excluida_por), paridade com observacoes; sem FOR DELETE.
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS trg_coordenador_diario_updated_at ON public.coordenador_diario;
--   DROP TABLE   IF EXISTS public.coordenador_diario;
-- =============================================================

CREATE TABLE IF NOT EXISTS public.coordenador_diario (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coordenador_id  uuid NOT NULL REFERENCES public.profiles(id)     ON DELETE CASCADE,
  institution_id  uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  segmento        text NOT NULL CHECK (segmento IN ('infantil','fundamental1','fundamental2')),
  turma_id        uuid REFERENCES public.turmas(id) ON DELETE SET NULL,
  titulo          text,
  texto           text NOT NULL CHECK (length(trim(texto)) > 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  excluida_em     timestamptz,
  excluida_por    uuid REFERENCES public.profiles(id)
);

-- Listagem tipica: diario do coordenador logado, recente primeiro, so ativas.
CREATE INDEX IF NOT EXISTS idx_coordenador_diario_coord
  ON public.coordenador_diario (coordenador_id, created_at DESC)
  WHERE excluida_em IS NULL;

-- Filtro por turma (aba de uma turma especifica).
CREATE INDEX IF NOT EXISTS idx_coordenador_diario_turma
  ON public.coordenador_diario (turma_id, created_at DESC)
  WHERE excluida_em IS NULL;

-- Mantem updated_at (funcao ja existe no app).
DROP TRIGGER IF EXISTS trg_coordenador_diario_updated_at ON public.coordenador_diario;
CREATE TRIGGER trg_coordenador_diario_updated_at
  BEFORE UPDATE ON public.coordenador_diario
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.coordenador_diario ENABLE ROW LEVEL SECURITY;

-- SELECT: so o dono.
DROP POLICY IF EXISTS "Coordenador le o proprio diario" ON public.coordenador_diario;
CREATE POLICY "Coordenador le o proprio diario" ON public.coordenador_diario
  FOR SELECT TO authenticated
  USING (
    coordenador_id = auth.uid()
    AND public.has_role(auth.uid(), 'coordenador'::public.app_role)
  );

-- INSERT: entrada propria E dentro do escopo (turma nula = segmento, sempre valido).
DROP POLICY IF EXISTS "Coordenador escreve no proprio diario" ON public.coordenador_diario;
CREATE POLICY "Coordenador escreve no proprio diario" ON public.coordenador_diario
  FOR INSERT TO authenticated
  WITH CHECK (
    coordenador_id = auth.uid()
    AND public.has_role(auth.uid(), 'coordenador'::public.app_role)
    AND segmento = ANY(public.get_coordenador_segmentos())
    AND (turma_id IS NULL OR turma_id = ANY(public.get_coordenador_turma_ids()))
  );

-- UPDATE: edita/soft-deleta a propria entrada, mantendo o escopo valido.
DROP POLICY IF EXISTS "Coordenador edita o proprio diario" ON public.coordenador_diario;
CREATE POLICY "Coordenador edita o proprio diario" ON public.coordenador_diario
  FOR UPDATE TO authenticated
  USING (
    coordenador_id = auth.uid()
    AND public.has_role(auth.uid(), 'coordenador'::public.app_role)
  )
  WITH CHECK (
    coordenador_id = auth.uid()
    AND segmento = ANY(public.get_coordenador_segmentos())
    AND (turma_id IS NULL OR turma_id = ANY(public.get_coordenador_turma_ids()))
  );

-- Auditoria/suporte: o dono da plataforma (super_admin) le tudo. Sem escrita.
DROP POLICY IF EXISTS "Diario do coordenador auditado por super_admin" ON public.coordenador_diario;
CREATE POLICY "Diario do coordenador auditado por super_admin" ON public.coordenador_diario
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Sem policy FOR DELETE: soft-delete via UPDATE, paridade com observacoes.

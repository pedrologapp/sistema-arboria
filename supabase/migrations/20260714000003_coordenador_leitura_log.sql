-- =============================================================
-- COORDENADOR (parte C de 3): log de leitura do mural.
--
-- POR QUE EXISTE: o coordenador ve o TEXTO INTEGRAL das observacoes (mural),
-- decisao do Fundador (14/07/2026) que SOBREPOS a recomendacao do Riscos de
-- expor so metadado. Em troca, o Riscos MANTEVE uma condicao: registrar CADA
-- abertura do mural/turma pelo coordenador. Este log e essa condicao. E uma
-- trilha de auditoria de ACESSO (quem abriu, qual turma, quando), nao um
-- espelho do conteudo lido.
--
-- COMO O APP USA: ao abrir o mural de uma turma (ou o painel), o app faz UM
-- insert nesta tabela. Barato e append-only. NAO ha update nem delete: um log
-- que se pode editar nao e log.
--
-- NAO ALIMENTA IA: dado de governanca interna, fora de qualquer pipeline de
-- analise.
--
-- ADITIVO: tabela nova, duas policies novas. Nada existente e tocado.
-- ROLLBACK (testar antes do merge):
--   DROP TABLE IF EXISTS public.coordenador_leitura_log;
-- Revisao de Riscos + Dados antes do merge (mudanca de esquema).
-- =============================================================

CREATE TABLE IF NOT EXISTS public.coordenador_leitura_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coordenador_id  uuid NOT NULL REFERENCES public.profiles(id),
  institution_id  uuid NOT NULL,
  turma_id        uuid REFERENCES public.turmas(id),
  contexto        text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Consultas de auditoria tipicas: por coordenador e por turma, no tempo.
CREATE INDEX IF NOT EXISTS idx_coordenador_leitura_log_coord
  ON public.coordenador_leitura_log (coordenador_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coordenador_leitura_log_turma
  ON public.coordenador_leitura_log (turma_id, created_at DESC);

ALTER TABLE public.coordenador_leitura_log ENABLE ROW LEVEL SECURITY;

-- O coordenador so registra a PROPRIA leitura (nao pode forjar log de outro).
-- Exige tambem o papel, para nenhum outro perfil escrever nesta tabela.
DROP POLICY IF EXISTS "Coordenador registra a propria leitura" ON public.coordenador_leitura_log;
CREATE POLICY "Coordenador registra a propria leitura" ON public.coordenador_leitura_log
  FOR INSERT TO authenticated
  WITH CHECK (
    coordenador_id = auth.uid()
    AND public.has_role(auth.uid(), 'coordenador'::public.app_role)
  );

-- Leitura do log = auditoria, exclusiva do dono da plataforma. O proprio
-- coordenador NAO le o log (evita que ele monitore/edite a propria trilha).
DROP POLICY IF EXISTS "Log de leitura auditado por super_admin" ON public.coordenador_leitura_log;
CREATE POLICY "Log de leitura auditado por super_admin" ON public.coordenador_leitura_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Sem policy de UPDATE nem DELETE: append-only por construcao (default deny).

-- =============================================================
-- COORDENADOR (parte B de 3): atribuicao + funcoes de escopo + RLS + view.
--
-- PAPEL: coordenador = SO-LEITURA por SEGMENTO. Uma pessoa recebe uma ou mais
-- concessoes (coordenador_segmento): "fulano coordena o fundamental1 da
-- instituicao X". A partir dai ele LE (nunca escreve) as turmas daquele
-- segmento naquela instituicao: painel, alunos, professores, trilha, eventos,
-- plano de atividades e o MURAL de observacoes.
--
-- ESCOPO NO BANCO, NAO NA UI: todo o recorte "coordenador so ve o seu
-- segmento" e imposto por RLS aqui (funcoes SECURITY DEFINER + policies), como
-- manda o principio de controle de acesso no backend. O frontend nao decide
-- quem ve o que.
--
-- MURAL COM TEXTO COMPLETO: por DECISAO DO FUNDADOR (14/07/2026), o
-- coordenador ve o TEXTO INTEGRAL da observacao (observacao_texto + anexo_url),
-- nao um metadado reduzido. O setor de Riscos havia recomendado projecao
-- reduzida (so metadado); o Fundador SOBREPOS essa recomendacao. Por isso a
-- policy de observacoes abaixo e um SELECT normal na tabela inteira, sem view
-- de projecao. Condicao que o Riscos MANTEVE em troca: log de leitura do mural
-- (ver parte C, migration 20260714000003).
--
-- ADITIVO: cria uma tabela nova (coordenador_segmento), duas funcoes novas e
-- policies ADITIVAS de SELECT em tabelas existentes. NENHUMA policy existente
-- e alterada, renomeada ou removida. NENHUMA policy de escrita e concedida ao
-- coordenador: escrita segue negada por padrao (default deny do RLS).
-- Nenhuma observacao historica e tocada.
--
-- ROLLBACK (testar antes do merge):
--   DROP VIEW  IF EXISTS public.vw_coordenador_turma_painel;
--   DROP INDEX IF EXISTS public.idx_obs_turma_fase_ativas;
--   DROP POLICY IF EXISTS "Coordenador le turmas do escopo"        ON public.turmas;
--   DROP POLICY IF EXISTS "Coordenador le professor_turma escopo"  ON public.professor_turma;
--   DROP POLICY IF EXISTS "Coordenador le aluno_turma escopo"      ON public.aluno_turma;
--   DROP POLICY IF EXISTS "Coordenador le turma_trilha escopo"     ON public.turma_trilha;
--   DROP POLICY IF EXISTS "Coordenador le turma_fase_evento escopo" ON public.turma_fase_evento;
--   DROP POLICY IF EXISTS "Coordenador le turma_atividade_evento escopo" ON public.turma_atividade_evento;
--   DROP POLICY IF EXISTS "Coordenador le turma_atividade_plano escopo"  ON public.turma_atividade_plano;
--   DROP POLICY IF EXISTS "Coordenador le observacoes do escopo"   ON public.observacoes;
--   DROP POLICY IF EXISTS "Coordenador le profiles do escopo"      ON public.profiles;
--   DROP FUNCTION IF EXISTS public.get_coordenador_turma_ids();
--   DROP FUNCTION IF EXISTS public.get_coordenador_segmentos();
--   DROP TABLE IF EXISTS public.coordenador_segmento;
-- (O valor de enum 'coordenador' nao e removivel; ver parte A.)
-- Revisao de Riscos + Dados antes do merge (mudanca de esquema). NAO alimenta IA.
-- =============================================================

-- -------------------------------------------------------------
-- 1) TABELA DE ATRIBUICAO: quem coordena qual segmento, onde.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coordenador_segmento (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coordenador_id  uuid NOT NULL REFERENCES public.profiles(id)     ON DELETE CASCADE,
  institution_id  uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  segmento        text NOT NULL CHECK (segmento IN ('infantil','fundamental1','fundamental2')),
  ativo           boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES public.profiles(id),
  CONSTRAINT coordenador_segmento_unico UNIQUE (coordenador_id, institution_id, segmento)
);

-- Escopo do proprio coordenador (funcao get_coordenador_turma_ids): busca por
-- coordenador_id filtrando ativo.
CREATE INDEX IF NOT EXISTS idx_coordenador_segmento_coord
  ON public.coordenador_segmento (coordenador_id) WHERE ativo;

-- Descoberta reversa "quem coordena este segmento nesta instituicao".
CREATE INDEX IF NOT EXISTS idx_coordenador_segmento_inst_seg
  ON public.coordenador_segmento (institution_id, segmento) WHERE ativo;

ALTER TABLE public.coordenador_segmento ENABLE ROW LEVEL SECURITY;

-- Quem administra a concessao: o dono da plataforma (super_admin). O
-- coordenador so ENXERGA as proprias concessoes (nao gerencia nada).
DROP POLICY IF EXISTS "Atribuicao gerenciada por super_admin" ON public.coordenador_segmento;
CREATE POLICY "Atribuicao gerenciada por super_admin" ON public.coordenador_segmento
  FOR ALL TO authenticated
  USING      (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Coordenador ve as proprias concessoes" ON public.coordenador_segmento;
CREATE POLICY "Coordenador ve as proprias concessoes" ON public.coordenador_segmento
  FOR SELECT TO authenticated
  USING (coordenador_id = auth.uid());

-- -------------------------------------------------------------
-- 2) FUNCOES DE ESCOPO (espelham get_professor_turma_ids).
--    SECURITY DEFINER: leem coordenador_segmento/turmas por baixo do RLS,
--    para nao criar recursao de policy. STABLE, search_path travado.
-- -------------------------------------------------------------

-- Segmentos que o coordenador logado coordena (ex.: {'fundamental1'}).
CREATE OR REPLACE FUNCTION public.get_coordenador_segmentos()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(segmento), ARRAY[]::text[])
  FROM public.coordenador_segmento
  WHERE coordenador_id = auth.uid()
    AND ativo;
$$;

-- Turmas do escopo do coordenador logado.
-- PRENDE a turma a institution_id DA CONCESSAO (cs.institution_id), NAO ao
-- get_user_institution_id() do chamador: uma pessoa poderia, em tese, coordenar
-- segmento de outra instituicao, e o escopo tem de seguir a concessao.
-- COALESCE(t.segmento,'infantil') aplica o mesmo fallback do resto do app.
CREATE OR REPLACE FUNCTION public.get_coordenador_turma_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(t.id), ARRAY[]::uuid[])
  FROM public.coordenador_segmento cs
  JOIN public.turmas t
    ON t.institution_id = cs.institution_id
   AND COALESCE(t.segmento, 'infantil') = cs.segmento
  WHERE cs.coordenador_id = auth.uid()
    AND cs.ativo;
$$;

GRANT EXECUTE ON FUNCTION public.get_coordenador_segmentos()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_coordenador_turma_ids()  TO authenticated;

-- -------------------------------------------------------------
-- 3) POLICIES SO DE SELECT (aditivas). Cada uma exige explicitamente o papel
--    coordenador E turma_id dentro do escopo. Sem policy de INSERT/UPDATE/
--    DELETE: escrita permanece negada por padrao.
-- -------------------------------------------------------------

-- turmas: as do escopo (aqui o id DA propria turma e a chave).
DROP POLICY IF EXISTS "Coordenador le turmas do escopo" ON public.turmas;
CREATE POLICY "Coordenador le turmas do escopo" ON public.turmas
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'coordenador'::public.app_role)
    AND id = ANY(public.get_coordenador_turma_ids())
  );

-- professor_turma: vinculos das turmas do escopo.
DROP POLICY IF EXISTS "Coordenador le professor_turma escopo" ON public.professor_turma;
CREATE POLICY "Coordenador le professor_turma escopo" ON public.professor_turma
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'coordenador'::public.app_role)
    AND turma_id = ANY(public.get_coordenador_turma_ids())
  );

-- aluno_turma: matriculas das turmas do escopo.
DROP POLICY IF EXISTS "Coordenador le aluno_turma escopo" ON public.aluno_turma;
CREATE POLICY "Coordenador le aluno_turma escopo" ON public.aluno_turma
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'coordenador'::public.app_role)
    AND turma_id = ANY(public.get_coordenador_turma_ids())
  );

-- turma_trilha: posicao/andamento da trilha das turmas do escopo.
DROP POLICY IF EXISTS "Coordenador le turma_trilha escopo" ON public.turma_trilha;
CREATE POLICY "Coordenador le turma_trilha escopo" ON public.turma_trilha
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'coordenador'::public.app_role)
    AND turma_id = ANY(public.get_coordenador_turma_ids())
  );

-- turma_fase_evento: eventos de fase das turmas do escopo.
DROP POLICY IF EXISTS "Coordenador le turma_fase_evento escopo" ON public.turma_fase_evento;
CREATE POLICY "Coordenador le turma_fase_evento escopo" ON public.turma_fase_evento
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'coordenador'::public.app_role)
    AND turma_id = ANY(public.get_coordenador_turma_ids())
  );

-- turma_atividade_evento: eventos de atividade das turmas do escopo.
DROP POLICY IF EXISTS "Coordenador le turma_atividade_evento escopo" ON public.turma_atividade_evento;
CREATE POLICY "Coordenador le turma_atividade_evento escopo" ON public.turma_atividade_evento
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'coordenador'::public.app_role)
    AND turma_id = ANY(public.get_coordenador_turma_ids())
  );

-- turma_atividade_plano: a curadoria de atividades por fase das turmas do escopo.
-- (Nome da tabela do plano de atividades confirmado no esquema real:
--  public.turma_atividade_plano, criada em 20260708000001.)
DROP POLICY IF EXISTS "Coordenador le turma_atividade_plano escopo" ON public.turma_atividade_plano;
CREATE POLICY "Coordenador le turma_atividade_plano escopo" ON public.turma_atividade_plano
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'coordenador'::public.app_role)
    AND turma_id = ANY(public.get_coordenador_turma_ids())
  );

-- observacoes: o MURAL. TEXTO COMPLETO por decisao do Fundador (14/07). SELECT
-- normal na tabela (inclui observacao_texto e anexo_url). NAO filtra
-- excluida_em aqui, em PARIDADE com as demais policies de observacoes do app:
-- quem filtra o soft-delete e o leitor (a view/painel), nunca a policy.
DROP POLICY IF EXISTS "Coordenador le observacoes do escopo" ON public.observacoes;
CREATE POLICY "Coordenador le observacoes do escopo" ON public.observacoes
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'coordenador'::public.app_role)
    AND turma_id = ANY(public.get_coordenador_turma_ids())
  );

-- profiles: apenas as linhas de ALUNOS e PROFESSORES das turmas do escopo
-- (nome dos alunos no painel, nome do professor no vinculo). Nada alem disso.
DROP POLICY IF EXISTS "Coordenador le profiles do escopo" ON public.profiles;
CREATE POLICY "Coordenador le profiles do escopo" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'coordenador'::public.app_role)
    AND (
      EXISTS (
        SELECT 1 FROM public.aluno_turma at
        WHERE at.aluno_id = profiles.id
          AND at.turma_id = ANY(public.get_coordenador_turma_ids())
      )
      OR EXISTS (
        SELECT 1 FROM public.professor_turma pt
        WHERE pt.professor_id = profiles.id
          AND pt.turma_id = ANY(public.get_coordenador_turma_ids())
      )
    )
  );

-- -------------------------------------------------------------
-- 4) VIEW DO PAINEL: uma linha por turma do escopo, com o resumo do mural.
--    security_invoker=true => roda com o RLS de QUEM consulta. Assim a view
--    nao vaza nada: o coordenador so ve, atraves dela, as turmas/observacoes
--    que as policies acima ja permitem.
--
--    n_alunos           = matriculas ativas da turma.
--    n_observados_fase  = alunos DISTINTOS com observacao ATIVA na FASE ATUAL
--                         da turma (inteligencia_fase = ordem_atual da trilha).
--    A trilha usada e a do ano corrente (ano_letivo mais recente da turma).
-- -------------------------------------------------------------
DROP VIEW IF EXISTS public.vw_coordenador_turma_painel;
CREATE VIEW public.vw_coordenador_turma_painel
WITH (security_invoker = true) AS
SELECT
  t.id                          AS turma_id,
  t.institution_id              AS institution_id,
  t.nome                        AS nome,
  t.serie                       AS serie,
  COALESCE(t.segmento, 'infantil') AS segmento,
  tt.ano_letivo                 AS ano_letivo,
  tt.ordem_atual                AS ordem_atual,
  tt.iniciada_em                AS iniciada_em,
  COALESCE(al.n_alunos, 0)      AS n_alunos,
  COALESCE(ob.n_observados_fase, 0) AS n_observados_fase
FROM public.turmas t
-- trilha do ano corrente (a mais recente da turma)
LEFT JOIN LATERAL (
  SELECT tt2.ano_letivo, tt2.ordem_atual, tt2.iniciada_em
  FROM public.turma_trilha tt2
  WHERE tt2.turma_id = t.id
  ORDER BY tt2.ano_letivo DESC
  LIMIT 1
) tt ON true
-- total de matriculas ativas
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS n_alunos
  FROM public.aluno_turma at
  WHERE at.turma_id = t.id
    AND at.ativo IS TRUE
) al ON true
-- alunos distintos com observacao ativa na fase atual
LEFT JOIN LATERAL (
  SELECT COUNT(DISTINCT o.aluno_id)::int AS n_observados_fase
  FROM public.observacoes o
  WHERE o.turma_id = t.id
    AND o.excluida_em IS NULL
    AND o.inteligencia_fase = tt.ordem_atual
) ob ON true;

GRANT SELECT ON public.vw_coordenador_turma_painel TO authenticated;

-- Suporta o COUNT por (turma, fase) do mural sem varrer a tabela inteira.
CREATE INDEX IF NOT EXISTS idx_obs_turma_fase_ativas
  ON public.observacoes (turma_id, inteligencia_fase, aluno_id)
  WHERE excluida_em IS NULL;

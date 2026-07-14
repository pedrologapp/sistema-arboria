-- =============================================================
-- COORDENADOR (fix 2): crava o escopo do coordenador na propria view.
--
-- CONTEXTO: turmas tem uma policy antiga e ampla ("Usuarios veem turmas da
-- instituicao", role public, institution_id = get_user_institution_id()) que
-- libera QUALQUER autenticado a ver TODAS as turmas da instituicao. A RLS e
-- OR-permissiva (aditiva): essa policy ampla vence, entao a policy do
-- coordenador (id = ANY(get_coordenador_turma_ids())) nao restringe nada por si
-- so. Resultado: a view (security_invoker) devolvia as 25 turmas da instituicao,
-- e a coordenadora do F1+F2 enxergaria ate o Infantil.
--
-- IMPORTANTE (o que NAO vaza): observacoes e aluno_turma NAO tem policy ampla de
-- instituicao, entao dado sensivel de crianca (observacao, vinculo) continua
-- restrito por papel/escopo. Isso aqui e so metadado de turma.
--
-- FIX: a view e a fonte de dados do visor do coordenador, entao ela mesma filtra
-- por get_coordenador_turma_ids(). Com security_invoker=true a funcao usa o
-- auth.uid() do coordenador logado. Assim o painel devolve EXATAMENTE as turmas
-- do segmento concedido, independente da policy ampla existir para o resto do app.
-- Os turma_ids que a UI usa a jusante (observacoes/professores/mural) saem daqui,
-- entao o recorte se propaga.
-- =============================================================

DROP VIEW IF EXISTS public.vw_coordenador_turma_painel;

CREATE VIEW public.vw_coordenador_turma_painel
WITH (security_invoker = true) AS
  SELECT
    t.id AS turma_id,
    t.institution_id,
    t.nome,
    t.serie,
    COALESCE(t.segmento, 'infantil'::text) AS segmento,
    tt.ano_letivo,
    tt.ordem_atual,
    tt.iniciada_em,
    COALESCE(al.n_alunos, 0) AS n_alunos,
    COALESCE(ob.n_observados_fase, 0) AS n_observados_fase
  FROM public.turmas t
    LEFT JOIN LATERAL (
      SELECT tt2.ano_letivo, tt2.ordem_atual, tt2.iniciada_em
      FROM public.turma_trilha tt2
      WHERE tt2.turma_id = t.id
      ORDER BY tt2.ano_letivo DESC
      LIMIT 1
    ) tt ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::integer AS n_alunos
      FROM public.aluno_turma at
      WHERE at.turma_id = t.id AND at.ativo IS TRUE
    ) al ON true
    LEFT JOIN LATERAL (
      SELECT count(DISTINCT o.aluno_id)::integer AS n_observados_fase
      FROM public.observacoes o
      WHERE o.turma_id = t.id AND o.excluida_em IS NULL AND o.inteligencia_fase = tt.ordem_atual
    ) ob ON true
  -- Escopo cravado: so as turmas do segmento concedido ao coordenador logado.
  WHERE t.id = ANY(public.get_coordenador_turma_ids());

GRANT SELECT ON public.vw_coordenador_turma_painel TO authenticated;

-- ROLLBACK: recriar a view sem a clausula WHERE (versao anterior).

-- ============================================================
-- ranking_casas (ponderado por membro) — Fundador 16/07.
-- Problema: as Casas têm tamanhos diferentes (ex.: Interpessoal 37 membros,
-- Espacial 13). Na SOMA pura a Casa maior sempre leva vantagem. Solução (opção A,
-- matematicamente correta): ranquear pela MÉDIA POR MEMBRO = total_pontos /
-- número de membros da Casa (TODOS os membros, não só os ativos: incentiva a
-- Casa inteira a participar).
--
-- O ponto do ALUNO não muda (nota x 10). Muda só a conta do coletivo.
-- Mantém total_pontos e total_alunos_ativos pra contexto; adiciona total_membros
-- e media_por_membro; a posicao passa a ser pela media.
-- ============================================================

DROP VIEW IF EXISTS public.ranking_casas;

CREATE VIEW public.ranking_casas AS
WITH pts AS (
  SELECT casa_id, institution_id, ano_letivo,
         SUM(pontos)               AS total_pontos,
         COUNT(DISTINCT aluno_id)  AS total_alunos_ativos
  FROM public.pontos_gerais
  WHERE casa_id IS NOT NULL
  GROUP BY casa_id, institution_id, ano_letivo
),
membros AS (
  SELECT casa_id, institution_id, COUNT(*) AS total_membros
  FROM public.profiles
  WHERE casa_id IS NOT NULL
  GROUP BY casa_id, institution_id
)
SELECT
  i.id                                   AS casa_id,
  i.nome                                 AS casa_nome,
  i.emoji                                AS casa_emoji,
  i.cor_hex                              AS casa_cor,
  p.institution_id,
  p.ano_letivo,
  COALESCE(p.total_pontos, 0)::bigint    AS total_pontos,
  COALESCE(p.total_alunos_ativos, 0)     AS total_alunos_ativos,
  COALESCE(m.total_membros, 0)           AS total_membros,
  ROUND(COALESCE(p.total_pontos, 0)::numeric / NULLIF(m.total_membros, 0), 1) AS media_por_membro,
  -- Pontos da Casa (o numero bonito, justo por tamanho): media por membro x 10.
  -- Mesma ordem da media; so reinflado pra ficar grande e gostoso pra crianca.
  ROUND(COALESCE(p.total_pontos, 0)::numeric * 10 / NULLIF(m.total_membros, 0)) AS pontos_casa,
  RANK() OVER (
    PARTITION BY p.institution_id, p.ano_letivo
    ORDER BY (COALESCE(p.total_pontos, 0)::numeric / NULLIF(m.total_membros, 0)) DESC NULLS LAST
  ) AS posicao
FROM public.inteligencias i
LEFT JOIN pts p     ON p.casa_id = i.id
LEFT JOIN membros m ON m.casa_id = i.id AND m.institution_id = p.institution_id;

COMMENT ON VIEW public.ranking_casas IS
  'Ranking das Casas PONDERADO por membro (posicao = media_por_membro = total_pontos / total_membros). O ponto individual nao muda; so a conta do coletivo.';

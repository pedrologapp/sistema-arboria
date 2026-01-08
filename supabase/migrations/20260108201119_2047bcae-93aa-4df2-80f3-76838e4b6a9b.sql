-- =============================================
-- CORRIGIR SECURITY DAS VIEWS - USAR INVOKER
-- Para que as views respeitem RLS do usuário
-- =============================================

-- Recriar VIEW 1: ranking_casas com SECURITY INVOKER
CREATE OR REPLACE VIEW ranking_casas 
WITH (security_invoker = on) AS
SELECT
  i.id as casa_id,
  i.nome as casa_nome,
  i.emoji as casa_emoji,
  i.cor_hex as casa_cor,
  pg.institution_id,
  pg.ano_letivo,
  COALESCE(SUM(pg.pontos), 0) as total_pontos,
  COUNT(DISTINCT pg.aluno_id) as total_alunos_ativos,
  RANK() OVER (
    PARTITION BY pg.institution_id, pg.ano_letivo
    ORDER BY COALESCE(SUM(pg.pontos), 0) DESC
  ) as posicao
FROM inteligencias i
LEFT JOIN pontos_gerais pg ON pg.casa_id = i.id
GROUP BY i.id, i.nome, i.emoji, i.cor_hex, 
         pg.institution_id, pg.ano_letivo
ORDER BY posicao;

-- Recriar VIEW 2: ranking_alunos_por_casa com SECURITY INVOKER
CREATE OR REPLACE VIEW ranking_alunos_por_casa 
WITH (security_invoker = on) AS
SELECT
  p.id as aluno_id,
  p.full_name as aluno_nome,
  p.casa_id,
  i.nome as casa_nome,
  i.emoji as casa_emoji,
  p.institution_id,
  pg.ano_letivo,
  COALESCE(SUM(pg.pontos), 0) as total_pontos,
  COUNT(DISTINCT pg.missao_id) as missoes_completadas,
  RANK() OVER (
    PARTITION BY p.casa_id, p.institution_id, pg.ano_letivo
    ORDER BY COALESCE(SUM(pg.pontos), 0) DESC
  ) as posicao_na_casa
FROM profiles p
JOIN inteligencias i ON i.id = p.casa_id
LEFT JOIN pontos_gerais pg ON pg.aluno_id = p.id
WHERE p.casa_id IS NOT NULL
GROUP BY p.id, p.full_name, p.casa_id, i.nome, 
         i.emoji, p.institution_id, pg.ano_letivo
ORDER BY p.casa_id, posicao_na_casa;

-- Recriar VIEW 3: perfil_inteligencias_aluno com SECURITY INVOKER
CREATE OR REPLACE VIEW perfil_inteligencias_aluno 
WITH (security_invoker = on) AS
SELECT
  s.aluno_id,
  s.ano_letivo,
  i.id as inteligencia_id,
  i.codigo as inteligencia_codigo,
  i.nome as inteligencia_nome,
  i.emoji as inteligencia_emoji,
  i.cor_hex as inteligencia_cor,
  s.score_atual,
  s.total_evidencias,
  p.casa_id = i.id as eh_casa_do_aluno
FROM inteligencia_scores s
JOIN inteligencias i ON i.id = s.inteligencia_id
JOIN profiles p ON p.id = s.aluno_id
ORDER BY s.aluno_id, i.ordem;
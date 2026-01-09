-- Dropar e recriar a view para incluir brasao_url
DROP VIEW IF EXISTS perfil_inteligencias_aluno;

CREATE VIEW perfil_inteligencias_aluno AS
SELECT 
    s.aluno_id,
    s.ano_letivo,
    i.id AS inteligencia_id,
    i.codigo AS inteligencia_codigo,
    i.nome AS inteligencia_nome,
    i.emoji AS inteligencia_emoji,
    i.cor_hex AS inteligencia_cor,
    i.brasao_url AS inteligencia_brasao_url,
    s.score_atual,
    s.total_evidencias,
    p.casa_id = i.id AS eh_casa_do_aluno
FROM inteligencia_scores s
JOIN inteligencias i ON i.id = s.inteligencia_id
JOIN profiles p ON p.id = s.aluno_id
ORDER BY s.aluno_id, i.ordem;
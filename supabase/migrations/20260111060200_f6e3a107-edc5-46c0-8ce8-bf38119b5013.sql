
-- Recriar a VIEW sem SECURITY DEFINER (usando SECURITY INVOKER que é o padrão)
-- A segurança é controlada pelas funções helper que usam SECURITY DEFINER

DROP VIEW IF EXISTS vw_estados_alunos;

CREATE VIEW vw_estados_alunos AS
WITH ultimas_obs AS (
  SELECT 
    o.aluno_id,
    s.valencia as tipo_sinal,
    s.label_pt as sinal,
    s.codigo as sinal_codigo,
    o.created_at,
    ROW_NUMBER() OVER (PARTITION BY o.aluno_id ORDER BY o.created_at DESC) as rn
  FROM observacoes o
  JOIN sinais s ON s.id = o.sinal_id
)
SELECT 
  p.id as aluno_id,
  p.nome,
  p.sobrenome,
  p.full_name,
  p.serie,
  p.turma,
  p.casa_id,
  i.nome as casa_nome,
  i.cor_hex as casa_cor,
  p.institution_id,
  p.avatar_url,
  u1.tipo_sinal as ultima_tipo,
  u1.sinal as ultima_sinal,
  u1.sinal_codigo as ultimo_sinal_codigo,
  u2.tipo_sinal as penultima_tipo,
  u2.sinal as penultima_sinal,
  u2.sinal_codigo as penultimo_sinal_codigo,
  CASE
    WHEN u1.tipo_sinal IS NULL THEN 'sem_observacao'
    WHEN u2.tipo_sinal IS NULL THEN 'primeira_obs'
    WHEN u1.tipo_sinal = 'atencao' AND u2.tipo_sinal = 'atencao' THEN 'precisa_atencao'
    WHEN u1.tipo_sinal = 'positivo' AND u2.tipo_sinal = 'positivo' THEN 'celebrar'
    WHEN u1.tipo_sinal = 'atencao' AND u2.tipo_sinal = 'positivo' THEN 'atencao_recente'
    WHEN u1.tipo_sinal = 'positivo' AND u2.tipo_sinal = 'atencao' THEN 'melhorando'
    ELSE 'neutro'
  END as estado_calculado,
  u1.created_at as data_ultima_obs
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'user'
LEFT JOIN inteligencias i ON i.id = p.casa_id
LEFT JOIN ultimas_obs u1 ON p.id = u1.aluno_id AND u1.rn = 1
LEFT JOIN ultimas_obs u2 ON p.id = u2.aluno_id AND u2.rn = 2;

-- A VIEW agora usa SECURITY INVOKER (padrão) e será acessada
-- através das funções SECURITY DEFINER que controlam o acesso

-- ============================================================
-- v_observacoes_para_ia agora tambem expoe o CONTEXTO DO CAPITULO (F2). Assim,
-- quando o Livro do aluno for construido, a IA puxa tanto o que veio do diario/
-- aula quanto o que veio da APRESENTACAO no capitulo. Pedido do Fundador 26/07.
-- Aditivo: so acrescenta capitulo_id + capitulo_nome (LEFT JOIN, nao some nada).
-- ============================================================
DROP VIEW IF EXISTS public.v_observacoes_para_ia;
CREATE VIEW public.v_observacoes_para_ia
WITH (security_invoker = on) AS
SELECT
  o.id, o.aluno_id, o.turma_id, o.fase_id, o.data_observacao,
  o.observacao_texto, o.sinal_id, o.origem, o.origem_captura,
  o.atividade_id,
  a.nome           AS atividade_nome,
  a.objetivo       AS atividade_objetivo,
  a.o_que_observar AS atividade_o_que_observar,
  o.capitulo_id,
  c.nome           AS capitulo_nome
FROM public.observacoes o
LEFT JOIN public.atividades a ON a.id = o.atividade_id
LEFT JOIN public.capitulos  c ON c.id = o.capitulo_id
WHERE o.excluida_em IS NULL;

COMMENT ON VIEW public.v_observacoes_para_ia IS
  'Observacoes + contexto da atividade (aula) E do capitulo (apresentacao F2), pra IA/Livro. security_invoker, filtra excluidas. LEFT JOIN: observacao sem atividade/capitulo continua aparecendo.';

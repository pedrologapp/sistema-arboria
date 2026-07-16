-- ============================================================
-- v_minha_analise_missao — o que a CRIANÇA pode ver da própria análise.
-- Autorizado pelo Fundador (16/07). Expõe SÓ o do próprio aluno e SÓ o que é
-- dele por direito: o texto "Leitura do Arboria" (justificativa_aluno) e os
-- PONTOS (nota x 10). NUNCA a nota crua, o mecanismo lido, a análise do
-- professor, pontos fortes, a desenvolver ou observação. A criança nunca vê
-- o número de 0 a 10, só a conquista.
--
-- Segurança: view SECURITY DEFINER (security_invoker=off, padrão) com WHERE
-- e.aluno_id = auth.uid() como fronteira. entregas_analise_ia é service_role
-- only; esta view é a ÚNICA porta do aluno, e só entrega o slice seguro.
-- Ausência justificada (caso_especial='nao_participou') não pontua.
-- ============================================================

DROP VIEW IF EXISTS public.v_minha_analise_missao;

CREATE VIEW public.v_minha_analise_missao
WITH (security_invoker = off) AS
SELECT
  e.id                                   AS entrega_id,
  e.missao_id,
  m.titulo                               AS missao_titulo,
  mi.nome                                AS mecanismo_nome,
  m.fase_id                              AS missao_fase_id,
  e.data_entrega,
  a.processado_em,
  (a.analise->>'caso_especial')          AS caso_especial,
  CASE
    WHEN (a.analise->>'caso_especial') = 'nao_participou' THEN 0
    ELSE GREATEST(0, COALESCE(NULLIF(a.analise->>'nota','')::numeric, 0))::int * 10
  END                                    AS pontos,
  (a.analise->>'justificativa_aluno')    AS texto_arboria
FROM public.entregas_analise_ia a
JOIN public.entregas e   ON e.id = a.entrega_id
JOIN public.missoes  m   ON m.id = e.missao_id
LEFT JOIN public.fases f          ON f.id = m.fase_id
LEFT JOIN public.inteligencias mi ON mi.id = f.inteligencia_id
WHERE e.aluno_id = auth.uid();

REVOKE ALL ON public.v_minha_analise_missao FROM anon;
GRANT SELECT ON public.v_minha_analise_missao TO authenticated;

COMMENT ON VIEW public.v_minha_analise_missao IS
  'O aluno vê SÓ a própria análise: texto do Arboria + pontos (nota x 10). Nunca a nota crua nem a análise do educador. Isolado por auth.uid().';

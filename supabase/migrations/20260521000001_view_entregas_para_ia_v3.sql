-- =============================================
-- v_entregas_para_ia (v3)
-- Traz a MISSÃO COMPLETA (lente_especial, itens, reflexao, dicas) além de
-- titulo/descricao/instrucoes — pra a IA entender de verdade o que foi pedido
-- e avaliar o alinhamento (nota) com precisão.
-- Idempotente. DROP + CREATE porque mudamos a ORDEM das colunas
-- (CREATE OR REPLACE só permite adicionar colunas no final).
-- A view é de uso interno (n8n) — nada depende dela, o DROP é seguro.
-- =============================================

DROP VIEW IF EXISTS public.v_entregas_para_ia;

CREATE VIEW public.v_entregas_para_ia AS
SELECT
  e.id              AS entrega_id,
  e.texto_resposta,
  e.reflexao_resposta,
  e.respostas_itens,
  e.status,
  e.tem_anexo,
  e.numero_tentativa,
  e.data_entrega,
  e.aluno_id,
  e.missao_id,
  -- Missão completa
  m.titulo          AS missao_titulo,
  m.descricao       AS missao_descricao,
  m.instrucoes      AS missao_instrucoes,
  m.lente_especial  AS missao_lente_especial,
  m.itens           AS missao_itens,
  m.reflexao        AS missao_reflexao,
  m.dicas           AS missao_dicas,
  m.inteligencia_cross AS missao_inteligencia_cross,
  -- Aluno
  p.nome            AS aluno_nome,
  p.full_name       AS aluno_full_name,
  p.serie           AS aluno_serie,
  p.casa_id         AS aluno_casa_id,
  i.nome            AS aluno_casa_nome,
  -- Arquivos anexados (array); nome_storage = caminho no bucket "entregas"
  (
    SELECT jsonb_agg(jsonb_build_object(
             'nome_original', a.nome_original,
             'nome_storage',  a.nome_storage,
             'tipo_arquivo',  a.tipo_arquivo
           ))
    FROM public.entrega_arquivos a
    WHERE a.entrega_id = e.id
  ) AS arquivos
FROM public.entregas e
JOIN public.missoes m   ON m.id = e.missao_id
JOIN public.profiles p  ON p.id = e.aluno_id
LEFT JOIN public.inteligencias i ON i.id = p.casa_id;

REVOKE ALL ON public.v_entregas_para_ia FROM anon, authenticated;

COMMENT ON VIEW public.v_entregas_para_ia IS
  'Uso interno (n8n/IA do Arboria). Entrega + missão COMPLETA + aluno + arquivos. Acesso apenas via service_role.';

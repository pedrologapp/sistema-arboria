-- =============================================
-- v_entregas_para_ia (v5)
-- Adiciona missao_data_prazo, pra a automacao filtrar "so entregas de missoes
-- cujo prazo ja encerrou ha X dias" (o Fundador quer analise em lote 1 dia apos
-- o prazo, dando tempo ao aluno e agrupando as chamadas pro cache da IA).
-- Idempotente. DROP + CREATE. Uso interno (service_role).
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
  m.origem          AS missao_origem,
  m.capitulo_id     AS missao_capitulo_id,
  m.tipo_missao     AS missao_tipo,
  m.data_prazo      AS missao_data_prazo,
  -- MECANISMO DECLARADO = inteligência da FASE da missão (não da Casa!)
  m.fase_id         AS missao_fase_id,
  mi.id             AS missao_mecanismo_id,
  mi.nome           AS missao_mecanismo_nome,
  mi.codigo         AS missao_mecanismo_codigo,
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
LEFT JOIN public.inteligencias i  ON i.id = p.casa_id
LEFT JOIN public.fases f          ON f.id = m.fase_id
LEFT JOIN public.inteligencias mi ON mi.id = f.inteligencia_id;

REVOKE ALL ON public.v_entregas_para_ia FROM anon, authenticated;

COMMENT ON VIEW public.v_entregas_para_ia IS
  'Uso interno (IA do Arboria). Entrega + missão COMPLETA + mecanismo declarado (fase) + data_prazo + aluno + arquivos. Acesso apenas via service_role.';

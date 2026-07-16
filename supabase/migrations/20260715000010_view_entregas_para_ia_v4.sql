-- =============================================
-- v_entregas_para_ia (v4)
-- Expõe o MECANISMO DECLARADO da missão: a inteligência da FASE em que a missão
-- foi criada (missoes.fase_id -> fases.inteligencia_id). Doutrina do Fundador:
-- o mecanismo da missão é o da FASE ativa, NUNCA o da Casa do aluno.
-- A Casa (aluno_casa_nome) fica só como contexto de time (pertencimento).
-- Também expõe origem/capitulo/tipo pra distinguir missões-reflexão (Assembleia,
-- papel de capítulo) que não têm fase e são tratadas como intrapessoal.
-- Idempotente. DROP + CREATE porque mudamos as colunas. Uso interno (service_role).
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
  'Uso interno (IA do Arboria). Entrega + missão COMPLETA + MECANISMO DECLARADO (inteligência da fase) + aluno + arquivos. Acesso apenas via service_role.';

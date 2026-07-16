-- =============================================
-- entregas.analise_ia + missao_pontos_base na view
-- analise_ia: guarda a análise estruturada da IA do Arboria (jsonb).
-- A view passa a trazer pontos_base, pra a IA calcular os pontos.
-- Idempotente.
-- =============================================

-- 1) Coluna pra guardar a análise completa da IA (resumo, como_pensou,
--    inteligencias, nota, nota_justificativa, pontos_fortes, etc.)
ALTER TABLE public.entregas
  ADD COLUMN IF NOT EXISTS analise_ia jsonb;

COMMENT ON COLUMN public.entregas.analise_ia IS
  'Análise estruturada da IA do Arboria (resumo, como_pensou, inteligencias_codigos, nota_justificativa, pontos_fortes, a_desenvolver, observacao_sugerida). O mentor consulta a nota_justificativa pra explicar a nota ao aluno.';

-- 2) View v4: acrescenta missao_pontos_base (DROP+CREATE por mudança de colunas)
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
  m.titulo          AS missao_titulo,
  m.descricao       AS missao_descricao,
  m.instrucoes      AS missao_instrucoes,
  m.lente_especial  AS missao_lente_especial,
  m.itens           AS missao_itens,
  m.reflexao        AS missao_reflexao,
  m.dicas           AS missao_dicas,
  m.inteligencia_cross AS missao_inteligencia_cross,
  m.pontos_base     AS missao_pontos_base,
  p.nome            AS aluno_nome,
  p.full_name       AS aluno_full_name,
  p.serie           AS aluno_serie,
  p.casa_id         AS aluno_casa_id,
  i.nome            AS aluno_casa_nome,
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
  'Uso interno (n8n/IA do Arboria). Entrega + missão completa (incl. pontos_base) + aluno + arquivos. Acesso apenas via service_role.';

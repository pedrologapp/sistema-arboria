-- =============================================
-- v_entregas_para_ia (v2)
-- Acrescenta: reflexao_resposta, respostas_itens, tem_anexo e os arquivos anexados
-- (com nome_storage, pra o n8n baixar o PDF do bucket "entregas").
-- Idempotente (CREATE OR REPLACE).
-- =============================================

CREATE OR REPLACE VIEW public.v_entregas_para_ia AS
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
  p.nome            AS aluno_nome,
  p.full_name       AS aluno_full_name,
  p.serie           AS aluno_serie,
  p.casa_id         AS aluno_casa_id,
  i.nome            AS aluno_casa_nome,
  -- Arquivos anexados (array). nome_storage = caminho no bucket "entregas".
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

-- Reforça a segurança (CREATE OR REPLACE preserva grants, mas garantimos):
REVOKE ALL ON public.v_entregas_para_ia FROM anon, authenticated;

COMMENT ON VIEW public.v_entregas_para_ia IS
  'Uso interno (n8n/IA do Arboria). Entrega + missão + aluno + arquivos. Acesso apenas via service_role.';

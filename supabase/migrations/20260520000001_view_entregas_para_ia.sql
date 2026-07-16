-- =============================================
-- VIEW: v_entregas_para_ia
-- Junta entrega + missão + aluno num formato achatado,
-- pra a IA do Arboria (n8n) ler com um único nó nativo do Supabase.
-- Idempotente.
-- =============================================

CREATE OR REPLACE VIEW public.v_entregas_para_ia AS
SELECT
  e.id            AS entrega_id,
  e.texto_resposta,
  e.status,
  e.numero_tentativa,
  e.data_entrega,
  e.aluno_id,
  e.missao_id,
  m.titulo        AS missao_titulo,
  m.descricao     AS missao_descricao,
  m.instrucoes    AS missao_instrucoes,
  p.nome          AS aluno_nome,
  p.full_name     AS aluno_full_name,
  p.serie         AS aluno_serie,
  p.casa_id       AS aluno_casa_id,
  i.nome          AS aluno_casa_nome
FROM public.entregas e
JOIN public.missoes m   ON m.id = e.missao_id
JOIN public.profiles p  ON p.id = e.aluno_id
LEFT JOIN public.inteligencias i ON i.id = p.casa_id;

-- Segurança: esta view NÃO deve ser acessível por usuários comuns.
-- Só o backend (n8n via service_role) a consome. Revogamos acesso de anon/authenticated
-- para evitar que a view vire um furo de RLS (views rodam com privilégios do dono).
REVOKE ALL ON public.v_entregas_para_ia FROM anon, authenticated;

COMMENT ON VIEW public.v_entregas_para_ia IS
  'Uso interno (n8n/IA do Arboria). Entrega + missão + aluno achatados. Acesso apenas via service_role.';

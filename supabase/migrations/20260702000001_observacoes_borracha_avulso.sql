-- =============================================================
-- BORRACHA (soft-delete auditado) + REGISTRO AVULSO SEM FASE.
-- Pareceres Riscos + Dados de 01/07/2026, aprovados pelo Fundador em 01/07.
-- Ver empresa/registros/decisoes.md e riscos.md.
--
-- 1) SOFT-DELETE: excluir observação vira ESTADO (excluida_em), nunca DELETE
--    físico — o rio longitudinal é append-preserving. Fecha as policies de
--    DELETE soltas desde jan/2026 (professor 24h / admin, migration
--    20260108195404), que apagavam evidências em CASCATA e sem auditoria.
--    NOTA: a policy de UPDATE do autor PERMANECE por ora — o fluxo legítimo
--    de avaliação do CapituloProfessorPage depende dela (risco residual
--    registrado em riscos.md; escopar é follow-up).
--
-- 2) fase_id NULLABLE: registro avulso fora de fase (semanas de adaptação
--    antes da fase 1; depois da fase 8). NULL = "não havia fase de exploração
--    ativa" — estado real. PROIBIDO fase sintética e backfill por inferência.
--    Só para texto livre: CHECK impede observação estruturada (sinal) sem fase.
-- =============================================================

-- ---------- Soft-delete ----------
ALTER TABLE public.observacoes
  ADD COLUMN IF NOT EXISTS excluida_em     timestamptz,
  ADD COLUMN IF NOT EXISTS excluida_por    uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS exclusao_motivo text;

-- Regulariza drift de esquema: anexo_url existia em prod sem migration (criado via dashboard)
ALTER TABLE public.observacoes ADD COLUMN IF NOT EXISTS anexo_url text;

CREATE INDEX IF NOT EXISTS idx_obs_ativas
  ON public.observacoes (aluno_id, created_at)
  WHERE excluida_em IS NULL;

-- Recolhe a borracha física que estava solta.
-- NOTA: no banco os nomes das policies estão SEM acento (divergem do arquivo
-- original 20260108195404) — dropar as duas variantes.
DROP POLICY IF EXISTS "Professor deleta próprias observações em 24h" ON public.observacoes;
DROP POLICY IF EXISTS "Admin deleta observações da instituição" ON public.observacoes;
DROP POLICY IF EXISTS "Professor deleta proprias observacoes em 24h" ON public.observacoes;
DROP POLICY IF EXISTS "Admin deleta observacoes da instituicao" ON public.observacoes;

-- Exclusão SÓ pelo caminho auditável: autor (ou admin da instituição), com motivo.
-- A foto (dado mais sensível — pode ser de outra criança) sai do bucket
-- IMEDIATAMENTE; a linha permanece pra auditoria. Corrigir = excluir + reescrever.
CREATE OR REPLACE FUNCTION public.excluir_observacao(p_obs_id uuid, p_motivo text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_anexo text;
BEGIN
  UPDATE observacoes
     SET excluida_em = now(),
         excluida_por = auth.uid(),
         exclusao_motivo = p_motivo
   WHERE id = p_obs_id
     AND excluida_em IS NULL
     AND (
       professor_id = auth.uid()
       OR (has_role(auth.uid(), 'admin'::app_role) AND institution_id = get_user_institution_id())
     )
  RETURNING anexo_url INTO v_anexo;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Observação não encontrada ou sem permissão';
  END IF;

  IF v_anexo IS NOT NULL THEN
    DELETE FROM storage.objects WHERE bucket_id = 'observacoes' AND name = v_anexo;
    UPDATE observacoes SET anexo_url = NULL WHERE id = p_obs_id;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.excluir_observacao(uuid, text) TO authenticated;

-- ---------- Avulso sem fase ----------
ALTER TABLE public.observacoes ALTER COLUMN fase_id DROP NOT NULL;

ALTER TABLE public.observacoes DROP CONSTRAINT IF EXISTS obs_fase_ou_texto_livre;
ALTER TABLE public.observacoes
  ADD CONSTRAINT obs_fase_ou_texto_livre CHECK (fase_id IS NOT NULL OR sinal_id IS NULL);

COMMENT ON COLUMN public.observacoes.fase_id IS
  'NULL = registro avulso sem fase de exploração ativa (antes da fase 1, depois da 8). Proibido fase sintética e backfill por inferência.';
COMMENT ON COLUMN public.observacoes.excluida_em IS
  'Soft-delete auditado (só via RPC excluir_observacao). TODO leitor filtra excluida_em IS NULL — inclusive o pipeline n8n, que usa service_role e IGNORA RLS (filtro explícito na query).';

-- ---------- vw_estados_alunos: ignora observações excluídas ----------
DROP VIEW IF EXISTS vw_estados_alunos;

CREATE VIEW vw_estados_alunos
WITH (security_invoker = on) AS
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
  WHERE o.excluida_em IS NULL
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

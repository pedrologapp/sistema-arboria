-- ============================================================
-- CORREÇÃO DE INCIDENTE (04/08/2026) — entrega coletiva da Arena.
--
-- Bug 1: grupo_ref era `papel_id::grupo` e ESQUECIA A TURMA. Como o número do
-- grupo é contado por turma, o grupo 1 do papel X do 6ºA e o grupo 1 do papel X
-- do 6ºB geravam a MESMA chave. O índice único entregas_missao_grupo_uniq então
-- deixava só UM desses grupos entregar; os outros levavam duplicate key.
-- Ex. real: "Ballet: previnir lessões" (6ºA) travado por "Gol Inteligente" (6ºB).
--
-- Bug 2: a trava de grupo na tela do aluno lia entregas direto, mas a RLS só
-- deixa o aluno ver a PRÓPRIA entrega. Nenhum colega enxergava a entrega do
-- grupo: o formulário ficava aberto, o aluno enviava e batia no índice único.
--
-- Correção: grupo_ref passa a ser `turma_id::papel_id::grupo` (backfill abaixo)
-- e o envio/leitura da entrega coletiva passa por duas funções SECURITY DEFINER
-- que checam a participação do chamador naquele grupo exato.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Backfill: reescreve grupo_ref das entregas já feitas incluindo a turma.
--    Só toca em linhas no formato antigo (2 partes).
-- ------------------------------------------------------------
UPDATE public.entregas e
SET grupo_ref = a.turma_id::text || '::' || a.papel_id::text || '::' || coalesce(a.grupo, 1)::text
FROM public.capitulo_alocacoes a, public.missoes m
WHERE m.id = e.missao_id
  AND a.capitulo_id = m.capitulo_id
  AND a.aluno_id = e.aluno_id
  AND e.grupo_ref IS NOT NULL
  AND array_length(string_to_array(e.grupo_ref, '::'), 1) = 2;

-- ------------------------------------------------------------
-- 2. Leitura da entrega do grupo (contorna a RLS de forma escopada).
--    Devolve a entrega SOMENTE se quem chama pertence àquele mesmo grupo.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.entrega_do_grupo(p_missao_id uuid, p_grupo_ref text)
RETURNS TABLE (
  id uuid,
  status text,
  texto_resposta text,
  respostas_itens jsonb,
  reflexao_resposta text,
  data_entrega timestamptz,
  nota smallint,
  pontos_concedidos smallint,
  feedback_professor text,
  numero_tentativa smallint,
  visualizada_pelo_aluno boolean,
  aluno_id uuid,
  autor_nome text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.status, e.texto_resposta, e.respostas_itens, e.reflexao_resposta,
         e.data_entrega, e.nota, e.pontos_concedidos, e.feedback_professor,
         e.numero_tentativa, e.visualizada_pelo_aluno, e.aluno_id,
         coalesce(p.full_name, p.nome, 'um colega do grupo')
  FROM public.entregas e
  JOIN public.profiles p ON p.id = e.aluno_id
  WHERE e.missao_id = p_missao_id
    AND e.grupo_ref = p_grupo_ref
    AND EXISTS (
      SELECT 1
      FROM public.capitulo_alocacoes a
      JOIN public.missoes m ON m.capitulo_id = a.capitulo_id
      WHERE a.aluno_id = auth.uid()
        AND m.id = p_missao_id
        AND (a.turma_id::text || '::' || a.papel_id::text || '::' || coalesce(a.grupo, 1)::text) = p_grupo_ref
    )
  ORDER BY e.numero_tentativa DESC
  LIMIT 1;
$$;

-- ------------------------------------------------------------
-- 3. Envio idempotente da entrega coletiva.
--    Uma linha por grupo. Cria, atualiza ou bloqueia — nunca estoura duplicate key.
--    acao: 'criada' | 'atualizada' | 'bloqueada' | 'fora_do_grupo'
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enviar_entrega_grupo(
  p_missao_id uuid,
  p_grupo_ref text,
  p_texto text,
  p_respostas_itens jsonb,
  p_reflexao text,
  p_entregue_no_prazo boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existente public.entregas%ROWTYPE;
  v_autor text;
  v_id uuid;
BEGIN
  -- Só um integrante do grupo pode enviar por ele.
  IF NOT EXISTS (
    SELECT 1
    FROM public.capitulo_alocacoes a
    JOIN public.missoes m ON m.capitulo_id = a.capitulo_id
    WHERE a.aluno_id = auth.uid()
      AND m.id = p_missao_id
      AND (a.turma_id::text || '::' || a.papel_id::text || '::' || coalesce(a.grupo, 1)::text) = p_grupo_ref
  ) THEN
    RETURN jsonb_build_object('acao', 'fora_do_grupo');
  END IF;

  -- Serializa os envios simultâneos do mesmo grupo.
  SELECT * INTO v_existente
  FROM public.entregas
  WHERE missao_id = p_missao_id AND grupo_ref = p_grupo_ref
  ORDER BY numero_tentativa DESC
  LIMIT 1
  FOR UPDATE;

  IF v_existente.id IS NULL THEN
    -- Dois cliques exatamente simultâneos: não há linha pra travar com FOR UPDATE,
    -- então o segundo cai no índice único. Vira 'bloqueada', nunca erro na tela.
    BEGIN
      INSERT INTO public.entregas (
        missao_id, aluno_id, texto_resposta, respostas_itens, reflexao_resposta,
        status, entregue_no_prazo, numero_tentativa, grupo_ref
      ) VALUES (
        p_missao_id, auth.uid(), p_texto, p_respostas_itens, p_reflexao,
        'pendente', p_entregue_no_prazo, 1, p_grupo_ref
      )
      RETURNING id INTO v_id;
      RETURN jsonb_build_object('acao', 'criada', 'entrega_id', v_id);
    EXCEPTION WHEN unique_violation THEN
      SELECT * INTO v_existente
      FROM public.entregas
      WHERE missao_id = p_missao_id AND grupo_ref = p_grupo_ref
      ORDER BY numero_tentativa DESC
      LIMIT 1;
    END;
  END IF;

  -- Já existe entrega do grupo.
  --  - 'refazer': o mentor pediu correção, qualquer integrante pode reenviar.
  --  - 'pendente' do PRÓPRIO autor: é retentativa dele (a 1ª falhou no meio do
  --    caminho, tipicamente no upload do anexo). Atualiza em vez de duplicar.
  --  - qualquer outro caso: bloqueia e informa quem entregou.
  IF v_existente.status = 'refazer'
     OR (v_existente.status = 'pendente' AND v_existente.aluno_id = auth.uid()) THEN
    UPDATE public.entregas
    SET texto_resposta = p_texto,
        respostas_itens = p_respostas_itens,
        reflexao_resposta = p_reflexao,
        status = 'pendente',
        entregue_no_prazo = p_entregue_no_prazo,
        data_entrega = now(),
        aluno_id = auth.uid(),
        numero_tentativa = CASE WHEN v_existente.status = 'refazer'
                                THEN coalesce(v_existente.numero_tentativa, 1) + 1
                                ELSE coalesce(v_existente.numero_tentativa, 1) END,
        updated_at = now()
    WHERE id = v_existente.id;
    RETURN jsonb_build_object('acao', 'atualizada', 'entrega_id', v_existente.id);
  END IF;

  SELECT coalesce(full_name, nome, 'um colega do grupo') INTO v_autor
  FROM public.profiles WHERE id = v_existente.aluno_id;

  RETURN jsonb_build_object(
    'acao', 'bloqueada',
    'entrega_id', v_existente.id,
    'autor', coalesce(v_autor, 'um colega do grupo'),
    'status', v_existente.status
  );
END;
$$;

-- ------------------------------------------------------------
-- 4. Registrar anexo de uma entrega do grupo (a RLS de entrega_arquivos segue
--    a entrega, que pode ser de outro integrante).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_arquivo_entrega_grupo(
  p_entrega_id uuid,
  p_nome_original text,
  p_nome_storage text,
  p_url text,
  p_tamanho_bytes bigint,
  p_tipo_arquivo text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.entregas e
    JOIN public.capitulo_alocacoes a ON a.aluno_id = auth.uid()
    JOIN public.missoes m ON m.id = e.missao_id AND m.capitulo_id = a.capitulo_id
    WHERE e.id = p_entrega_id
      AND e.grupo_ref IS NOT NULL
      AND (a.turma_id::text || '::' || a.papel_id::text || '::' || coalesce(a.grupo, 1)::text) = e.grupo_ref
  ) THEN
    RAISE EXCEPTION 'Sem permissão para anexar nesta entrega';
  END IF;

  INSERT INTO public.entrega_arquivos (
    entrega_id, nome_original, nome_storage, url, tamanho_bytes, tipo_arquivo
  ) VALUES (
    p_entrega_id, p_nome_original, p_nome_storage, p_url, p_tamanho_bytes, p_tipo_arquivo
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ------------------------------------------------------------
-- 5. Anexos da entrega do grupo (mesma checagem de participação).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.arquivos_da_entrega_grupo(p_entrega_id uuid)
RETURNS TABLE (
  id uuid,
  nome_original text,
  nome_storage text,
  url text,
  tamanho_bytes bigint,
  tipo_arquivo text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.id, f.nome_original, f.nome_storage, f.url, f.tamanho_bytes, f.tipo_arquivo
  FROM public.entrega_arquivos f
  JOIN public.entregas e ON e.id = f.entrega_id
  WHERE f.entrega_id = p_entrega_id
    AND e.grupo_ref IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.capitulo_alocacoes a
      JOIN public.missoes m ON m.capitulo_id = a.capitulo_id AND m.id = e.missao_id
      WHERE a.aluno_id = auth.uid()
        AND (a.turma_id::text || '::' || a.papel_id::text || '::' || coalesce(a.grupo, 1)::text) = e.grupo_ref
    );
$$;

REVOKE ALL ON FUNCTION public.arquivos_da_entrega_grupo(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.arquivos_da_entrega_grupo(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.entrega_do_grupo(uuid, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.enviar_entrega_grupo(uuid, text, text, jsonb, text, boolean) FROM public, anon;
REVOKE ALL ON FUNCTION public.registrar_arquivo_entrega_grupo(uuid, text, text, text, bigint, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.entrega_do_grupo(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enviar_entrega_grupo(uuid, text, text, jsonb, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_arquivo_entrega_grupo(uuid, text, text, text, bigint, text) TO authenticated;

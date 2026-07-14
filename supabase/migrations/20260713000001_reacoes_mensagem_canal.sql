-- ============================================================================
-- Reacoes rapidas no chat de canal do aluno F2 (feature F2_ALUNO_REACOES)
--
-- ISOLADA: NAO alimenta IA/perfil/serie longitudinal. Sem trigger, sem webhook,
-- fora de qualquer view do pipeline n8n. Retencao curta: as reacoes sao expurgadas
-- junto das mensagens de canal (ON DELETE CASCADE em mensagem_id). Nenhum agregado,
-- ranking ou leitura sociometrica e derivado desta tabela: ela so existe para o
-- balao do chat do aluno.
--
-- So reacoes POSITIVAS (curtir/apoiar/joia/combinado). Uma reacao por aluno por
-- mensagem (UNIQUE); trocar de reacao e UPDATE do campo reacao, nao nova linha.
--
-- Gating de leitura/escrita: a visibilidade e ancorada na RLS ja existente de
-- mensagens_canal (o EXISTS abaixo). Vejo/reajo apenas em mensagens que ja posso
-- ver. Isso cobre inclusive canais read-only (avisos): se leio, posso reagir.
-- ============================================================================

CREATE TABLE public.reacoes_mensagem_canal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem_id uuid NOT NULL REFERENCES public.mensagens_canal(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reacao text NOT NULL CHECK (reacao IN ('curtir', 'apoiar', 'joia', 'combinado')),
  institution_id uuid NOT NULL REFERENCES public.institutions(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT reacoes_mensagem_canal_unica_por_aluno UNIQUE (mensagem_id, aluno_id)
);

-- Busca do lote: reacoes de um conjunto de mensagens numa query (WHERE mensagem_id = ANY(...)).
CREATE INDEX idx_reacoes_mensagem_canal_mensagem_id
  ON public.reacoes_mensagem_canal (mensagem_id);

ALTER TABLE public.reacoes_mensagem_canal ENABLE ROW LEVEL SECURITY;

-- SELECT: mesma instituicao E a mensagem e visivel pela RLS de mensagens_canal.
-- Vejo reacoes apenas das mensagens que ja vejo; o gating real vive em mensagens_canal.
CREATE POLICY "Ver reacoes de mensagens visiveis"
ON public.reacoes_mensagem_canal
FOR SELECT
TO authenticated
USING (
  institution_id = get_user_institution_id()
  AND EXISTS (
    SELECT 1 FROM public.mensagens_canal m
    WHERE m.id = reacoes_mensagem_canal.mensagem_id
  )
);

-- INSERT: so posso reagir em meu proprio nome (anti-spoofing), na minha instituicao,
-- e apenas em mensagem que posso ler (mesmo EXISTS: reagir gated por VISIBILIDADE DE
-- LEITURA, o que cobre canais read-only como avisos).
CREATE POLICY "Reagir em mensagem visivel"
ON public.reacoes_mensagem_canal
FOR INSERT
TO authenticated
WITH CHECK (
  aluno_id = auth.uid()
  AND institution_id = get_user_institution_id()
  AND EXISTS (
    SELECT 1 FROM public.mensagens_canal m
    WHERE m.id = reacoes_mensagem_canal.mensagem_id
  )
);

-- UPDATE: so troco a MINHA propria reacao.
CREATE POLICY "Trocar a propria reacao"
ON public.reacoes_mensagem_canal
FOR UPDATE
TO authenticated
USING (aluno_id = auth.uid());

-- DELETE: so removo a MINHA propria reacao.
CREATE POLICY "Remover a propria reacao"
ON public.reacoes_mensagem_canal
FOR DELETE
TO authenticated
USING (aluno_id = auth.uid());

-- DELETE (moderacao): admin pode remover qualquer reacao, espelhando o padrao de
-- moderacao de mensagens_canal.
CREATE POLICY "Admin remove reacao (moderacao)"
ON public.reacoes_mensagem_canal
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

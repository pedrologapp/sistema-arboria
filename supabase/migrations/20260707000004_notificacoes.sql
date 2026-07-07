-- =============================================================
-- notificacoes — caixa de avisos genérica para EDUCADORES.
--
-- O QUÊ: uma linha por aviso destinado a um profile (destinatario_id).
-- Usada, na reforma do F2, para avisar o mentor da PRÓXIMA Casa quando a turma
-- vira de fase (ver RPCs em 20260707000006). Genérica o bastante para outros
-- avisos operacionais.
--
-- POR QUÊ / LIMITE DE PRIVACIDADE (Riscos): a notificação carrega apenas
-- PONTEIROS (turma, fase, capítulo) e texto operacional. NUNCA nome de aluno,
-- NUNCA conteúdo de observação. Quem clica resolve o contexto pelas telas com
-- RLS própria. Assim o aviso não vira um vazamento lateral de dado de criança.
--
-- ADITIVO: tabela nova. Nada existente é tocado.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.notificacoes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  destinatario_id uuid NOT NULL REFERENCES public.profiles(id)    ON DELETE CASCADE,
  tipo           text NOT NULL,                    -- ex.: 'fase_virada', 'sem_mentor'
  titulo         text NOT NULL,
  corpo          text,                             -- texto operacional; SEM nome de aluno/obs
  ref_turma_id   uuid REFERENCES public.turmas(id)     ON DELETE CASCADE,
  ref_fase_id    uuid REFERENCES public.fases(id)      ON DELETE SET NULL,
  ref_capitulo_id uuid REFERENCES public.capitulos(id) ON DELETE SET NULL,
  lida           boolean NOT NULL DEFAULT false,
  lida_em        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario
  ON public.notificacoes (destinatario_id, lida, created_at DESC);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- SELECT: destinatário só vê as suas.
DROP POLICY IF EXISTS "Destinatario le suas notificacoes" ON public.notificacoes;
CREATE POLICY "Destinatario le suas notificacoes"
ON public.notificacoes FOR SELECT
USING ( destinatario_id = auth.uid() );

-- UPDATE: destinatário só atualiza as suas (marcar lida). Sem INSERT/DELETE por
-- policy: a criação vem das RPCs SECURITY DEFINER (fase virada), que bypassam RLS.
DROP POLICY IF EXISTS "Destinatario atualiza suas notificacoes" ON public.notificacoes;
CREATE POLICY "Destinatario atualiza suas notificacoes"
ON public.notificacoes FOR UPDATE
USING ( destinatario_id = auth.uid() )
WITH CHECK ( destinatario_id = auth.uid() );

-- =============================================================
-- CHAT DE GRUPO DO CAPITULO (Arena) — canal CROSS-CASA por grupo.
--
-- Primeira excecao deliberada a regra "so fala quem e da mesma Casa". Parecer de
-- Riscos 15/07: LIBERADO COM CONDICOES C1-C8 (ver empresa/registros/riscos.md).
-- Esta migration implementa a FUNDACAO de seguranca (C1-C6). C7 (denuncia)
-- ADIADO pelo Fundador. C8 (retencao) e operacional (arquiva com capitulo via
-- capitulos.ativo=false -> canal somente-leitura; expurgo no fim do ano letivo).
--
-- C1 canal ISOLADO: tabelas NOVAS proprias; NAO encosta em canais_casa nem nas
--    policies casa-coupled (a invariante de Casa fica intocada).
-- C2 membresia DERIVADA de capitulo_alocacoes (nunca copiada): ser do grupo =
--    existir alocacao com a mesma tupla. Mover/remover aluno reavalia na hora.
-- C3 RLS pela TUPLA COMPLETA (capitulo_id + turma_id + papel_id + grupo).
-- C4 mentor da turma LE todo canal de grupo (eh_mentor_do_capitulo). SO LEITURA
--    (decisao do Fundador): o mentor NAO tem INSERT. Admin pode moderar (delete).
-- C5 filtro de palavrao: NAO existe no chat de hoje (nem nos canais de Casa);
--    fica em aberto no backlog junto com C7, pra todo o chat. Documentado.
-- C6 escrita so com capitulo ATIVO (capitulos.ativo=true). Encerrado -> canal
--    somente-leitura (nenhum INSERT passa).
--
-- >>> NAO APLICADA AINDA <<< aguarda "pode aplicar" do Fundador (mostro antes).
-- Aplicar via `supabase db query --linked -f` (o db push esta quebrado; ver
-- project_supabase_deploy_reality).
-- =============================================================

-- ---------------------------------------------
-- 1. Tabela de CANAIS de grupo (1 linha por grupo de um tema numa turma)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.capitulo_grupo_canais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  capitulo_id uuid NOT NULL REFERENCES public.capitulos(id) ON DELETE CASCADE,
  turma_id uuid NOT NULL,
  papel_id uuid NOT NULL REFERENCES public.capitulo_papeis(id) ON DELETE CASCADE,
  grupo smallint NOT NULL DEFAULT 1,
  nome text, -- rotulo opcional; o texto visivel a crianca e composto na UI (gate Conteudo)
  created_at timestamptz NOT NULL DEFAULT now(),
  criado_por uuid,
  CONSTRAINT capitulo_grupo_canais_unico UNIQUE (capitulo_id, turma_id, papel_id, grupo)
);
CREATE INDEX IF NOT EXISTS idx_cgc_tupla
  ON public.capitulo_grupo_canais (capitulo_id, turma_id, papel_id, grupo);

-- ---------------------------------------------
-- 2. Tabela de MENSAGENS do grupo (propria; NAO reusa mensagens_canal, pra nao
--    tocar as policies casa-coupled daquela tabela)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.capitulo_grupo_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canal_id uuid NOT NULL REFERENCES public.capitulo_grupo_canais(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL,
  conteudo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cgm_canal ON public.capitulo_grupo_mensagens (canal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cgm_autor ON public.capitulo_grupo_mensagens (autor_id);

ALTER TABLE public.capitulo_grupo_canais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capitulo_grupo_mensagens ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------
-- 3. RLS — CANAIS
--    Ver o canal: aluno do PROPRIO grupo (tupla) | mentor do capitulo | admin.
-- ---------------------------------------------
DROP POLICY IF EXISTS "Ver canal do meu grupo" ON public.capitulo_grupo_canais;
CREATE POLICY "Ver canal do meu grupo"
ON public.capitulo_grupo_canais FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.capitulo_alocacoes ca
    WHERE ca.aluno_id = auth.uid()
      AND ca.capitulo_id = capitulo_grupo_canais.capitulo_id
      AND ca.turma_id    = capitulo_grupo_canais.turma_id
      AND ca.papel_id    = capitulo_grupo_canais.papel_id
      AND ca.grupo       = capitulo_grupo_canais.grupo
  )
  OR eh_mentor_do_capitulo(capitulo_grupo_canais.capitulo_id, auth.uid())
  OR (has_role(auth.uid(), 'admin'::app_role) AND institution_id = get_user_institution_id())
);

-- Criar/gerir canais: mentor do capitulo ou admin (o app garante 1 canal por grupo).
DROP POLICY IF EXISTS "Mentor gerencia canais do grupo" ON public.capitulo_grupo_canais;
CREATE POLICY "Mentor gerencia canais do grupo"
ON public.capitulo_grupo_canais FOR ALL
USING (
  eh_mentor_do_capitulo(capitulo_grupo_canais.capitulo_id, auth.uid())
  OR (has_role(auth.uid(), 'admin'::app_role) AND institution_id = get_user_institution_id())
)
WITH CHECK (
  eh_mentor_do_capitulo(capitulo_grupo_canais.capitulo_id, auth.uid())
  OR (has_role(auth.uid(), 'admin'::app_role) AND institution_id = get_user_institution_id())
);

-- ---------------------------------------------
-- 4. RLS — MENSAGENS
--    Ler: aluno do proprio grupo | mentor do capitulo | admin.
--    Enviar: SO o aluno do grupo, com o capitulo ATIVO, autor = ele mesmo (C6).
--    Mentor NAO envia (so leitura). Admin deleta (moderacao).
-- ---------------------------------------------
DROP POLICY IF EXISTS "Ler mensagens do meu grupo" ON public.capitulo_grupo_mensagens;
CREATE POLICY "Ler mensagens do meu grupo"
ON public.capitulo_grupo_mensagens FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.capitulo_grupo_canais gc
    JOIN public.capitulo_alocacoes ca
      ON ca.capitulo_id = gc.capitulo_id
     AND ca.turma_id    = gc.turma_id
     AND ca.papel_id    = gc.papel_id
     AND ca.grupo       = gc.grupo
    WHERE gc.id = capitulo_grupo_mensagens.canal_id
      AND ca.aluno_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.capitulo_grupo_canais gc
    WHERE gc.id = capitulo_grupo_mensagens.canal_id
      AND eh_mentor_do_capitulo(gc.capitulo_id, auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.capitulo_grupo_canais gc
    WHERE gc.id = capitulo_grupo_mensagens.canal_id
      AND has_role(auth.uid(), 'admin'::app_role)
      AND gc.institution_id = get_user_institution_id()
  )
);

DROP POLICY IF EXISTS "Enviar mensagem no meu grupo" ON public.capitulo_grupo_mensagens;
CREATE POLICY "Enviar mensagem no meu grupo"
ON public.capitulo_grupo_mensagens FOR INSERT
WITH CHECK (
  autor_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.capitulo_grupo_canais gc
    JOIN public.capitulo_alocacoes ca
      ON ca.capitulo_id = gc.capitulo_id
     AND ca.turma_id    = gc.turma_id
     AND ca.papel_id    = gc.papel_id
     AND ca.grupo       = gc.grupo
    JOIN public.capitulos c ON c.id = gc.capitulo_id
    WHERE gc.id = capitulo_grupo_mensagens.canal_id
      AND ca.aluno_id = auth.uid()
      AND c.ativo = true               -- C6: so grava com capitulo ATIVO
  )
);

DROP POLICY IF EXISTS "Admin deleta mensagem do grupo" ON public.capitulo_grupo_mensagens;
CREATE POLICY "Admin deleta mensagem do grupo"
ON public.capitulo_grupo_mensagens FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.capitulo_grupo_canais gc
    WHERE gc.id = capitulo_grupo_mensagens.canal_id
      AND has_role(auth.uid(), 'admin'::app_role)
      AND gc.institution_id = get_user_institution_id()
  )
);

-- ---------------------------------------------
-- 5. Realtime (chat ao vivo, como mensagens_canal)
-- ---------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.capitulo_grupo_mensagens;

-- =============================================================
-- ROLLBACK:
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.capitulo_grupo_mensagens;
-- DROP TABLE IF EXISTS public.capitulo_grupo_mensagens;
-- DROP TABLE IF EXISTS public.capitulo_grupo_canais;
-- (canais_casa / mensagens_canal ficam intactas: nada foi tocado nelas)
-- =============================================================

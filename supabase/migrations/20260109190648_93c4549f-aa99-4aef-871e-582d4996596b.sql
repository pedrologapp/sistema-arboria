-- =============================================
-- 1. TABELA DE CANAIS
-- =============================================
CREATE TABLE IF NOT EXISTS canais_casa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  casa_id smallint NOT NULL REFERENCES inteligencias(id),
  nome text NOT NULL,
  descricao text,
  icone text DEFAULT '💬',
  tipo text DEFAULT 'texto' CHECK (tipo IN ('texto', 'avisos', 'regras')),
  ordem smallint DEFAULT 0,
  apenas_lideranca boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(institution_id, casa_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_canais_casa ON canais_casa(institution_id, casa_id);

-- =============================================
-- 2. TABELA DE MENSAGENS NOS CANAIS
-- =============================================
CREATE TABLE IF NOT EXISTS mensagens_canal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  canal_id uuid NOT NULL REFERENCES canais_casa(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES profiles(id),
  conteudo text NOT NULL,
  tipo text DEFAULT 'normal' CHECK (tipo IN ('normal', 'anuncio', 'sistema')),
  fixada boolean DEFAULT false,
  editada boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_canal ON mensagens_canal(canal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mensagens_autor ON mensagens_canal(autor_id);

-- =============================================
-- 3. TABELA DE CONVERSAS PRIVADAS
-- =============================================
CREATE TABLE IF NOT EXISTS conversas_privadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversa_participantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES conversas_privadas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES profiles(id),
  ultima_leitura timestamptz DEFAULT now(),
  
  UNIQUE(conversa_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_conversa_part ON conversa_participantes(usuario_id);

CREATE TABLE IF NOT EXISTS mensagens_privadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES conversas_privadas(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES profiles(id),
  conteudo text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msg_privadas ON mensagens_privadas(conversa_id, created_at DESC);

-- =============================================
-- RLS - HABILITAR
-- =============================================
ALTER TABLE canais_casa ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_canal ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas_privadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversa_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_privadas ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CANAIS: Aluno vê só da sua casa, admin/professor vê todas
-- =============================================
CREATE POLICY "Aluno ve canais da sua casa" ON canais_casa FOR SELECT
USING (
  institution_id = get_user_institution_id()
  AND (
    casa_id = (SELECT casa_id FROM profiles WHERE id = auth.uid())
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'professor')
  )
);

CREATE POLICY "Admin pode gerenciar canais" ON canais_casa FOR ALL
USING (
  institution_id = get_user_institution_id()
  AND has_role(auth.uid(), 'admin')
);

-- =============================================
-- MENSAGENS DE CANAL
-- =============================================
CREATE POLICY "Ver mensagens do canal" ON mensagens_canal FOR SELECT
USING (
  institution_id = get_user_institution_id()
  AND (
    canal_id IN (
      SELECT c.id FROM canais_casa c
      WHERE c.casa_id = (SELECT casa_id FROM profiles WHERE id = auth.uid())
    )
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'professor')
  )
);

CREATE POLICY "Enviar mensagem no canal" ON mensagens_canal FOR INSERT
WITH CHECK (
  autor_id = auth.uid()
  AND institution_id = get_user_institution_id()
  AND canal_id IN (
    SELECT c.id FROM canais_casa c
    WHERE c.casa_id = (SELECT casa_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Editar propria mensagem" ON mensagens_canal FOR UPDATE
USING (autor_id = auth.uid());

CREATE POLICY "Admin pode deletar mensagens" ON mensagens_canal FOR DELETE
USING (
  has_role(auth.uid(), 'admin')
  AND institution_id = get_user_institution_id()
);

-- =============================================
-- CONVERSAS PRIVADAS
-- =============================================
CREATE POLICY "Ver conversas privadas" ON conversas_privadas FOR SELECT
USING (
  id IN (SELECT conversa_id FROM conversa_participantes WHERE usuario_id = auth.uid())
);

CREATE POLICY "Criar conversa privada" ON conversas_privadas FOR INSERT
WITH CHECK (institution_id = get_user_institution_id());

CREATE POLICY "Ver participantes" ON conversa_participantes FOR SELECT
USING (
  conversa_id IN (SELECT conversa_id FROM conversa_participantes WHERE usuario_id = auth.uid())
);

CREATE POLICY "Adicionar participante" ON conversa_participantes FOR INSERT
WITH CHECK (
  conversa_id IN (SELECT conversa_id FROM conversa_participantes WHERE usuario_id = auth.uid())
);

CREATE POLICY "Ver mensagens privadas" ON mensagens_privadas FOR SELECT
USING (
  conversa_id IN (SELECT conversa_id FROM conversa_participantes WHERE usuario_id = auth.uid())
);

CREATE POLICY "Enviar mensagem privada" ON mensagens_privadas FOR INSERT
WITH CHECK (
  autor_id = auth.uid()
  AND conversa_id IN (SELECT conversa_id FROM conversa_participantes WHERE usuario_id = auth.uid())
);

-- =============================================
-- HABILITAR REALTIME PARA CHAT
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE mensagens_canal;
ALTER PUBLICATION supabase_realtime ADD TABLE mensagens_privadas;

-- =============================================
-- CRIAR CANAIS PADRÃO PARA TODAS AS CASAS
-- =============================================
INSERT INTO canais_casa (institution_id, casa_id, nome, descricao, icone, tipo, ordem, apenas_lideranca)
SELECT
  i.id as institution_id,
  int.id as casa_id,
  canal.nome,
  canal.descricao,
  canal.icone,
  canal.tipo,
  canal.ordem,
  canal.apenas_lideranca
FROM institutions i
CROSS JOIN inteligencias int
CROSS JOIN (VALUES
  ('regras', 'Regras e informações da casa', '📋', 'regras', 1, true),
  ('avisos', 'Comunicados da liderança', '📢', 'avisos', 2, true),
  ('geral', 'Conversas gerais', '💬', 'texto', 3, false),
  ('missoes', 'Discussão sobre missões', '🎯', 'texto', 4, false),
  ('estudos', 'Ajuda com estudos', '📚', 'texto', 5, false),
  ('diversao', 'Momento de descontração', '🎮', 'texto', 6, false)
) AS canal(nome, descricao, icone, tipo, ordem, apenas_lideranca)
ON CONFLICT (institution_id, casa_id, nome) DO NOTHING;
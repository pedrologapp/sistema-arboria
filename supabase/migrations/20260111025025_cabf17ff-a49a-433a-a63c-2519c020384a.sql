-- Adicionar campo notificacao_ativa para controle de badges
ALTER TABLE alertas_alunos 
ADD COLUMN IF NOT EXISTS notificacao_ativa boolean DEFAULT true;

-- Comentário explicativo
COMMENT ON COLUMN alertas_alunos.notificacao_ativa IS 
  'Badge de notificação ativo até professor tomar ação';

-- Índice para queries de badge
CREATE INDEX IF NOT EXISTS idx_alertas_notificacao ON alertas_alunos(notificacao_ativa) WHERE notificacao_ativa = true;
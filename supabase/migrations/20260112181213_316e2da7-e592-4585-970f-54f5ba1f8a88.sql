-- Adicionar colunas para liberação por série (7º e 8º ano)
ALTER TABLE missoes 
ADD COLUMN IF NOT EXISTS data_liberacao_7ano timestamptz,
ADD COLUMN IF NOT EXISTS data_liberacao_8ano timestamptz;
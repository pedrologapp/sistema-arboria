-- Adicionar campos para liberação por série específica
ALTER TABLE missoes 
ADD COLUMN IF NOT EXISTS data_liberacao_6ano timestamptz,
ADD COLUMN IF NOT EXISTS data_liberacao_9ano timestamptz;
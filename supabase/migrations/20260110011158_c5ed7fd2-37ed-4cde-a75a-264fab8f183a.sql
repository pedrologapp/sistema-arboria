-- Adicionar novos campos para organização de missões
ALTER TABLE missoes ADD COLUMN IF NOT EXISTS semana smallint;
ALTER TABLE missoes ADD COLUMN IF NOT EXISTS tipo_missao text DEFAULT 'geral';
ALTER TABLE missoes ADD COLUMN IF NOT EXISTS inteligencia_cross smallint REFERENCES inteligencias(id);

-- Atualizar missões existentes com valores padrão
UPDATE missoes SET semana = 1, tipo_missao = 'geral' WHERE semana IS NULL;
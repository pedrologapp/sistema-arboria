-- Adicionar campos para dicas e reflexão na tabela missoes
ALTER TABLE missoes ADD COLUMN IF NOT EXISTS dicas text;
ALTER TABLE missoes ADD COLUMN IF NOT EXISTS reflexao text;
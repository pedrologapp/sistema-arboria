-- 1. Adicionar novo valor 'em_acompanhamento' ao enum status_alerta
ALTER TYPE status_alerta ADD VALUE IF NOT EXISTS 'em_acompanhamento' AFTER 'visualizado';

-- 2. Adicionar colunas na tabela acoes_professor
ALTER TABLE acoes_professor 
ADD COLUMN IF NOT EXISTS aluno_id UUID REFERENCES profiles(id);

ALTER TABLE acoes_professor 
ADD COLUMN IF NOT EXISTS status_aluno TEXT CHECK (status_aluno IN ('melhorou', 'nao_melhorou'));

-- Renomear 'descoberta' para 'descricao' para maior clareza
ALTER TABLE acoes_professor RENAME COLUMN descoberta TO descricao;

-- 3. Criar índices para consultas futuras do admin
CREATE INDEX IF NOT EXISTS idx_acoes_professor_aluno ON acoes_professor(aluno_id);
CREATE INDEX IF NOT EXISTS idx_acoes_professor_professor ON acoes_professor(professor_id);
CREATE INDEX IF NOT EXISTS idx_acoes_professor_alerta ON acoes_professor(alerta_id);
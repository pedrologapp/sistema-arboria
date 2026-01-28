-- Adicionar coluna matricula_externa para vincular com sistema externo (ActiveSoft)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS matricula_externa VARCHAR(50);

-- Índice único parcial: permite NULL mas garante unicidade quando preenchido
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_matricula_externa 
ON profiles(matricula_externa) WHERE matricula_externa IS NOT NULL;

-- Comentário para documentação
COMMENT ON COLUMN profiles.matricula_externa IS 'Identificador único do aluno no sistema externo (ActiveSoft)';
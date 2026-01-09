-- Adicionar campo ultima_atividade na tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ultima_atividade timestamptz DEFAULT now();
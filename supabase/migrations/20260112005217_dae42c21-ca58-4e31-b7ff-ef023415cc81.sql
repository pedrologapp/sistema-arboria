-- Adicionar campo para rastrear se o aluno já viu a aprovação
ALTER TABLE entregas 
ADD COLUMN IF NOT EXISTS visualizada_pelo_aluno BOOLEAN DEFAULT false;

-- Marcar entregas aprovadas existentes como já visualizadas
-- (para não criar notificações falsas para entregas antigas)
UPDATE entregas 
SET visualizada_pelo_aluno = true 
WHERE status = 'aprovada';
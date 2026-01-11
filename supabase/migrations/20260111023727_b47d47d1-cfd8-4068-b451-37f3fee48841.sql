-- Add columns for phase tracking on alerts
ALTER TABLE alertas_alunos 
ADD COLUMN IF NOT EXISTS fase_id uuid REFERENCES fases(id),
ADD COLUMN IF NOT EXISTS fase_origem_id uuid REFERENCES fases(id);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_alertas_fase ON alertas_alunos(fase_id);
CREATE INDEX IF NOT EXISTS idx_alertas_fase_origem ON alertas_alunos(fase_origem_id);

-- Comments for documentation
COMMENT ON COLUMN alertas_alunos.fase_id IS 'Fase em que o alerta está sendo exibido';
COMMENT ON COLUMN alertas_alunos.fase_origem_id IS 'Fase em que o alerta foi originalmente criado (para alertas de fase anterior)';
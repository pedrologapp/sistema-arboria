-- Adicionar coluna segmento na tabela turmas
ALTER TABLE turmas 
ADD COLUMN segmento TEXT CHECK (segmento IN ('infantil', 'fundamental1', 'fundamental2'));

-- Popular dados existentes baseado na série atual
-- Séries 1-5 serão fundamental1 (padrão, pois não há turmas do infantil cadastradas)
-- Séries 6-9 serão fundamental2
UPDATE turmas SET segmento = 
  CASE 
    WHEN serie >= 6 THEN 'fundamental2'
    ELSE 'fundamental1'
  END
WHERE segmento IS NULL;

-- Criar índice para otimizar consultas por segmento
CREATE INDEX idx_turmas_segmento ON turmas(segmento);
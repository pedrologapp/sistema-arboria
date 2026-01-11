-- Adicionar novos valores ao enum tipo_alerta para feedback completo
ALTER TYPE tipo_alerta ADD VALUE IF NOT EXISTS 'brilhando';
ALTER TYPE tipo_alerta ADD VALUE IF NOT EXISTS 'melhorando';
ALTER TYPE tipo_alerta ADD VALUE IF NOT EXISTS 'atencao_recente';
ALTER TYPE tipo_alerta ADD VALUE IF NOT EXISTS 'bom_comeco';
ALTER TYPE tipo_alerta ADD VALUE IF NOT EXISTS 'fique_de_olho';
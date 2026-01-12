-- Desativar todas as fases de 2025 que estão ativas
-- Isso garante que apenas a fase de 2026 (Intrapessoal) fique ativa
UPDATE fases 
SET ativo = false 
WHERE ano_letivo = 2025 
  AND ativo = true;
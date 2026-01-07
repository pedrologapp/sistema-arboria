-- =====================================================
-- FASE 2 - PARTE 1: ADICIONAR VALOR 'professor' AO ENUM
-- =====================================================
-- Este valor será usado na próxima migração

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'professor' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE app_role ADD VALUE 'professor';
  END IF;
END
$$;
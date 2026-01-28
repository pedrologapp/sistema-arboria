-- 1. Adicionar coluna segmento na tabela fases
ALTER TABLE public.fases 
ADD COLUMN segmento text NOT NULL DEFAULT 'fundamental2';

-- 2. Criar índice para performance
CREATE INDEX idx_fases_segmento ON public.fases(segmento);

-- 3. Constraint para valores válidos
ALTER TABLE public.fases 
ADD CONSTRAINT fases_segmento_check 
CHECK (segmento IN ('infantil', 'fundamental1', 'fundamental2'));

-- 4. Atualizar professores existentes para fundamental2
UPDATE public.profiles 
SET segmento = 'fundamental2'
WHERE id IN (
  SELECT user_id FROM user_roles WHERE role = 'professor'
);
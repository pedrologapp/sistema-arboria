-- =============================================
-- entregas.tem_anexo — flag que indica se a entrega tem arquivo anexado
-- Mantido automaticamente por trigger em entrega_arquivos (nunca dessincroniza).
-- Idempotente: pode rodar várias vezes.
-- =============================================

-- 1) Coluna (default false, NOT NULL pra nunca ficar indefinido)
ALTER TABLE public.entregas
  ADD COLUMN IF NOT EXISTS tem_anexo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.entregas.tem_anexo IS
  'TRUE se a entrega tem ao menos um arquivo em entrega_arquivos. Mantido por trigger — não editar manualmente.';

-- 2) Função que RECALCULA o flag de uma entrega a partir da verdade (EXISTS).
--    Recalcular (em vez de só setar true no insert) garante que o flag fique
--    correto também em DELETE e em troca de entrega_id.
--    SECURITY DEFINER: o trigger dispara no contexto do aluno (que não tem
--    permissão de UPDATE em entregas via RLS); rodar como owner permite o sync.
CREATE OR REPLACE FUNCTION public.fn_sync_entrega_tem_anexo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    UPDATE public.entregas e
       SET tem_anexo = EXISTS (
             SELECT 1 FROM public.entrega_arquivos a WHERE a.entrega_id = OLD.entrega_id
           )
     WHERE e.id = OLD.entrega_id;
    RETURN OLD;
  END IF;

  -- INSERT ou UPDATE: recalcula a entrega referenciada por NEW
  UPDATE public.entregas e
     SET tem_anexo = EXISTS (
           SELECT 1 FROM public.entrega_arquivos a WHERE a.entrega_id = NEW.entrega_id
         )
   WHERE e.id = NEW.entrega_id;

  -- Se o arquivo foi remanejado pra outra entrega, recalcula a antiga também
  IF (TG_OP = 'UPDATE' AND NEW.entrega_id IS DISTINCT FROM OLD.entrega_id) THEN
    UPDATE public.entregas e
       SET tem_anexo = EXISTS (
             SELECT 1 FROM public.entrega_arquivos a WHERE a.entrega_id = OLD.entrega_id
           )
     WHERE e.id = OLD.entrega_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Trigger: dispara em qualquer mudança de entrega_arquivos
DROP TRIGGER IF EXISTS trg_sync_entrega_tem_anexo ON public.entrega_arquivos;
CREATE TRIGGER trg_sync_entrega_tem_anexo
  AFTER INSERT OR UPDATE OR DELETE ON public.entrega_arquivos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_entrega_tem_anexo();

-- 4) Backfill: corrige o flag de TODAS as entregas existentes a partir da verdade.
--    Idempotente — pode rodar quantas vezes quiser.
UPDATE public.entregas e
   SET tem_anexo = EXISTS (
         SELECT 1 FROM public.entrega_arquivos a WHERE a.entrega_id = e.id
       )
 WHERE e.tem_anexo IS DISTINCT FROM EXISTS (
         SELECT 1 FROM public.entrega_arquivos a WHERE a.entrega_id = e.id
       );

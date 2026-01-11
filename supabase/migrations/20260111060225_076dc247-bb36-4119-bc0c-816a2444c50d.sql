
-- Recriar o trigger (o DROP pode ter falhado se não existia)
DROP TRIGGER IF EXISTS trg_analisar_apos_observacao ON observacoes;

CREATE TRIGGER trg_analisar_apos_observacao
  AFTER INSERT ON observacoes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_chamar_analise_observacao();

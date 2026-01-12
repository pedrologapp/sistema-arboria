-- Adicionar novas colunas para contexto e PDF na tabela missoes
ALTER TABLE missoes 
ADD COLUMN IF NOT EXISTS contexto TEXT,
ADD COLUMN IF NOT EXISTS arquivo_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS arquivo_pdf_nome TEXT;

-- Comentários para documentação
COMMENT ON COLUMN missoes.contexto IS 'Contexto da missão - explica por que ela é importante';
COMMENT ON COLUMN missoes.arquivo_pdf_url IS 'URL do PDF anexado à missão';
COMMENT ON COLUMN missoes.arquivo_pdf_nome IS 'Nome original do arquivo PDF';
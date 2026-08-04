-- ============================================================
-- CORREÇÃO DE INCIDENTE (04/08/2026) — "arquivo muito grande".
--
-- O bucket 'entregas' estava em 10MB. Foto de celular em alta e PDF gerado por
-- app de scanner passam disso com frequência, e o aluno só via um erro seco.
-- Sobe pra 25MB (mesmo número validado no front) e aceita HEIC/HEIF, que é o
-- formato que o iPhone entrega quando não converte.
-- ============================================================
UPDATE storage.buckets
SET file_size_limit = 26214400,  -- 25MB
    allowed_mime_types = ARRAY[
      'image/png', 'image/jpeg', 'image/gif', 'image/webp',
      'image/heic', 'image/heif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
WHERE id = 'entregas';

-- Alterar bucket 'entregas' para público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'entregas';
-- Revert entregas bucket to private to enforce existing RLS storage policies
UPDATE storage.buckets 
SET public = false 
WHERE id = 'entregas';
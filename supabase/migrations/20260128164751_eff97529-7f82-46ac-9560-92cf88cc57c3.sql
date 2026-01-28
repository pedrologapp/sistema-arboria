ALTER TABLE profiles 
ADD COLUMN segmento text;

COMMENT ON COLUMN profiles.segmento IS 'Segmento educacional: infantil, fundamental1, fundamental2';
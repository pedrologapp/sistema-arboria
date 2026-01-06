-- Add nome, sobrenome, and must_change_password columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS nome TEXT,
ADD COLUMN IF NOT EXISTS sobrenome TEXT,
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true;

-- Migrate existing full_name data to nome and sobrenome
UPDATE public.profiles SET
  nome = SPLIT_PART(full_name, ' ', 1),
  sobrenome = CASE 
    WHEN POSITION(' ' IN full_name) > 0 THEN TRIM(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1))
    ELSE ''
  END
WHERE full_name IS NOT NULL AND full_name != '' AND nome IS NULL;

-- Update the handle_new_user trigger function to handle nome and sobrenome
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, sobrenome, full_name, must_change_password)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'nome',
    new.raw_user_meta_data ->> 'sobrenome',
    COALESCE(new.raw_user_meta_data ->> 'full_name', 
      CONCAT_WS(' ', new.raw_user_meta_data ->> 'nome', new.raw_user_meta_data ->> 'sobrenome')),
    COALESCE((new.raw_user_meta_data ->> 'must_change_password')::boolean, true)
  );
  RETURN new;
END;
$$;

-- Create index for better performance on must_change_password queries
CREATE INDEX IF NOT EXISTS idx_profiles_must_change_password ON public.profiles(must_change_password) WHERE must_change_password = true;
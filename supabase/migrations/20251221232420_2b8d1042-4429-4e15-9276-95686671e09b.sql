-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN serie text,
ADD COLUMN turma text,
ADD COLUMN casa text;

-- Update the handle_new_user trigger to include the new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, institution, serie, turma, casa)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'institution',
    NEW.raw_user_meta_data ->> 'serie',
    NEW.raw_user_meta_data ->> 'turma',
    NEW.raw_user_meta_data ->> 'casa'
  );
  RETURN NEW;
END;
$function$;
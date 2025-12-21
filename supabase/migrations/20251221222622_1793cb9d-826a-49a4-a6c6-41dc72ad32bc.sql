-- Add institution_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_profiles_institution_id ON public.profiles(institution_id);

-- Migrate existing data: match institution name to institution id
UPDATE public.profiles p
SET institution_id = i.id
FROM public.institutions i
WHERE p.institution = i.name AND p.institution IS NOT NULL;
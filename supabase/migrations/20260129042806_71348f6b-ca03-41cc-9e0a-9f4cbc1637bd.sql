-- Admin pode fazer upload de avatars de qualquer usuário
CREATE POLICY "Admin can upload any avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND 
  public.has_role(auth.uid(), 'admin')
);

-- Admin pode deletar avatars de qualquer usuário
CREATE POLICY "Admin can delete any avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  public.has_role(auth.uid(), 'admin')
);

-- Admin pode atualizar avatars de qualquer usuário
CREATE POLICY "Admin can update any avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  public.has_role(auth.uid(), 'admin')
);
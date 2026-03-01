
CREATE POLICY "Admin pode fazer upload de conteudo de fase"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fase-conteudos' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin pode atualizar conteudo de fase"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'fase-conteudos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin pode deletar conteudo de fase"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'fase-conteudos' AND has_role(auth.uid(), 'admin'::app_role));

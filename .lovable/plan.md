

# Correção: Upload de Conteúdo Falhando (Failed to Fetch)

## Problema

O bucket `fase-conteudos` no storage tem apenas uma policy de SELECT (leitura publica). Nao existe nenhuma policy de INSERT, entao nenhum usuario consegue fazer upload - nem admin.

## Solução

Criar uma migration adicionando uma policy de INSERT para admins no bucket `fase-conteudos`:

```sql
CREATE POLICY "Admin pode fazer upload de conteudo de fase"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fase-conteudos' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );
```

Tambem adicionar policies de UPDATE e DELETE para que admins possam substituir e remover arquivos:

```sql
CREATE POLICY "Admin pode atualizar conteudo de fase"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'fase-conteudos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin pode deletar conteudo de fase"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'fase-conteudos' AND has_role(auth.uid(), 'admin'::app_role));
```

Uma unica migration resolve tudo. Nenhuma alteracao de codigo necessaria.


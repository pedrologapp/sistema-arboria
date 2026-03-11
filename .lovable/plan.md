

## Diagnóstico: Erro ao anexar arquivos em missões

### Causa raiz

O bucket `entregas` no storage tem uma lista restrita de `allowed_mime_types`:

```
image/png, image/jpeg, image/gif, image/webp, application/pdf, 
application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain
```

Porém o input de arquivo aceita `image/*`, que inclui tipos **não permitidos** pelo bucket:
- `image/heic` e `image/heif` (fotos de iPhone)
- `image/svg+xml`
- `image/bmp`, `image/tiff`
- `image/avif`

Quando um aluno tenta enviar uma foto HEIC do celular (muito comum em iPhones), o upload falha silenciosamente — o `console.error` registra mas o `continue` na linha 544 simplesmente pula o arquivo sem avisar o aluno.

### Correção (2 partes)

**1. Migração SQL — Expandir MIME types do bucket**

```sql
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/png','image/jpeg','image/gif','image/webp','image/heic','image/heif',
  'image/bmp','image/svg+xml','image/avif',
  'application/pdf',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'video/mp4','video/quicktime',
  'audio/mpeg','audio/mp4'
]
WHERE id = 'entregas';
```

**2. Código — Feedback ao aluno quando upload falha (`MissaoDetalhePage.tsx`)**

No loop de upload (linhas 533-565), em vez de `continue` silencioso, mostrar toast de erro ao aluno com o nome do arquivo que falhou:

```typescript
if (uploadError) {
  console.error('Erro no upload:', uploadError);
  toast({
    variant: "destructive",
    title: "Erro ao enviar arquivo",
    description: `Não foi possível enviar "${arquivo.file.name}". Tente outro formato.`
  });
  continue;
}
```

Isso garante que: formatos comuns de celular (HEIC) passem, e qualquer falha restante seja comunicada ao aluno.




# Plano: Aceitar Matrícula na Edge Function

## Problema Identificado

O N8N está enviando um UUID que não corresponde ao Arboria. O aluno existe, mas com ID diferente:

| Campo | Valor N8N | Valor Arboria |
|-------|-----------|---------------|
| UUID | `7ef95c7e-c0f7-41ea-82f3-e488f20ab128` | `84938726-22bb-48fe-9263-4a20cc2af164` |
| Matrícula | `2287.2026` | `22872026` |

---

## Solução

Modificar a Edge Function para aceitar identificação por matrícula, que é o campo comum entre sistemas.

---

## Alterações na Edge Function

### Arquivo: `supabase/functions/receber-sugestao-n8n/index.ts`

### Novo Payload Aceito

```json
{
  "aluno_id": "uuid-opcional-se-tiver-matricula",
  "aluno_matricula": "22872026",
  ...
}
```

### Nova Lógica de Busca

```typescript
// Prioridade: matricula > aluno_id
let aluno = null;

if (payload.aluno_matricula) {
  // Normalizar matricula (remover pontos e hífens)
  const matriculaNormalizada = payload.aluno_matricula.replace(/[.\-]/g, '');
  
  const { data } = await supabase
    .from("profiles")
    .select("id, institution_id, casa_id")
    .eq("matricula_externa", matriculaNormalizada)
    .maybeSingle();
  
  aluno = data;
}

// Fallback para aluno_id se não encontrou por matrícula
if (!aluno && payload.aluno_id) {
  const { data } = await supabase
    .from("profiles")
    .select("id, institution_id, casa_id")
    .eq("id", payload.aluno_id)
    .maybeSingle();
  
  aluno = data;
}

if (!aluno) {
  return new Response(
    JSON.stringify({
      success: false,
      error: `Aluno não encontrado. Verifique aluno_matricula ou aluno_id.`,
    }),
    { status: 404 }
  );
}
```

---

## Validação de Campos

Atualizar validação para aceitar matricula OU id:

```typescript
if (!payload.aluno_id && !payload.aluno_matricula) {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Informe aluno_id ou aluno_matricula",
    }),
    { status: 400 }
  );
}
```

---

## Configuração N8N

Após a atualização, o N8N pode enviar:

```json
{
  "aluno_matricula": "2287.2026",
  "estado": "precisa_atencao",
  "texto_acontecendo": "Descrição..."
}
```

A função normalizará automaticamente `2287.2026` para `22872026`.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/receber-sugestao-n8n/index.ts` | Adicionar busca por matricula_externa |

---

## Resumo para o N8N

Após implementação:
- Pode usar `aluno_matricula` (recomendado)
- Formato aceito: `22872026` ou `2287.2026` (normalizado automaticamente)
- O `aluno_id` continua funcionando se for o UUID do Arboria


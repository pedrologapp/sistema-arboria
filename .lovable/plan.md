
# Plano: Atualizar URL do Webhook N8N

## Objetivo

Alterar a URL do webhook de:
- **De:** `https://n8n.escolaamadeus.com/webhook-test/projetoarboria`
- **Para:** `https://webhook.escolaamadeus.com/webhook/projetoarboria`

---

## Locais a Alterar

### 1. Frontend: `src/components/professor/RegistrarAcaoModal.tsx`

**Linha 104** - Função `enviarParaN8N`:

```typescript
// DE:
await fetch('https://n8n.escolaamadeus.com/webhook-test/projetoarboria', {

// PARA:
await fetch('https://webhook.escolaamadeus.com/webhook/projetoarboria', {
```

---

### 2. Backend: Trigger PostgreSQL `trigger_notificar_n8n_observacao()`

A função de trigger atual usa a URL antiga. Precisa criar uma nova migration para atualizar.

**Nova migration SQL:**

```sql
-- Atualizar a função trigger para usar o novo endpoint
CREATE OR REPLACE FUNCTION public.trigger_notificar_n8n_observacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  -- ... (variáveis existentes)
  v_endpoint_url TEXT := 'https://webhook.escolaamadeus.com/webhook/projetoarboria';  -- ✅ NOVA URL
BEGIN
  -- ... (resto do código permanece igual)
END;
$function$;
```

---

## Resumo das Alterações

| Local | Arquivo | Mudança |
|-------|---------|---------|
| Frontend | `src/components/professor/RegistrarAcaoModal.tsx` | Linha 104: trocar URL |
| Backend | Migration SQL (nova) | Recriar função trigger com nova URL |

---

## Impacto

- **Observações registradas:** Serão enviadas para o novo endpoint (via trigger)
- **Ações do professor:** Serão enviadas para o novo endpoint (via fetch frontend)

Ambos os fluxos passarão a usar `https://webhook.escolaamadeus.com/webhook/projetoarboria`.

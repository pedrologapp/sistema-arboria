

## Plano: Corrigir erro "column profiles_1.role does not exist"

### Problema
A query de logs faz `.select('*, profiles!activity_logs_user_id_fkey(full_name, avatar_url, casa_id, role)')` mas a tabela `profiles` **não tem coluna `role`**. Isso causa erro 42703 em todas as buscas, retornando dados vazios.

### Solução

**Arquivo:** `src/pages/admin/AtividadesPage.tsx`

Remover `role` da select do join com profiles (linha 173):

```typescript
// De:
.select('*, profiles!activity_logs_user_id_fkey(full_name, avatar_url, casa_id, role)')

// Para:
.select('*, profiles!activity_logs_user_id_fkey(full_name, avatar_url, casa_id)')
```

Também remover `role` da interface `ActivityLog.profiles` (linha 38).

Nenhuma outra alteração necessária.



# Plano: Corrigir Inserção de Roles na Importação

## Problema Identificado

Os logs mostram o erro:
```
Erro ao inserir roles: invalid input syntax for type smallint: ""
```

### Diagnóstico

1. **95 profiles existem no banco** ✅
2. **0 registros em `user_roles` com role='user'** ❌
3. **A query da lista cruza profiles com user_roles** - sem roles, nenhum aluno aparece

### Causa Raiz

O código de upsert está usando:
```typescript
.upsert(rolesData, { onConflict: 'user_id,role' })
```

O Supabase SDK interpreta incorretamente o parâmetro `onConflict` com múltiplas colunas como string. Isso causa uma tentativa de cast inválido gerando o erro de `smallint`.

## Solução

Mudar para um insert simples em vez de upsert (já que são registros novos), e tratar conflitos via `ignoreDuplicates`:

```typescript
const { error: rolesError } = await supabaseAdmin
  .from('user_roles')
  .insert(rolesData)
  .select();
```

## Mudanças Necessárias

**Arquivo:** `supabase/functions/import-alunos-rapido/index.ts`

### 1. Corrigir inserção de roles (linhas 256-268)

**De:**
```typescript
const rolesData = successfulUsers.map(u => ({
  user_id: u.authId,
  role: 'user' as const
}));

const { error: rolesError } = await supabaseAdmin
  .from('user_roles')
  .upsert(rolesData, { onConflict: 'user_id,role' });
```

**Para:**
```typescript
// Inserir roles um por um para evitar problemas com enum
for (const user of successfulUsers) {
  const { error: roleError } = await supabaseAdmin
    .from('user_roles')
    .insert({ 
      user_id: user.authId, 
      role: 'user' 
    });
  
  if (roleError) {
    console.error(`[import-alunos-rapido] Erro role ${user.authId}:`, roleError);
  }
}
```

### 2. Adicionar script para corrigir alunos já importados

Depois da correção, rodar uma query para inserir os roles dos 95 alunos que já existem:

```sql
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'user'::app_role
FROM profiles p
WHERE p.institution_id = '902876e9-b263-4c01-9013-aeef7b6d24e1'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id
  );
```

## Fluxo Após Correção

1. Atualizar a Edge Function com insert individual
2. Executar migration para corrigir os 95 alunos existentes
3. A lista mostrará os alunos imediatamente

## Arquivos a Modificar

1. **`supabase/functions/import-alunos-rapido/index.ts`** - Corrigir lógica de insert de roles
2. **Migration SQL** - Inserir roles para alunos já importados

## Resultado Esperado

- Os 95 alunos aparecerão na lista imediatamente após a migration
- Novas importações criarão os roles corretamente

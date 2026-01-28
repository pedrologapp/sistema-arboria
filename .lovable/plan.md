

# Plano: Corrigir Edge Function para Deletar Profiles Órfãos

## Problema Identificado

A função `delete-alunos-por-segmento` está filtrando **apenas usuários com `role='user'`** na tabela `user_roles`, mas os 60 alunos do infantil foram importados **sem registro em `user_roles`**.

### Situação Atual:
| Tabela | Registros |
|--------|-----------|
| profiles (segmento=infantil) | 60 |
| user_roles (role=user) para esses profiles | 0 |
| inteligencia_scores para esses profiles | 478 |

## Solução

Modificar a edge function para:

1. **Buscar todos os profiles do segmento** (não apenas os com role='user')
2. **Excluir da lista admins e professores** (que TÊM role definido)
3. Manter a mesma lógica de deleção de dependências e auth users

## Mudança na Lógica

### Antes (atual):
```typescript
// Busca profiles do segmento
// Filtra apenas os que têm role='user' em user_roles
// Problema: profiles sem role são ignorados
```

### Depois (corrigido):
```typescript
// Busca profiles do segmento
// Busca quais desses são admin ou professor
// Exclui admins e professores da lista
// Deleta todos os demais (incluindo os sem role)
```

## Arquivo a Modificar

### `supabase/functions/delete-alunos-por-segmento/index.ts`

Substituir a lógica do passo 8 (filtrar por role='user') por:

```typescript
// 8. Excluir admins e professores (que NÃO devem ser deletados)
const { data: protectedRoles } = await supabaseAdmin
  .from("user_roles")
  .select("user_id")
  .in("role", ["admin", "professor"])
  .in("user_id", profileIds);

const protectedIds = new Set(protectedRoles?.map(r => r.user_id) || []);

// Todos os profiles do segmento EXCETO admins/professores
const studentIds = profileIds.filter(id => !protectedIds.has(id));
```

Esta abordagem é mais segura porque:
- Protege explicitamente admins e professores
- Captura profiles "órfãos" sem role
- Captura profiles com role='user'
- Nunca deleta acidentalmente usuários privilegiados

## Resumo de Mudanças

1. Inverter a lógica: ao invés de "pegar só role='user'", "excluir admin/professor"
2. Atualizar mensagem de log para refletir a nova lógica
3. Re-deploy automático

Após a correção, podemos executar novamente a função para deletar os 60 alunos.


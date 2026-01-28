
# Plano: Otimizar Exclusão em Massa de Alunos

## Problema Atual
A função está deletando 419 alunos **sequencialmente**, fazendo ~15 queries por aluno = ~6.000+ operações. Isso causa timeout e demora excessiva.

## Solução: Deletar por Lotes com SQL Direto

### Estratégia
Em vez de deletar aluno por aluno, vamos deletar **todos os registros dependentes de uma vez** usando queries com `IN (array de IDs)`.

### Antes (lento)
```text
Para cada aluno (419x):
  - DELETE score_ajustes_log WHERE aluno_id = X
  - DELETE entregas WHERE aluno_id = X
  - ... (15 tabelas)
  - DELETE auth user
Total: ~6.000+ queries
```

### Depois (rápido)
```text
1x DELETE score_ajustes_log WHERE aluno_id IN (todos os 419 IDs)
1x DELETE entregas WHERE aluno_id IN (todos os 419 IDs)
... (15 tabelas)
Depois: deletar auth users em paralelo (batches de 10)
Total: ~15 queries + auth deletes em paralelo
```

## Alterações na Edge Function

### 1. Limpar todas as tabelas dependentes de uma vez
```typescript
// Deletar em batch - uma query por tabela
await supabaseAdmin.from("score_ajustes_log").delete().in("aluno_id", studentIds);
await supabaseAdmin.from("entregas").delete().in("aluno_id", studentIds);
// ... demais tabelas
```

### 2. Deletar usuários do Auth em paralelo
```typescript
// Processar em lotes de 10 em paralelo
const BATCH_SIZE = 10;
for (let i = 0; i < studentIds.length; i += BATCH_SIZE) {
  const batch = studentIds.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(id => 
    supabaseAdmin.auth.admin.deleteUser(id)
  ));
}
```

## Resultado Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Queries de limpeza | ~6.000 | ~15 |
| Auth deletes | Sequencial | 10 em paralelo |
| Tempo estimado (419 alunos) | 5-10 min | 30-60 seg |

## Arquivo a Modificar
- `supabase/functions/delete-users-bulk/index.ts`

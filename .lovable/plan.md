
# Plano: Corrigir Carregamento de Alunos

## Problema Identificado
A query de alunos falha porque usa `.in('id', userIds)` com 375 UUIDs, gerando uma URL muito longa que excede o limite do navegador/API.

## Solucao: Inverter a Logica da Query

Em vez de:
1. Buscar todos os user_ids com role = 'user' (375 IDs)
2. Fazer `.in('id', userIds)` no profiles

Fazer:
1. Buscar profiles da instituicao
2. Para cada profile, verificar se tem role = 'user' em batches pequenos

### Implementacao

Modificar a query de alunos em `src/pages/admin/PessoasPage.tsx`:

```typescript
// Buscar alunos (role = 'user')
const { data: alunos, isLoading: loadingAlunos } = useQuery({
  queryKey: ['admin-alunos', institutionId],
  queryFn: async () => {
    // 1. Buscar TODOS os profiles da instituicao
    const { data: allProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, nome, sobrenome, full_name, serie, turma, casa_id, avatar_url, created_at, segmento')
      .eq('institution_id', institutionId)
      .order('serie')
      .order('turma')
      .order('full_name');
    
    if (profileError) throw profileError;
    if (!allProfiles || allProfiles.length === 0) return [];
    
    // 2. Buscar todos os user_roles com role = 'user' (sem filtro de ID)
    const { data: roleUsers, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'user');
    
    if (roleError) throw roleError;
    
    // 3. Criar Set para lookup rapido O(1)
    const studentIds = new Set(roleUsers?.map(r => r.user_id) || []);
    
    // 4. Filtrar profiles que sao alunos
    return allProfiles.filter(p => studentIds.has(p.id));
  },
  enabled: !!institutionId
});
```

## Vantagens da Nova Abordagem

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Query profiles | `.in(375 IDs)` - URL enorme | `.eq(institution_id)` - URL curta |
| Query user_roles | Funciona | Continua funcionando |
| Filtro | No banco | No cliente (Set - O(1)) |
| Performance | Falha | Funciona com qualquer quantidade |

## Arquivo a Modificar
- `src/pages/admin/PessoasPage.tsx` - Query de alunos (linhas 73-103)



## Plano: Sincronizar fase do professor com datas do admin

### Problema

O `ProfessorContext` busca a fase atual filtrando por `ativo = true`. Porém, se o admin configurou as datas das fases mas não marcou manualmente como "ativa", a fase não aparece no painel do professor. Atualmente só existe fase 1 para o segmento infantil, e ela está marcada como ativa.

A lógica deve ser: **a fase atual é determinada pelas datas** (`data_inicio` e `data_fim`), não pelo flag `ativo`. Se hoje está dentro do período de uma fase, essa é a fase atual.

### Solução

**Arquivo: `src/contexts/ProfessorContext.tsx`**

Alterar a query de fase atual (linhas 202-231) para:
1. Remover o filtro `.eq('ativo', true)`
2. Usar filtros de data: `.lte('data_inicio', hoje)` e `.gte('data_fim', hoje)` para encontrar a fase cujo período inclui a data atual
3. Manter os filtros de `institution_id`, `segmento` e `serie`
4. Fallback: se nenhuma fase cobre a data atual, buscar a próxima fase futura mais próxima

```typescript
const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

let faseQuery = supabase
  .from('fases')
  .select(`...`)
  .eq('institution_id', profileData.institution_id)
  .lte('data_inicio', hoje)
  .gte('data_fim', hoje);

// Filtros de serie e segmento mantidos
```

Isso garante que assim que o admin configurar as datas no painel, o professor verá automaticamente a fase correta sem precisar de ação manual adicional.


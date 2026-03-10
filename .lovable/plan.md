

## Diagnóstico: Histórico de Observações vazio

### Causa raiz identificada

A query no `HistoricoObservacoesTurma.tsx` usa `profiles!inner(...)` para fazer join com a tabela `profiles`. Porém, a tabela `observacoes` tem **duas** foreign keys para `profiles`:

- `observacoes_aluno_id_fkey` (aluno_id → profiles.id)
- `observacoes_professor_id_fkey` (professor_id → profiles.id)

Quando o Supabase encontra essa ambiguidade, a query falha ou retorna vazio. O join precisa especificar **qual** FK usar.

### Bug secundário: duplicate key warning

O console mostra "Encountered two children with the same key `0bfb28c5-...`" — provavelmente o mesmo aluno tem múltiplas observações, e algum `.map()` no `CirculoTurmaDirectPage` está usando um ID que se repete. Isso será corrigido junto.

### Correção

**Arquivo: `src/components/professor/circulo/HistoricoObservacoesTurma.tsx`**

Alterar a query para especificar o FK explicitamente:

```typescript
// ANTES (ambíguo):
profiles!inner (full_name, nome, sobrenome)

// DEPOIS (explícito):
profiles!observacoes_aluno_id_fkey (full_name, nome, sobrenome)
```

Remover o `!inner` para evitar que falhas de RLS no join filtrem linhas inteiras (seguindo o padrão defensivo do projeto).

A query corrigida ficará:
```typescript
.select(`
  id,
  aluno_id,
  data_observacao,
  foi_cross_im,
  observacao_texto,
  created_at,
  sinal_id,
  sinais!observacoes_sinal_id_fkey (emoji, label_pt, valencia),
  profiles!observacoes_aluno_id_fkey (full_name, nome, sobrenome)
`)
```

Adicionar null-check defensivo no `.map()` para `obs.sinais` e `obs.profiles`, conforme padrão do projeto.

### Nenhuma alteração de RLS necessária

A política "Professor vê próprias observações" (`professor_id = auth.uid()`) já garante que professoras vejam as observações que elas mesmas registraram. Isso é suficiente para o histórico funcionar.



# Corrigir turmas vinculadas do Infantil no modal de adicionar professor

## Problema
A query de turmas disponíveis usa `SERIES_POR_SEGMENTO` que tem `['2', '3', '4', '5']` para infantil, mas as turmas do infantil têm série como texto (`'Maternalzinho(2)'`, `'Maternal(3)'`, `'Grupo IV'`, `'Grupo V'`). Resultado: nenhuma turma aparece.

## Solução
Em `ModalAdicionarUsuario.tsx`, trocar a query para filtrar por `segmento` em vez de `.in('serie', series)`:

```ts
const { data } = await supabase
  .from('turmas')
  .select('id, nome, serie, turma_letra')
  .eq('institution_id', institutionId)
  .eq('segmento', segmento)   // ← filtrar pelo segmento direto
  .order('serie')
  .order('turma_letra');
```

Remover o `SERIES_POR_SEGMENTO` que já não é mais necessário (ou mantê-lo apenas para o campo de séries do aluno, se ainda usado).

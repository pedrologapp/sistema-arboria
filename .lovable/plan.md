

# Preservar Filtros ao Navegar na Pagina de Pessoas

## Problema

Os filtros (segmento, serie, turma, casa, busca) sao armazenados em `useState`, que reseta toda vez que o componente e remontado -- ou seja, ao navegar para o perfil de um aluno e voltar, todos os filtros voltam ao estado inicial.

## Solucao

Usar **URL search params** para persistir os filtros. Ao aplicar um filtro, a URL sera atualizada (ex: `/admin/pessoas?segmento=fundamental2&serie=6`). Ao voltar da pagina do aluno, os filtros serao restaurados automaticamente a partir da URL.

## Alteracoes

### Arquivo: `src/pages/admin/PessoasPage.tsx`

1. Importar `useSearchParams` do `react-router-dom`
2. Substituir os 5 estados de filtro (`filtroSegmento`, `filtroSerie`, `filtroTurma`, `filtroCasa`, `busca`) por valores lidos dos search params
3. Criar funcoes setter que atualizam os search params (com `replace: true` para nao poluir o historico)
4. O `tabAtiva` tambem sera persistido na URL para manter a aba selecionada

Exemplo da logica:

```typescript
const [searchParams, setSearchParams] = useSearchParams();

const tabAtiva = (searchParams.get('tab') as TabType) || 'alunos';
const filtroSegmento = searchParams.get('segmento') || '';
const filtroSerie = searchParams.get('serie') || '';
// ...

const updateParam = (key: string, value: string) => {
  const params = new URLSearchParams(searchParams);
  if (value) params.set(key, value);
  else params.delete(key);
  setSearchParams(params, { replace: true });
};
```

Nenhuma outra pagina precisa ser alterada -- o `navigate(-1)` ou botao voltar do browser ja restaura a URL com os parametros.


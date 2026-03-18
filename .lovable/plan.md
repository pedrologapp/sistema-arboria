

## Correções no Mapa de Desenvolvimento para Infantil

### Alteração 1 — Semanas sempre liberadas para Infantil

Na linha 433, o `disabled={s > semanaAtual}` bloqueia semanas futuras. Para Infantil, remover essa restrição:

```typescript
disabled={isF2 && s > semanaAtual}
```

E na linha 134, ajustar `isSemanaFutura` para que Infantil/F1 nunca considere semana como futura:

```typescript
const isSemanaFutura = isF2 && selectedSemana > semanaAtual;
```

Isso libera todas as 4 semanas para Infantil/F1, mantendo a restrição apenas para F2.

### Alteração 2 — Não obrigar alocar todos os alunos

Na linha 588, o botão salvar tem `disabled={!todosAlocados}`. Para Infantil/F1, permitir salvar com alocação parcial:

```typescript
disabled={saveMutation.isPending || (isF2 ? !todosAlocados : Object.keys(alocacoes).length === 0)}
```

Isso exige apenas que pelo menos 1 aluno esteja posicionado no Infantil/F1, enquanto F2 mantém a obrigatoriedade de todos.

### Arquivos alterados
- `src/pages/professor/MapaDesenvolvimentoPage.tsx` — 3 linhas modificadas


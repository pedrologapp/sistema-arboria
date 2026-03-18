

## Correção: Liberar semanas do Observar para Infantil/F1

### Problema

No `CirculoTurmaDirectPage.tsx` (tela do Observar por turma), linha 170, o seletor de semanas usa `disabled={isFuturo}` que bloqueia semanas futuras para **todos** os segmentos. Para Infantil/F1, todas as semanas devem estar liberadas (mesma lógica já aplicada no Mapa de Desenvolvimento).

### Correção

No arquivo `src/pages/professor/circulo/CirculoTurmaDirectPage.tsx`:

1. Importar `segmento` do `useProfessor()` (linha 22)
2. Calcular se é F2: `const isF2 = segmento === 'fundamental2'`
3. Alterar linha 170 de `disabled={isFuturo}` para `disabled={isF2 && isFuturo}`

Isso libera S1-S4 para a professora Auriete (Grupo V, Infantil) e qualquer outro professor de Infantil/F1.

### Arquivo alterado
- `src/pages/professor/circulo/CirculoTurmaDirectPage.tsx` — 2 linhas modificadas


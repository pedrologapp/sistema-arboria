

## Plano: Corrigir fase não aparecendo no dashboard do professor F2

### Problema raiz

No `ProfessorContext.tsx`, a busca da fase ativa para professores de Fundamental 2 não filtra por série. Como existem 4 fases ativas (séries 6, 7, 8, 9), a chamada `maybeSingle()` falha (múltiplas linhas), resultando em `faseAtual = null`. Por isso o sub-card de fase/semana não aparece.

### Correção

**Arquivo**: `src/contexts/ProfessorContext.tsx`

Para Fundamental 2, também buscar a série do professor via `professor_turma`, igual já é feito para infantil/fundamental1. Remover a condição `if (segmento === 'infantil' || segmento === 'fundamental1')` que restringe a busca de série, permitindo que **todos** os segmentos resolvam a série do professor. Caso o professor tenha múltiplas séries, usar a primeira encontrada (ou adicionar `.limit(1)`).

Alteração concreta: expandir o bloco das linhas 187-201 para incluir `fundamental2`, buscando a série numérica diretamente (ex: "9º" → 9) para F2.

### Arquivos alterados
- `src/contexts/ProfessorContext.tsx` — remover restrição de segmento na busca de série do professor


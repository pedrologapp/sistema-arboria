

## Plano: Corrigir comparação de cargo "líder" vs "lider"

### Problema

Na tabela `cargos_casa`, o cargo de Milena está salvo como `"lider"` (sem acento). Porém, o código em `CasasPage.tsx` compara com `"líder"` (com acento), então nunca encontra match.

### Correção

**Arquivo**: `src/pages/admin/CasasPage.tsx`

Alterar todas as comparações de `c.cargo === 'líder'` para `c.cargo === 'lider'` (sem acento), em 3 locais:

1. Linha ~163: `getCargosForCasaSerie(casa.id, '9').find((c) => c.cargo === 'líder')` → `'lider'`
2. Linha ~204 (accordion): `cargoAluno?.cargo === 'líder'` → `'lider'`

Isso fará o líder aparecer tanto no resumo do card quanto no badge dentro da lista de membros.


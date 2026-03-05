

## Plano: Adicionar filtros de Série e Turma no painel de Casas

### Contexto

A página `CasasPage.tsx` exibe todas as 8 casas com todos os membros de todas as séries/turmas. O usuário quer poder filtrar por série e turma para uma visão mais focada.

### Alteração

**Arquivo**: `src/pages/admin/CasasPage.tsx`

1. **Adicionar dois selects** no topo da página (abaixo do título, acima do grid):
   - **Série**: "Todas" | "6º" | "7º" | "8º" | "9º" (extraído dinamicamente dos membros)
   - **Turma**: "Todas" | letras disponíveis (filtrado conforme série selecionada)

2. **Estado**: dois `useState` para `serieFiltro` e `turmaFiltro`, ambos iniciam como `''` (todas).

3. **Lógica de filtragem**: quando um filtro está ativo:
   - O contador de membros no header do card reflete apenas os membros filtrados
   - As linhas de coordenadores/líder mostram apenas as séries/turmas filtradas
   - O accordion de membros lista apenas os membros filtrados
   - Se uma casa ficar com 0 membros no filtro, ela continua visível mas com indicação "(0 membros)"

4. **Reset de turma**: ao mudar a série, o filtro de turma volta para "Todas".

### Visual

```text
Casas
[Série: Todas ▾]  [Turma: Todas ▾]

┌──────────┐  ┌──────────┐
│ Casa 1   │  │ Casa 2   │
│ ...      │  │ ...      │
└──────────┘  └──────────┘
```

### Arquivos alterados
- `src/pages/admin/CasasPage.tsx` — adicionar estados de filtro, selects e lógica de filtragem


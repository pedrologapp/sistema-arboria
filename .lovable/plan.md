

## Plano: Card de Fase Atual na Home do Aluno

### Situação atual
- `StudentContext` já busca `faseAtual`, mas **sem filtrar por série/segmento** do aluno — usa `.maybeSingle()` e pode falhar quando há múltiplas fases ativas (uma por série).
- Já existe um sub-card de fase **dentro** do card da Casa (linhas 139-158 do HomePage). O pedido é um card **separado** entre o card da Casa e Ações Rápidas.

### Alterações

**1. `src/contexts/StudentContext.tsx`** — Corrigir query de `faseAtual`
- Filtrar por `segmento` do profile (ex: `fundamental2`)
- Filtrar por `serie` do profile (ex: `6`) convertendo texto para número quando possível
- Usar `.order('numero_fase').limit(1).maybeSingle()` para evitar erro com múltiplos resultados

**2. `src/pages/aluno/HomePage.tsx`** — Adicionar card compacto
- Inserir entre linha 160 (`</div>` do card da Casa) e linha 162 (`{/* Quick Actions */}`)
- Layout horizontal flex:
  - **Esquerda**: ícone `Calendar` na cor da casa (`casaColor`)
  - **Centro**: "Fase X — Nome" (bold) + "Semana Y de 4" (cinza)
  - **Direita**: barra `Progress` preenchida na `casaColor`
- Semana calculada via `calcularSemanaAtual(data_inicio, data_fim)` do `utils/timezone.ts`
- Fallback: "Nenhuma fase ativa no momento"
- Clique opcional: navega para `/aluno/missoes`
- Cores: tudo em `casaColor`, não laranja
- Import: `Calendar` do lucide, `Progress` do ui, `calcularSemanaAtual`

### Arquivos alterados
| Arquivo | Ação |
|---------|------|
| `src/contexts/StudentContext.tsx` | Editar — filtrar fase por série/segmento do aluno |
| `src/pages/aluno/HomePage.tsx` | Editar — inserir card de fase entre Casa e Ações Rápidas |




## Plano: Card de Fase Atual entre Casa e Ações Rápidas

### Situação atual
Já existe um sub-card de fase/semana **dentro** do card da Casa (linhas 201-227). O pedido é criar um card **separado e independente** entre o card da Casa (linha 231) e a seção "Ações Rápidas" (linha 233), com layout horizontal (ícone calendário + texto + barra de progresso).

### Alteração

**Arquivo**: `src/pages/professor/ProfessorDashboard.tsx`

Inserir entre a linha 231 (`</div>` do Welcome Section) e a linha 233 (`{/* Quick Actions */}`) um novo card compacto:

- Layout horizontal flex com 3 áreas:
  - **Esquerda**: ícone `Calendar` (laranja/casaColor)
  - **Centro**: "Fase X — Nome da Inteligência" (bold) + "Semana Y de 4" (cinza, menor)
  - **Direita**: mini barra de progresso vertical ou horizontal (semana_atual / 4)
- Usa dados de `faseAtual` do ProfessorContext (já disponível)
- Fallback: se `!faseAtual`, mostrar "Nenhuma fase ativa no momento"
- Calcular progresso: `(semana_atual || 0) / 4 * 100`
- Import adicional: `Calendar` do lucide-react, `Progress` do ui

Nenhuma outra funcionalidade será alterada.

### Arquivos alterados
- `src/pages/professor/ProfessorDashboard.tsx` — inserir card de fase entre Casa e Ações Rápidas


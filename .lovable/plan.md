

## Correção: Reset de alocações + Visualização pós-salvar

### Problema 1: Alocações não resetam ao trocar turma
O estado local `alocacoes` persiste na memória ao trocar de turma. Como o `useEffect` que sincroniza com `savedAlocacoes` só dispara quando o valor muda, e ambas turmas sem dados retornam `{}`, as alocações antigas ficam "grudadas".

**Correção**: Resetar `alocacoes` para `{}` sempre que `selectedTurmaId` ou `selectedSemana` mudar, antes dos dados salvos serem carregados.

### Problema 2: Pós-salvar sem feedback visual
Atualmente, após salvar a semana atual, o professor continua vendo a tela de edição com "Todos os alunos foram posicionados". O ideal é que após salvar, ele veja o grid preenchido em modo leitura com um banner de confirmação, e um botão "Editar" para voltar ao modo edição.

**Correção**: 
- Adicionar estado `savedSuccess` que é `true` após salvar com sucesso
- Quando `savedSuccess && hasSavedData && !isEditing`: esconder a seção "alunos não posicionados" e o botão salvar, e mostrar um banner verde "Semana X salva" com botão "Editar"
- Os quadrantes continuam visíveis com os chips dos alunos (somente leitura — clique não abre drawer)

### Arquivo alterado
- `src/pages/professor/MapaDesenvolvimentoPage.tsx`
  - Adicionar `useEffect` para resetar `alocacoes` ao trocar turma/semana
  - Adicionar lógica de visualização pós-salvar com banner de sucesso e botão editar


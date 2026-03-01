

# Correção: Conteúdo no Dashboard Simplificado mostra séries erradas

## Problema

No `ProfessorDashboardSimplificado` (Infantil/F1), o botão "Conteúdo" abre o `ConteudoModal`, que está hardcoded para Fundamental 2 — busca séries 6-9 e usa `casaMentor` (que é `null` para Infantil). Professoras como Auriete veem conteúdo irrelevante.

## Solução

Para professores do Infantil/F1, o botão "Conteúdo" deve **navegar para `/professor/conteudo`** (a página completa de conteúdo com Conteúdo Geral Arboria + lista de inteligências) em vez de abrir o modal do Fundamental 2.

### Mudança em `ProfessorDashboardSimplificado.tsx`:

1. Alterar a ação "Conteúdo" de `isModal: true` para `isModal: false` com `path: '/professor/conteudo'`
2. Remover o `ConteudoModal` e sua importação (não é mais usado neste componente)

Isso é uma mudança simples de 2 linhas na definição do `quickActions` + remoção do modal não utilizado.


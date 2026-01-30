

# Plano: Reordenar Seções do Perfil do Aluno

## Objetivo

Mover a seção "Observações do Professor" para aparecer logo após "Status" e antes de "Inteligências".

---

## Ordem Atual

1. Header (voltar + chat)
2. Perfil (avatar, nome, pontos, ranking)
3. **Status**
4. **Inteligências**
5. **Observações do Professor**
6. Missões da Fase

---

## Nova Ordem

1. Header (voltar + chat)
2. Perfil (avatar, nome, pontos, ranking)
3. **Status**
4. **Observações do Professor** ← movido para cima
5. **Inteligências**
6. Missões da Fase

---

## Alteração Necessária

### Arquivo: `src/pages/professor/PerfilAlunoPage.tsx`

Mover o bloco de código das linhas **314-377** (seção "Observações do Professor") para logo após a linha **293** (fechamento do card de Status).

A mudança é simples: apenas reordenar os blocos JSX, sem alterar nenhuma lógica ou estilo.

---

## Visualização

```text
┌─────────────────────────────────────────────┐
│ ← Voltar                        💬 Chat     │
├─────────────────────────────────────────────┤
│           [Avatar do Aluno]                 │
│           Nome do Aluno                     │
│           6º ano B • Casa Linguística       │
│       [150 pts]      [#3 de 25]             │
├─────────────────────────────────────────────┤
│ 📊 STATUS                                   │
│ ┌─────────────────────────────────────────┐ │
│ │ ⭐ DESTAQUE                             │ │
│ │ 85% entregas • Média 8.2                │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ 👁 OBSERVAÇÕES DO PROFESSOR    ← AQUI      │
│ ┌─────────────────────────────────────────┐ │
│ │ [FeedbackEstadoCard]                    │ │
│ │ [HistoricoObservacoes]                  │ │
│ │ [Botão Registrar observação]            │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ 🧠 INTELIGÊNCIAS                           │
│ ┌─────────────────────────────────────────┐ │
│ │ 📖 Linguística       ████████░░  80%    │ │
│ │ 🔢 Lógico-Matemática ██████░░░░  60%    │ │
│ │ ...                                     │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ 📋 MISSÕES DA FASE                          │
│ ...                                         │
└─────────────────────────────────────────────┘
```


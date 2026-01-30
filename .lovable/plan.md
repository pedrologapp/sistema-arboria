
# Plano: Exibir Apenas Dados do N8N no Alerta

## ✅ STATUS: IMPLEMENTADO

## Problema Identificado

O componente `FeedbackEstadoCard` exibia informações genéricas do banco local como fallback, mesmo quando os dados ricos do N8N estavam disponíveis. O usuário queria ver APENAS o que o N8N envia.

---

## Alterações Realizadas

### Arquivo 1: `src/hooks/usePerfilAluno.ts`

**Mudanças**:
1. ✅ Adicionada flag `geradoPorN8N` na interface `AlertaAtivo`
2. ✅ Removidos fallbacks de busca no banco quando `geradoPorN8N = true`
3. ✅ Arquétipo para N8N agora tem `potencializar: []` (não mostra genérico)
4. ✅ `sugestao_conversa` é passado corretamente para alertas N8N

### Arquivo 2: `src/components/professor/FeedbackEstadoCard.tsx`

**Mudanças**:
1. ✅ Adicionada prop `geradoPorN8N?: boolean`
2. ✅ Layout N8N diferenciado:
   - Header: texto resumido (~150 chars) + padrão destacado
   - Botão "Ver mais" expande
   - Hipóteses colapsáveis individualmente (com perguntas)
   - Ações com emojis de prioridade (🔴🟡🟢)
   - Arquétipo com `sugestao_conversa` para alertas
   - "O que não fazer" com destaque vermelho
   - Mensagem do professor com destaque azul
3. ✅ Removidas seções genéricas quando é N8N:
   - "Como Potencializar" não aparece
   - "Evitar/Preferir" não aparece
   - Fallbacks de texto não aparecem

### Arquivo 3: `src/pages/professor/PerfilAlunoPage.tsx`

**Mudanças**:
1. ✅ Passada prop `geradoPorN8N` para o `FeedbackEstadoCard`

---

## Layout Visual Implementado

### Header (fechado)
```text
┌──────────────────────────────────────────────────────┐
│ ⚠️ ALERTA ATIVO                                       │
│                                                       │
│ "Adryan demonstra capacidade cognitiva clara..."      │
│ (texto resumido ~150 chars)                           │
│                                                       │
│ 🎯 Padrão: [padrao_identificado.nome]                 │
│    [significado]                                      │
│                                                       │
│                 [Ver mais ↓]                          │
└──────────────────────────────────────────────────────┘
```

### Expandido (N8N)
```text
┌──────────────────────────────────────────────────────┐
│ 💡 HIPÓTESES                                          │
│                                                       │
│ ▸ Conflito Relacional Recente                    [+] │
│   (expande para descrição + pergunta sugerida)        │
│ ▸ Mudança no Contexto Familiar                   [+] │
│ ▸ Ansiedade de Performance                       [+] │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ 🎯 AÇÕES SUGERIDAS                                    │
│                                                       │
│ 🔴 Conversa Privada de Investigação                   │
│ 🔴 Estratégia da Escrita Protegida                    │
│ 🟡 Ponte Linguística                                  │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ 🏆 ARQUÉTIPO: O Mestre das Palavras                   │
│                                                       │
│ 💬 "Use a força linguística de Adryan COMO            │
│     FERRAMENTA DE DIAGNÓSTICO..."                     │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ ❌ O QUE NÃO FAZER                                    │
│                                                       │
│ ✗ Expor o comportamento publicamente                  │
│ ✗ Pressionar por resposta imediata                    │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ 💬 MENSAGEM PARA VOCÊ                                 │
│                                                       │
│ "Professor(a), você fez a coisa CERTA..."             │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│           [⚙️ Registrar minha ação]                   │
└──────────────────────────────────────────────────────┘
```

---

## O Que NÃO Foi Alterado

- ✅ Lógica de celebrações (funciona corretamente para não-N8N)
- ✅ Busca de dados do banco quando NÃO é N8N (fallback ainda funciona)
- ✅ Estilos base do card (cores, bordas, etc.)

---

## Como Testar

1. Enviar um JSON via N8N contendo:
   - `texto_acontecendo`
   - `hipoteses` (com `perguntas`)
   - `acoes_sugeridas` (com `prioridade`)
   - `arquetipo` (com `sugestao_conversa`)
   - `o_que_nao_fazer`
   - `mensagem_professor`
   - `padrao_identificado`

2. Acessar o perfil do aluno e verificar:
   - Texto resumido no header
   - Padrão destacado
   - Hipóteses colapsáveis
   - Prioridades visuais nas ações
   - Arquétipo com sugestão de conversa
   - Seção "O que não fazer"
   - Mensagem para o professor
   - NÃO aparecer "Como Potencializar" genérico

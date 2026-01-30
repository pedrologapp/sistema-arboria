
# Plano: Exibir Apenas Dados do N8N no Alerta

## Problema Identificado

O componente `FeedbackEstadoCard` exibe informações genéricas do banco local como fallback, mesmo quando os dados ricos do N8N estão disponíveis. O usuário quer ver APENAS o que o N8N envia.

## Diagnóstico Detalhado

### Comportamento Atual (Problemático)

| Campo N8N | Mapeado no Hook | Exibido no Card |
|-----------|-----------------|-----------------|
| `texto_acontecendo` | motivo | Apenas no header |
| `padrao_identificado` | padrao | Mostrado, mas sem destaque |
| `hipoteses` (com perguntas) | hipoteses | Exibido, mas com fallback do banco |
| `acoes_sugeridas` (com prioridade) | acoesSugeridas | Exibido |
| `arquetipo.sugestao_conversa` | arquetipo | Exibido APENAS para celebrações |
| `mensagem_professor` | mensagemProfessor | Exibido |
| `o_que_nao_fazer` | oQueNaoFazer | Exibido |

### Problemas Específicos

1. **Hook (`usePerfilAluno.ts`)**:
   - Linhas 454-485: Quando é N8N, prioriza dados do N8N, MAS ainda tem fallback para buscar hipóteses do banco local
   - Precisa garantir que quando `geradoPorN8N = true`, NÃO busque dados genéricos

2. **Componente (`FeedbackEstadoCard.tsx`)**:
   - Linhas 318-353: "Como Potencializar" genérico aparece para confirmações mesmo sem dados
   - Linhas 355-365: Arquétipo simples para NÃO celebrações não mostra `sugestao_conversa`
   - Linhas 367-391: Fallback genérico para celebrações sem arquétipo

---

## Alterações Necessárias

### Arquivo 1: `src/hooks/usePerfilAluno.ts`

**Objetivo**: Quando `geradoPorN8N = true`, NÃO buscar dados genéricos do banco.

**Mudanças**:
1. Adicionar flag `geradoPorN8N` ao objeto `alertaAtivo`
2. Remover fallbacks de busca no banco quando é N8N
3. Passar arquétipo com `sugestao_conversa` completo

### Arquivo 2: `src/components/professor/FeedbackEstadoCard.tsx`

**Objetivo**: Redesenhar o layout para alertas N8N com seções colapsáveis.

**Mudanças**:
1. Adicionar prop `geradoPorN8N?: boolean`
2. Para alertas N8N, usar layout diferente:
   - Header: texto_acontecendo resumido + padrão
   - Botão "Ver mais" expande
   - Dentro: Hipóteses colapsáveis (com perguntas)
   - Ações com badges de prioridade
   - Arquétipo com sugestao_conversa (não só para celebrações)
   - O que não fazer
   - Mensagem do professor
3. Remover seções de fallback genérico quando é N8N

### Arquivo 3: `src/pages/professor/PerfilAlunoPage.tsx`

**Objetivo**: Passar prop `geradoPorN8N` para o card.

---

## Layout Visual Proposto

```text
┌──────────────────────────────────────────────────────┐
│ ⚠️ ALERTA ATIVO                                       │
│                                                       │
│ "Adryan demonstra capacidade cognitiva clara..."      │
│ (texto_acontecendo - resumido ~100 chars)             │
│                                                       │
│ 🔍 Padrão: [padrao_identificado.nome]                 │
│                                                       │
│                 [Ver mais ↓]                          │
└──────────────────────────────────────────────────────┘
```

Ao expandir:

```text
┌──────────────────────────────────────────────────────┐
│ 💡 HIPÓTESES                                          │
│                                                       │
│ ▸ Conflito Relacional Recente                    [+] │
│ ▸ Mudança no Contexto Familiar                   [+] │
│ ▸ Ansiedade de Performance                       [+] │
│ ▸ Sobrecarga Cognitiva Tardia                    [+] │
│                                                       │
│ (Cada hipótese expande para mostrar descrição         │
│  e pergunta sugerida)                                 │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ ✅ AÇÕES SUGERIDAS                                    │
│                                                       │
│ 🔴 Conversa Privada de Investigação                   │
│ 🔴 Estratégia da Escrita Protegida                    │
│ 🔴 Mapeamento de Gatilhos                             │
│ 🟡 Ponte Linguística                                  │
│ 🔴 Contato com Família (via coordenação)              │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ 🏆 ARQUÉTIPO: O Mestre das Palavras                   │
│                                                       │
│ 💬 "Use a força linguística de Adryan COMO            │
│     FERRAMENTA DE DIAGNÓSTICO. Peça que ele           │
│     ESCREVA (não fale) sobre o que está sentindo..."  │
│                                                       │
│ (sugestao_conversa - como usar a força do aluno)      │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ ❌ O QUE NÃO FAZER                                    │
│                                                       │
│ ✗ Expor o comportamento publicamente                  │
│ ✗ Pressionar por resposta imediata                    │
│ ✗ Elogiar apenas resultado/competência                │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ 💬 MENSAGEM PARA VOCÊ                                 │
│                                                       │
│ "Professor(a), você fez a coisa CERTA ao registrar    │
│  isso. Adryan não está 'piorando' - está sinalizando. │
│  Sua missão agora não é 'consertar' - é INVESTIGAR    │
│  e ACOLHER..."                                        │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│             [⚙️ Registrar minha ação]                  │
└──────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Hook: Nova estrutura do `alertaAtivo`

```typescript
alertaAtivo = {
  // ... campos existentes ...
  geradoPorN8N: true, // NOVO: flag para indicar origem
  arquetipo: {
    nome: 'O Mestre das Palavras',
    significado: 'Domínio excepcional da linguagem',
    potencializar: [], // Vazio para N8N - não mostrar
    sugestao_conversa: 'Use a força linguística...' // USAR ESTE
  }
};
```

### Componente: Lógica de exibição

```typescript
// Para alertas N8N, não mostrar "Como Potencializar" genérico
if (!geradoPorN8N && arquetipo?.potencializar?.length > 0) {
  // Mostrar potencializar
}

// Para alertas N8N com sugestao_conversa, mostrar seção dedicada
if (geradoPorN8N && arquetipo?.sugestao_conversa) {
  // Mostrar "Como usar a força do aluno"
}
```

### Hipóteses Colapsáveis

Cada hipótese terá um estado individual de expansão:

```typescript
const [hipotesesExpandidas, setHipotesesExpandidas] = useState<Record<number, boolean>>({});
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/usePerfilAluno.ts` | Adicionar flag `geradoPorN8N`, remover fallbacks |
| `src/components/professor/FeedbackEstadoCard.tsx` | Layout N8N, hipóteses colapsáveis, sugestao_conversa |
| `src/pages/professor/PerfilAlunoPage.tsx` | Passar `geradoPorN8N` ao componente |

---

## Resumo das Mudanças

1. **Hook**: Identificar quando é N8N e não buscar dados genéricos
2. **Componente**: 
   - Hipóteses colapsáveis individualmente
   - Seção de arquétipo com `sugestao_conversa` para alertas
   - Remover "Como Potencializar" genérico quando N8N
   - Prioridades visuais nas ações (🔴🟡🟢)
3. **Página**: Passar flag de origem

---

## O Que NÃO Será Alterado

- Lógica de celebrações (funciona corretamente)
- Busca de dados do banco quando NÃO é N8N (fallback ainda funciona)
- Estilos base do card (cores, bordas, etc.)

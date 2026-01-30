

# Plano: Exibir Todos os Campos Ricos do N8N

## Resumo do Problema

Os dados enviados pelo N8N estão sendo salvos corretamente no banco, mas não estão sendo exibidos completamente na tela. Há também duplicação de alertas.

---

## Diagnóstico Detalhado

### Dados Salvos vs Exibidos

| Campo N8N | Salvo no Banco | Exibido na Tela |
|-----------|----------------|-----------------|
| `texto_acontecendo` | ✅ | ⚠️ Parcial (só início) |
| `hipoteses` (com perguntas) | ✅ | ❌ Busca do banco local |
| `acoes_sugeridas` (com prioridade) | ✅ | ❌ Busca do banco local |
| `arquetipo` completo | ✅ | ⚠️ Parcial |
| `mensagem_professor` | ✅ | ❌ Não exibido |
| `o_que_nao_fazer` | ✅ | ❌ Não exibido |
| `padrao_identificado` | ✅ | ❌ Não exibido |

### Duplicação de Alertas

Existem 2 alertas ativos para Adryan:
1. **N8N** (motivo: `analise_n8n`) - criado às 01:10
2. **Sistema** (motivo: `ultimas_2_atencao`) - criado às 17:51

A Edge Function só arquiva alertas com `motivo = 'analise_n8n'`, mas o sistema local cria alertas separados.

---

## Alterações Necessárias

### Arquivo 1: `supabase/functions/receber-sugestao-n8n/index.ts`

Arquivar TODOS os alertas ativos do aluno, não só os de N8N:

```typescript
// ANTES
.eq("motivo", "analise_n8n");

// DEPOIS
// Sem filtro de motivo - arquiva qualquer alerta ativo
```

### Arquivo 2: `src/hooks/usePerfilAluno.ts`

Priorizar dados do N8N no `dados_contexto`:

```typescript
// Se veio do N8N (motivo: analise_n8n), usar dados diretos
if (alertaData.motivo === 'analise_n8n') {
  // Hipóteses do dados_contexto
  hipoteses = (dadosContexto?.hipoteses || []).map(h => ({
    titulo: h.titulo,
    descricao: h.descricao,
    perguntas: h.perguntas || []
  }));
  
  // Ações sugeridas do dados_contexto
  acoesSugeridas = (dadosContexto?.acoes_sugeridas || []).map(a => ({
    titulo: a.acao,
    icone: 'MessageCircle',
    codigo: a.acao,
    prioridade: a.prioridade
  }));
  
  // Novos campos
  mensagemProfessor = dadosContexto?.mensagem_professor;
  oQueNaoFazer = dadosContexto?.o_que_nao_fazer;
  padraoIdentificado = dadosContexto?.padrao_identificado;
}
```

Adicionar novas propriedades na interface `AlertaAtivo`:
- `mensagemProfessor?: string`
- `oQueNaoFazer?: string[]`
- `padraoIdentificado?: { nome: string; significado: string }`

### Arquivo 3: `src/components/professor/FeedbackEstadoCard.tsx`

Adicionar novas seções visuais:

1. **Arquétipo destacado** (para alertas de atenção também)
2. **Seção "O que não fazer"** com ícone de alerta
3. **Mensagem para o professor** como rodapé encorajador
4. **Padrão identificado** após as hipóteses

---

## Layout Visual Proposto

```text
┌─────────────────────────────────────────────────┐
│ ⚠️ ALERTA ATIVO                                 │
├─────────────────────────────────────────────────┤
│ O QUE ESTÁ ACONTECENDO:                         │
│ "Adryan demonstra capacidade cognitiva clara    │
│ (3x pegou rápido), mas apresentou isolamento    │
│ seguido de travamento..."                       │
│                                                 │
│ 🔍 PADRÃO IDENTIFICADO: [Nome do Padrão]        │
│                                                 │
│ 🏆 ARQUÉTIPO: O Mestre das Palavras             │
│ "Domínio excepcional da linguagem..."           │
│ 💡 Sugestão: "Use a força linguística..."       │
│                                                 │
│ ────────── [Clique para expandir] ──────────    │
│                                                 │
│ 💡 HIPÓTESES:                                   │
│ ┌─────────────────────────────────────────────┐ │
│ │ Conflito Relacional Recente                 │ │
│ │ O isolamento seguido de travamento pode...  │ │
│ │ 💬 "Alguém disse algo que te incomodou?"    │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ✅ AÇÕES SUGERIDAS:                             │
│ [!] Conversa Privada de Investigação (alta)     │
│ [!] Estratégia da Escrita Protegida (alta)      │
│ [•] Ponte Linguística (média)                   │
│                                                 │
│ ❌ O QUE NÃO FAZER:                             │
│ • Expor o comportamento publicamente            │
│ • Pressionar por resposta imediata              │
│                                                 │
│ ─────────────────────────────────────────────── │
│ 💬 MENSAGEM PARA VOCÊ:                          │
│ "Professor(a), você fez a coisa CERTA ao        │
│ registrar isso. Adryan não está 'piorando'..."  │
│                                                 │
│         [⚙️ Registrar minha ação]               │
└─────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/receber-sugestao-n8n/index.ts` | Arquivar TODOS os alertas ativos |
| `src/hooks/usePerfilAluno.ts` | Priorizar dados do N8N, adicionar novos campos |
| `src/components/professor/FeedbackEstadoCard.tsx` | Adicionar seções: padrão, o que não fazer, mensagem professor |
| `src/pages/professor/PerfilAlunoPage.tsx` | Passar novos props para FeedbackEstadoCard |

---

## Resumo das Mudanças

1. **Edge Function**: Corrigir arquivamento para eliminar duplicatas
2. **Hook**: Mapear todos os campos ricos do N8N
3. **Componente**: Exibir novas seções visuais
4. **Página**: Conectar os novos dados ao componente


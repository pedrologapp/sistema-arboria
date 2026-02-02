

# Plano: Melhorar Modal de "Explicação Necessária" com Contexto da Justificativa

## Diagnóstico

### Estrutura Atual vs Dados Reais

O modal espera estes campos no `AlertaExplicacao`:
```typescript
interface AlertaExplicacao {
  sugestao_anterior_resumo: string;  // ❌ VAZIO no banco
  observacao_nova: string;           // ❌ VAZIO no banco
  perguntas_professor: string[];     // ❌ VAZIO no banco (array vazio)
}
```

O N8N envia estes campos em `dados_contexto`:
```json
{
  "mensagem_professor": "Professor(a), você registrou uma observação que contradiz...",
  "texto_acontecendo": "**O QUE HAVIA ANTES:**\nAdryan estava em momento de ATENÇÃO...\n\n**O QUE VOCÊ REGISTROU AGORA:**\nVocê acabou de registrar \"Conectou\"...",
  "perguntas_professor": [],
  "sugestao_anterior_resumo": null,
  "observacao_nova": null
}
```

**Problema:** Os campos mapeados não correspondem aos campos enviados pelo N8N.

---

## Solução

### 1. Atualizar Interface `AlertaExplicacao`

Adicionar os campos corretos que o N8N envia:

```typescript
export interface AlertaExplicacao {
  id: string;
  aluno: { ... };
  // Campos existentes (manter para retrocompatibilidade)
  tipo_contradicao: string;
  perguntas_professor: string[];
  sugestao_anterior_resumo: string;
  observacao_nova: string;
  created_at: string;
  
  // NOVOS CAMPOS (do N8N):
  mensagem_professor: string;    // Mensagem completa com perguntas
  texto_acontecendo: string;     // Contexto do antes/depois
}
```

### 2. Atualizar Mapeamento no Hook `useAlertasAlunos.ts`

Extrair os novos campos de `dados_contexto`:

```typescript
// Linhas 332-342 - Adicionar mapeamento dos novos campos
const aguardandoExplicacao: AlertaExplicacao[] = alertasFaseAtual
  .filter(a => a.tipo_alerta === 'aguardando_explicacao')
  .map(alerta => ({
    id: alerta.id,
    aluno: alerta.aluno,
    tipo_contradicao: (alerta.dados_contexto?.tipo_contradicao as string) || '',
    perguntas_professor: (alerta.dados_contexto?.perguntas_professor as string[]) || [],
    sugestao_anterior_resumo: (alerta.dados_contexto?.sugestao_anterior_resumo as string) || '',
    observacao_nova: (alerta.dados_contexto?.observacao_nova as string) || '',
    created_at: alerta.created_at,
    // NOVOS CAMPOS:
    mensagem_professor: (alerta.dados_contexto?.mensagem_professor as string) || '',
    texto_acontecendo: (alerta.dados_contexto?.texto_acontecendo as string) || ''
  }));
```

### 3. Atualizar Modal `ExplicacaoContradicaoModal.tsx`

Substituir a lógica atual por uma exibição que prioriza os campos do N8N:

#### Lógica de Renderização

```typescript
// Determinar se há contexto do N8N ou usar fallback
const temContextoN8N = alerta.mensagem_professor || alerta.texto_acontecendo;

// Fallback para quando não há mensagem
const mensagemFallback = `Professor(a), foi detectada uma contradição entre a sugestão ativa e sua nova observação para ${alerta.aluno.nome}. Por favor, explique o que motivou essa mudança para que possamos ajustar nossas análises.`;
```

#### Nova Estrutura Visual

```text
┌─────────────────────────────────────────────────────┐
│  [Avatar]  💬 Explicação necessária            [X]  │
│            Nome do Aluno                            │
│            [Contradição detectada]                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ 📋 O QUE ACONTECEU                           │  │
│  │                                               │  │
│  │ **O QUE HAVIA ANTES:**                        │  │
│  │ Adryan estava em momento de ATENÇÃO...        │  │
│  │                                               │  │
│  │ **O QUE VOCÊ REGISTROU AGORA:**               │  │
│  │ Você registrou "Conectou", que é positivo...  │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ 💬 MENSAGEM PARA VOCÊ                        │  │
│  │                                               │  │
│  │ Professor(a), antes de atualizarmos nossa     │  │
│  │ análise, PRECISO QUE VOCÊ EXPLIQUE:           │  │
│  │                                               │  │
│  │ 1. O que motivou você a registrar "Conectou"? │  │
│  │ 2. O que aconteceu com Adryan?                │  │
│  │ 3. Detalhe o que aconteceu...                 │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  💬 SUA EXPLICAÇÃO *                                │
│  ┌───────────────────────────────────────────────┐  │
│  │ Descreva o que aconteceu...                   │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│     [Cancelar]       [✈ Enviar explicação]          │
└─────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useAlertasAlunos.ts` | Adicionar `mensagem_professor` e `texto_acontecendo` à interface e mapeamento |
| `src/components/professor/ExplicacaoContradicaoModal.tsx` | Renderizar os novos campos com estilo apropriado e suporte a markdown básico |

---

## Detalhes de Implementação

### Renderização de Markdown Básico

O `texto_acontecendo` contém `**texto**` para negrito. Criar função simples:

```typescript
const renderizarTextoFormatado = (texto: string) => {
  // Converter **texto** para <strong>texto</strong>
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{parte.slice(2, -2)}</strong>;
    }
    return <span key={i}>{parte}</span>;
  });
};
```

### Estilização dos Blocos

**Bloco "O que aconteceu":**
- Background: `bg-amber-900/20`
- Borda: `border-amber-600/30`
- Ícone: 📋 (ClipboardList)

**Bloco "Mensagem para você":**
- Background: `bg-purple-900/30`
- Borda: `border-purple-600/40`
- Ícone: 💬 (MessageCircle)

### Fallback

Se `mensagem_professor` e `texto_acontecendo` estiverem vazios, exibir mensagem genérica com o nome do aluno.

---

## Resultado Esperado

O professor ao abrir o modal verá:

1. **Cabeçalho** com avatar, título e nome do aluno
2. **Badge** "Contradição detectada"
3. **Bloco "O que aconteceu"** com o contexto do antes/depois
4. **Bloco "Mensagem para você"** com as perguntas do N8N
5. **Campo de texto** para a explicação
6. **Botões** Cancelar / Enviar explicação

Isso dará ao professor todo o contexto necessário para entender a contradição e escrever uma explicação adequada.


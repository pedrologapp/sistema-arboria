

# Plano: Modal Genérico de Explicação com Opções de Ação Dinâmicas

## Visão Geral

O modal de "Explicação necessária" será expandido para incluir **3 opções de ação** que o professor deve escolher além de escrever a explicação. As descrições das opções se adaptam dinamicamente baseadas na **direção da contradição** (positiva vs negativa).

---

## Estrutura de Dados

### Campos no `dados_contexto` do N8N

O N8N atualmente envia:
```json
{
  "texto_acontecendo": "**O QUE HAVIA ANTES:**\n...",
  "mensagem_professor": "Professor(a), você registrou...",
  "prioridade": "urgente",
  "requer_resposta": true,
  // Campos que precisam ser adicionados ao payload N8N:
  "observacao_contraditoria": { "sinal": "Conectou", "valencia": "positiva" },
  "sugestao_anterior": { "estado": "Atenção", "icone": "🔴" }
}
```

### Lógica de Fallback para Valencia

Como o N8N pode não enviar `observacao_contraditoria`, o modal tentará inferir a valencia a partir do `texto_acontecendo`:
- Se contiver "sinal POSITIVO" → valencia = "positiva"
- Se contiver "sinal de atenção" / "NEGATIVO" → valencia = "negativa"
- Caso contrário → fallback genérico

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useAlertasAlunos.ts` | Adicionar campos `observacao_contraditoria` e `sugestao_anterior` à interface e mapeamento |
| `src/components/professor/ExplicacaoContradicaoModal.tsx` | Adicionar seção de escolha de ação, validações, e atualizar payload do webhook |

---

## Implementação Detalhada

### 1. Interface `AlertaExplicacao` (useAlertasAlunos.ts)

```typescript
export interface AlertaExplicacao {
  id: string;
  aluno: { id: string; nome: string; avatarUrl?: string; serie: string; turma: string; };
  tipo_contradicao: string;
  perguntas_professor: string[];
  sugestao_anterior_resumo: string;
  observacao_nova: string;
  created_at: string;
  // Campos do N8N
  mensagem_professor: string;
  texto_acontecendo: string;
  // NOVOS CAMPOS:
  observacao_contraditoria: { sinal: string; valencia: string } | null;
  sugestao_anterior: { estado: string; icone: string } | null;
}
```

### 2. Mapeamento no Hook

```typescript
observacao_contraditoria: (alerta.dados_contexto?.observacao_contraditoria as { sinal: string; valencia: string }) || null,
sugestao_anterior: (alerta.dados_contexto?.sugestao_anterior as { estado: string; icone: string }) || null
```

### 3. Lógica do Modal (ExplicacaoContradicaoModal.tsx)

#### 3.1 Estado para ação selecionada

```typescript
const [acaoSelecionada, setAcaoSelecionada] = useState<string | null>(null);
```

#### 3.2 Inferir valencia do texto (fallback)

```typescript
const inferirValencia = (): string | null => {
  // Tentar pegar do campo estruturado
  if (alerta.observacao_contraditoria?.valencia) {
    return alerta.observacao_contraditoria.valencia;
  }
  // Fallback: inferir do texto_acontecendo
  const texto = alerta.texto_acontecendo.toLowerCase();
  if (texto.includes('positivo') || texto.includes('evoluiu')) return 'positiva';
  if (texto.includes('negativo') || texto.includes('atenção')) return 'negativa';
  return null;
};
```

#### 3.3 Descrições dinâmicas das ações

```typescript
const getOpcoesAcao = () => {
  const valencia = inferirValencia();
  
  if (valencia === 'positiva') {
    // Estava em atenção → registrou positivo
    return [
      {
        id: 'confirmar',
        icone: '✅',
        titulo: 'Confirmar nova observação',
        descricao: 'O aluno realmente evoluiu. Atualizar a análise para refletir essa melhora.'
      },
      {
        id: 'manter',
        icone: '🔄',
        titulo: 'Manter análise anterior',
        descricao: 'Foi um momento pontual. O padrão anterior de atenção continua válido.'
      },
      {
        id: 'descartar',
        icone: '🗑️',
        titulo: 'Descartar observação',
        descricao: 'Registrei por engano. Ignorar esta observação.'
      }
    ];
  } else if (valencia === 'negativa') {
    // Estava em celebração → registrou negativo
    return [
      {
        id: 'confirmar',
        icone: '✅',
        titulo: 'Confirmar nova observação',
        descricao: 'O aluno realmente apresentou dificuldade. Atualizar a análise para atenção.'
      },
      {
        id: 'manter',
        icone: '🔄',
        titulo: 'Manter análise anterior',
        descricao: 'Foi um momento pontual. O aluno continua evoluindo bem no geral.'
      },
      {
        id: 'descartar',
        icone: '🗑️',
        titulo: 'Descartar observação',
        descricao: 'Registrei por engano. Ignorar esta observação.'
      }
    ];
  } else {
    // Fallback genérico
    return [
      {
        id: 'confirmar',
        icone: '✅',
        titulo: 'Confirmar nova observação',
        descricao: 'O que registrei agora reflete a realidade. Atualizar a análise do aluno.'
      },
      {
        id: 'manter',
        icone: '🔄',
        titulo: 'Manter análise anterior',
        descricao: 'Foi um momento isolado. A análise anterior continua válida.'
      },
      {
        id: 'descartar',
        icone: '🗑️',
        titulo: 'Descartar observação',
        descricao: 'Registrei por engano. Ignorar esta observação.'
      }
    ];
  }
};
```

#### 3.4 Validações

- Mínimo de 20 caracteres na explicação
- Ação obrigatória (uma das 3 deve estar selecionada)

```typescript
const podeEnviar = explicacao.trim().length >= 20 && acaoSelecionada !== null;
```

#### 3.5 JSX da Seção de Ações

```tsx
{/* Escolha de ação - NOVA SEÇÃO */}
<div className="space-y-2">
  <label className="flex items-center gap-2 text-white/60 text-xs font-medium uppercase tracking-wider">
    🎯 O que devemos fazer? <span className="text-red-400">*</span>
  </label>
  <div className="flex flex-col gap-2">
    {opcoesAcao.map((opcao) => (
      <div
        key={opcao.id}
        onClick={() => !isSending && setAcaoSelecionada(opcao.id)}
        className={`
          p-3 rounded-lg cursor-pointer transition-all
          ${acaoSelecionada === opcao.id
            ? 'bg-purple-900/40 border-2 border-purple-500 ring-1 ring-purple-500/30'
            : 'bg-white/5 border border-white/10 hover:border-white/30'
          }
          ${isSending ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{opcao.icone}</span>
          <span className="font-medium text-white">{opcao.titulo}</span>
        </div>
        <p className="text-sm text-white/50 mt-1 ml-7">{opcao.descricao}</p>
      </div>
    ))}
  </div>
</div>
```

#### 3.6 Atualização do Payload do Webhook

```typescript
const webhookPayload = {
  evento: 'explicacao_professor_enviada',
  tipo: 'resposta_explicacao',
  
  aluno: { ... },
  contexto: { ... },
  professor: { ... },
  
  explicacao: {
    tipo_registro: 'explicacao_professor',
    tipo_contradicao: alerta.tipo_contradicao,
    resposta_professor: explicacao.trim(),
    acao_escolhida: acaoSelecionada, // "confirmar" | "manter" | "descartar"
    valencia: inferirValencia(),
    alerta_id: alerta.id
  },
  
  // Contexto para o N8N processar
  sugestao_anterior: alerta.sugestao_anterior || null,
  observacao_contraditoria: alerta.observacao_contraditoria || null,
  
  timestamp: new Date().toISOString()
};
```

---

## Layout Visual Final

```
┌─────────────────────────────────────────────────┐
│  [AS]  💬 Explicação necessária             [X] │
│        Adryan Samuel da Silva Dantas            │
│        [Contradição detectada]                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  📋 O QUE ACONTECEU                             │
│  ┌───────────────────────────────────────────┐  │
│  │ **O QUE HAVIA ANTES:** ...               │  │
│  │ **O QUE VOCÊ REGISTROU AGORA:** ...      │  │
│  │ **POR QUE ISSO É IMPORTANTE:** ...       │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  💬 MENSAGEM PARA VOCÊ                          │
│  ┌───────────────────────────────────────────┐  │
│  │ Professor(a), você registrou...          │  │
│  │ 1. O que motivou você a registrar...     │  │
│  │ 2. O que aconteceu com o aluno...        │  │
│  │ 3. Detalhe o que aconteceu...            │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  💬 SUA EXPLICAÇÃO *                            │
│  ┌───────────────────────────────────────────┐  │
│  │ Descreva o que aconteceu...              │  │
│  └───────────────────────────────────────────┘  │
│  Mínimo 20 caracteres (15/20)                   │
│                                                 │
│  🎯 O QUE DEVEMOS FAZER? *                      │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ ✅ Confirmar nova observação (selected)   │  │
│  │    O aluno realmente evoluiu...          │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │ 🔄 Manter análise anterior               │  │
│  │    Foi um momento pontual...             │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │ 🗑️ Descartar observação                   │  │
│  │    Registrei por engano...               │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│     [Cancelar]        [✈ Enviar explicação]     │
└─────────────────────────────────────────────────┘
```

---

## Payload Enviado ao N8N

```json
{
  "evento": "explicacao_professor_enviada",
  "tipo": "resposta_explicacao",
  
  "aluno": {
    "id": "uuid-do-aluno",
    "nome": "Adryan Samuel da Silva Dantas",
    "matricula": "2287.2026",
    "serie": "6º Ano",
    "turma": "B"
  },
  
  "professor": {
    "id": "uuid-do-professor",
    "nome": "Professora Julia"
  },
  
  "explicacao": {
    "tipo_registro": "explicacao_professor",
    "resposta_professor": "O aluno começou a interagir mais depois...",
    "acao_escolhida": "confirmar",
    "valencia": "positiva",
    "alerta_id": "uuid-do-alerta"
  },
  
  "sugestao_anterior": null,
  "observacao_contraditoria": null,
  
  "contexto": {
    "fase_id": "uuid-fase",
    "institution_id": "uuid-institution"
  },
  
  "timestamp": "2026-02-03T14:30:00.000Z"
}
```

---

## Fluxo de Validação

1. **Explicação**: Mínimo 20 caracteres (contador visível)
2. **Ação**: Uma das 3 opções deve estar selecionada
3. **Botão "Enviar"**: Desabilitado até ambas condições serem satisfeitas

---

## Resumo das Alterações

| Componente | Alteração |
|------------|-----------|
| **Interface** | +2 campos: `observacao_contraditoria`, `sugestao_anterior` |
| **Hook** | Mapear novos campos do `dados_contexto` |
| **Modal** | +Estado `acaoSelecionada`, +Função `inferirValencia`, +Função `getOpcoesAcao`, +Seção de ações no JSX, +Validação mínimo 20 chars, +Ação no payload |
| **Webhook** | Campo `acao_escolhida` adicionado ao payload |


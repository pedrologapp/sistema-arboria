

# Plano: Adicionar Card "Precisa de explicação"

## Resumo

Criar um novo tipo de alerta **"aguardando_explicacao"** que aparece quando o N8N detecta contradição entre a sugestão ativa e a nova observação registrada pelo professor (ex: aluno estava em "Celebre" mas professor registrou sinal negativo).

---

## Arquitetura do Fluxo

```text
┌─────────────────────────────────────────────────────────────────────┐
│                           FLUXO DA EXPLICAÇÃO                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  N8N detecta contradição                                             │
│       ↓                                                              │
│  POST /receber-sugestao-n8n                                          │
│    estado: "aguardando_explicacao"                                   │
│    tipo_contradicao: "celebracao_para_atencao"                       │
│    perguntas_professor: ["O que mudou?", "Houve algo..."]            │
│    sugestao_anterior_resumo: "Aluno estava brilhando..."             │
│    observacao_nova: "Registrou 'desistiu facilmente'"                │
│       ↓                                                              │
│  Alerta salvo na tabela alertas_alunos                               │
│       ↓                                                              │
│  Professor vê card "Precisa de explicação" (roxo/azul)               │
│       ↓                                                              │
│  Clica → Modal com lista de alunos aguardando                        │
│       ↓                                                              │
│  Seleciona aluno → Modal de explicação                               │
│       ↓                                                              │
│  Lê contexto + responde perguntas + envia                            │
│       ↓                                                              │
│  POST para N8N (tipo_registro: "explicacao_professor")               │
│       ↓                                                              │
│  Alerta arquivado → Card desaparece                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Alterações no Banco de Dados

### 1.1 Adicionar valor ao enum `tipo_alerta`

```sql
ALTER TYPE tipo_alerta ADD VALUE IF NOT EXISTS 'aguardando_explicacao';
```

### 1.2 Estrutura esperada do `dados_contexto` para este tipo

```json
{
  "estado": "aguardando_explicacao",
  "tipo_contradicao": "celebracao_para_atencao",
  "perguntas_professor": [
    "O que aconteceu desde a última observação positiva?",
    "Houve algum fator externo que possa ter influenciado?",
    "Como você percebeu essa mudança?"
  ],
  "sugestao_anterior_resumo": "O aluno estava demonstrando excelente engajamento...",
  "observacao_nova": "Registrou 'desistiu facilmente' na inteligência Linguística",
  "requer_resposta": true,
  "gerado_por": "n8n",
  "timestamp_analise": "..."
}
```

---

## 2. Alterações no Backend (Edge Functions)

### 2.1 Arquivo: `supabase/functions/receber-sugestao-n8n/index.ts`

**Mudanças:**

1. Atualizar interface `SugestaoPayload` para incluir novos campos:

```typescript
interface SugestaoPayload {
  // ... campos existentes ...
  estado: "precisa_atencao" | "celebrar" | "neutro" | "aguardando_explicacao";
  
  // Novos campos para contradição
  tipo_contradicao?: "celebracao_para_atencao" | "atencao_para_recuperacao" | "outro";
  perguntas_professor?: string[];
  sugestao_anterior_resumo?: string;
  observacao_nova?: string;
  requer_resposta?: boolean;
}
```

2. Atualizar validação de `estadosValidos` (linha 94):

```typescript
const estadosValidos = ["precisa_atencao", "celebrar", "neutro", "aguardando_explicacao"];
```

3. Atualizar `dadosContexto` para incluir novos campos (linha 189-205):

```typescript
const dadosContexto = {
  // ... campos existentes ...
  tipo_contradicao: payload.tipo_contradicao || null,
  perguntas_professor: payload.perguntas_professor || [],
  sugestao_anterior_resumo: payload.sugestao_anterior_resumo || null,
  observacao_nova: payload.observacao_nova || null,
  requer_resposta: payload.requer_resposta || false,
};
```

---

## 3. Alterações no Frontend

### 3.1 Atualizar Types (Hooks)

**Arquivo: `src/hooks/useAlertasAlunos.ts`**

1. Atualizar interface `AlertaAluno` (linha 14):

```typescript
tipo_alerta: 'precisa_atencao' | 'celebrar' | 'nao_esquecer' | 'fase_anterior' | 'aguardando_explicacao';
```

2. Adicionar interface para alerta de explicação:

```typescript
export interface AlertaExplicacao {
  id: string;
  aluno: {
    id: string;
    nome: string;
    avatarUrl?: string;
    serie: string;
    turma: string;
  };
  tipo_contradicao: string;
  perguntas_professor: string[];
  sugestao_anterior_resumo: string;
  observacao_nova: string;
  created_at: string;
}
```

3. Atualizar interface `AlertasAgrupados` para incluir:

```typescript
aguardandoExplicacao: AlertaExplicacao[];
// E nos totais e badges:
totais: { 
  // ... existentes ...
  aguardandoExplicacao: number;
};
badgesAtivos: {
  // ... existentes ...
  aguardandoExplicacao: number;
};
```

4. Adicionar lógica de filtro na queryFn para extrair alertas de `aguardando_explicacao`:

```typescript
// Após linha 312
const aguardandoExplicacao = alertasFaseAtual
  .filter(a => a.tipo_alerta === 'aguardando_explicacao')
  .map(alerta => ({
    id: alerta.id,
    aluno: alerta.aluno,
    tipo_contradicao: alerta.dados_contexto?.tipo_contradicao as string || '',
    perguntas_professor: alerta.dados_contexto?.perguntas_professor as string[] || [],
    sugestao_anterior_resumo: alerta.dados_contexto?.sugestao_anterior_resumo as string || '',
    observacao_nova: alerta.dados_contexto?.observacao_nova as string || '',
    created_at: alerta.created_at
  }));
```

---

### 3.2 Atualizar Hook Turmas

**Arquivo: `src/hooks/useAlertasAlunosTurmas.ts`**

Mesmas alterações do `useAlertasAlunos.ts` para manter paridade.

---

### 3.3 Adicionar Card na Configuração

**Arquivo: `src/components/professor/AlertBoxes.tsx`**

1. Atualizar tipo `AlertType` (linha 11):

```typescript
type AlertType = 'precisa_atencao' | 'celebrar' | 'nao_esquecer' | 'atencao_fase_anterior' | 'aguardando_explicacao';
```

2. Adicionar novo config em `alertConfigs` (após linha 44):

```typescript
{
  id: 'aguardando_explicacao',
  icon: '💬',
  label: 'Aguardando você',
  colorActive: '#6B21A8'  // Roxo/Purple
}
```

3. Atualizar funções `getAlertasByType`, `getCountByType`, `getBadgeCountByType` para incluir o novo tipo.

---

### 3.4 Atualizar AlertBoxesTurmas

**Arquivo: `src/components/professor/AlertBoxesTurmas.tsx`**

Mesmas alterações do `AlertBoxes.tsx`.

---

### 3.5 Atualizar Modal de Detalhes

**Arquivo: `src/components/professor/AlertaDetalheModal.tsx`**

1. Atualizar `configByTipo` (após linha 36):

```typescript
aguardando_explicacao: {
  icon: '💬',
  title: 'Aguardando você',
  subtitle: 'Contradições que precisam de explicação'
}
```

2. Atualizar props para receber `alertasExplicacao`:

```typescript
interface AlertaDetalheModalProps {
  // ... existentes ...
  alertasExplicacao?: AlertaExplicacao[];
}
```

3. Adicionar renderização customizada para tipo `aguardando_explicacao` mostrando:
   - Nome do aluno
   - Badge com tipo de contradição
   - Subtítulo com resumo da situação

---

### 3.6 Criar Modal de Explicação

**Novo arquivo: `src/components/professor/ExplicacaoContradicaoModal.tsx`**

Modal que aparece quando o professor seleciona um aluno na lista de "Aguardando você":

**Props:**
```typescript
interface ExplicacaoContradicaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerta: AlertaExplicacao;
  nomeAluno: string;
  alunoId: string;
  alertaId: string;
  alunoData?: { /* dados para payload N8N */ };
}
```

**Estrutura do Modal:**

```text
┌────────────────────────────────────────────┐
│  💬 Explicação necessária           [X]    │
├────────────────────────────────────────────┤
│                                            │
│  📋 O QUE ESTAVA ACONTECENDO:              │
│  ┌────────────────────────────────────┐    │
│  │ "O aluno estava demonstrando..."   │    │
│  └────────────────────────────────────┘    │
│                                            │
│  📝 O QUE VOCÊ REGISTROU:                  │
│  ┌────────────────────────────────────┐    │
│  │ "Desistiu facilmente..."           │    │
│  └────────────────────────────────────┘    │
│                                            │
│  ❓ PERGUNTAS PARA REFLEXÃO:               │
│  • O que aconteceu desde a última obs?     │
│  • Houve algum fator externo?              │
│                                            │
│  💬 SUA EXPLICAÇÃO: *                      │
│  ┌────────────────────────────────────┐    │
│  │                                    │    │
│  │                                    │    │
│  └────────────────────────────────────┘    │
│                                            │
│  ┌───────────┐  ┌─────────────────────┐    │
│  │ Cancelar  │  │  Enviar explicação  │    │
│  └───────────┘  └─────────────────────┘    │
│                                            │
└────────────────────────────────────────────┘
```

**Comportamento ao Enviar:**

1. Salva resposta no banco (nova tabela ou campo em `acoes_professor`)
2. Envia webhook para N8N:

```typescript
const payload = {
  evento: 'explicacao_professor_enviada',
  aluno: { id, nome, matricula, serie, turma, casa_id },
  contexto: { fase_id, turma_id, segmento, institution_id },
  professor: { id, nome },
  explicacao: {
    tipo_registro: 'explicacao_professor',
    tipo_contradicao: alerta.tipo_contradicao,
    perguntas_apresentadas: alerta.perguntas_professor,
    resposta_professor: textoExplicacao,
    alerta_id: alertaId
  },
  timestamp: new Date().toISOString()
};
```

3. Atualiza alerta para `status: 'resolvido'`
4. Invalida queries relacionadas
5. Fecha modal e mostra toast de sucesso

---

## 4. Visual do Card

| Propriedade | Valor |
|-------------|-------|
| Ícone | 💬 (ou ❓) |
| Cor ativa | `#6B21A8` (Purple-800) |
| Label | "Aguardando você" |
| Descrição modal | "Contradições que precisam de explicação" |

**Posicionamento:** Último card no grid 2x2 (substituindo ou ao lado de "Fase anterior")

---

## 5. Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/professor/ExplicacaoContradicaoModal.tsx` | Modal para professor explicar contradição |

---

## 6. Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `supabase/functions/receber-sugestao-n8n/index.ts` | Suporte ao estado `aguardando_explicacao` |
| `src/hooks/useAlertasAlunos.ts` | Nova interface e lógica de filtro |
| `src/hooks/useAlertasAlunosTurmas.ts` | Paridade com hook principal |
| `src/components/professor/AlertBoxes.tsx` | Novo card na configuração |
| `src/components/professor/AlertBoxesTurmas.tsx` | Paridade |
| `src/components/professor/AlertaDetalheModal.tsx` | Config e renderização do novo tipo |

---

## 7. Migração SQL

```sql
-- Adicionar novo valor ao enum tipo_alerta
ALTER TYPE tipo_alerta ADD VALUE IF NOT EXISTS 'aguardando_explicacao';
```

---

## 8. Detalhes Técnicos

### Cores do Design System

- **Roxo ativo:** `#6B21A8` (purple-800) - chamativo mas não alarmante
- **Badge:** roxo/violet para distinguir dos outros alertas

### Webhook de Resposta

O endpoint para envio permanece: `https://webhook.escolaamadeus.com/webhook/projetoarboria`

O `tipo_registro: "explicacao_professor"` permite ao N8N distinguir este evento de observações normais e ações.

### Reatividade

Após envio da explicação:
- `invalidateQueries(['alertas-alunos'])`
- `invalidateQueries(['alertas-alunos-turmas'])`
- `invalidateQueries(['perfil-aluno'])`

